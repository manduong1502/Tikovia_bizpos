import axios from 'axios';
import toast from 'react-hot-toast';

export const getSubdomain = () => {
  return localStorage.getItem('tenant_subdomain') || 'demo';
};

export const api = axios.create({
  baseURL: (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
    ? 'http://localhost:4001/api'
    : 'https://api.tikovia.vn/api',
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request Interceptor: auto-attach token & tenant subdomain ───
api.interceptors.request.use((config) => {
  const isSystemRoute = config.url?.includes('/system-login') || config.url?.includes('/system-me') || config.url?.includes('/tenants');
  const isLoginRoute = config.url?.includes('/auth/login') || config.url?.includes('/system-login') || config.url?.includes('/auth/tenant');
  const superAdminToken = localStorage.getItem('super_admin_token');

  if (isSystemRoute && superAdminToken) {
    config.headers.Authorization = `Bearer ${superAdminToken}`;
  } else if (!isLoginRoute) {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }

  const subdomain = getSubdomain();
  if (subdomain) {
    config.headers['X-Tenant-Subdomain'] = subdomain;
  }

  return config;
});

// ─── High Performance RAM & Storage Cache with SWR & Request Deduplication ───
const RAM_CACHE = new Map();
const IN_FLIGHT_REQUESTS = new Map();

export const clientMemoryCache = {
  get(key) {
    if (RAM_CACHE.has(key)) {
      const item = RAM_CACHE.get(key);
      if (item && Date.now() < item.expiry) {
        return item;
      }
    }
    if (typeof window === 'undefined') return null;
    try {
      const stored = sessionStorage.getItem('TIKO_CACHE_' + key) || localStorage.getItem('TIKO_CACHE_' + key);
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      if (Date.now() > parsed.expiry) {
        sessionStorage.removeItem('TIKO_CACHE_' + key);
        localStorage.removeItem('TIKO_CACHE_' + key);
        return null;
      }
      RAM_CACHE.set(key, parsed);
      return parsed;
    } catch {
      return null;
    }
  },
  set(key, val) {
    const entry = {
      ...val,
      timestamp: val.timestamp || Date.now()
    };
    RAM_CACHE.set(key, entry);
    if (typeof window === 'undefined') return;
    try {
      const payload = JSON.stringify(entry);
      sessionStorage.setItem('TIKO_CACHE_' + key, payload);
    } catch {}
  },
  delete(key) {
    RAM_CACHE.delete(key);
    IN_FLIGHT_REQUESTS.delete(key);
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.removeItem('TIKO_CACHE_' + key);
      localStorage.removeItem('TIKO_CACHE_' + key);
    } catch {}
  },
  deletePattern(pattern) {
    if (!pattern) return;
    for (const k of RAM_CACHE.keys()) {
      if (k.includes(pattern)) RAM_CACHE.delete(k);
    }
    for (const k of IN_FLIGHT_REQUESTS.keys()) {
      if (k.includes(pattern)) IN_FLIGHT_REQUESTS.delete(k);
    }
    if (typeof window === 'undefined') return;
    try {
      const keysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.includes(pattern)) keysToRemove.push(k);
      }
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.includes(pattern)) keysToRemove.push(k);
      }
      keysToRemove.forEach(k => {
        sessionStorage.removeItem(k);
        localStorage.removeItem(k);
      });
    } catch {}
  },
  clearPattern(pattern) {
    this.deletePattern(pattern);
  },
  clear(pattern = '') {
    if (pattern) {
      this.deletePattern(pattern);
      return;
    }
    RAM_CACHE.clear();
    IN_FLIGHT_REQUESTS.clear();
    if (typeof window === 'undefined') return;
    try {
      const keysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith('TIKO_CACHE_')) {
          keysToRemove.push(k);
        }
      }
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('TIKO_CACHE_')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => {
        sessionStorage.removeItem(k);
        localStorage.removeItem(k);
      });
    } catch {}
  }
};
const CACHE_TTL_MS = 300 * 1000; // 5 minutes fresh client cache

// ─── Instant SWR Fetcher (Stale-While-Revalidate) ───
export const fetchWithSWR = (key, fetcher, ttl = CACHE_TTL_MS) => {
  const cached = clientMemoryCache.get(key);
  const now = Date.now();

  // 1. If cache exists and is fresh (< 20s), return immediately
  if (cached && cached.data !== undefined) {
    const age = now - (cached.timestamp || 0);
    if (age < 20000) {
      return Promise.resolve(cached.data);
    }
    // 2. If stale but valid, trigger background revalidation without blocking UI
    if (!IN_FLIGHT_REQUESTS.has(key)) {
      const bgPromise = fetcher()
        .then(data => {
          clientMemoryCache.set(key, { data, expiry: now + ttl, timestamp: Date.now() });
          IN_FLIGHT_REQUESTS.delete(key);
          return data;
        })
        .catch(err => {
          IN_FLIGHT_REQUESTS.delete(key);
          return cached.data;
        });
      IN_FLIGHT_REQUESTS.set(key, bgPromise);
    }
    return Promise.resolve(cached.data);
  }

  // 3. If in-flight request already exists, reuse the same promise
  if (IN_FLIGHT_REQUESTS.has(key)) {
    return IN_FLIGHT_REQUESTS.get(key);
  }

  // 4. Fetch fresh and cache
  const reqPromise = fetcher()
    .then(data => {
      clientMemoryCache.set(key, { data, expiry: Date.now() + ttl, timestamp: Date.now() });
      IN_FLIGHT_REQUESTS.delete(key);
      return data;
    })
    .catch(err => {
      IN_FLIGHT_REQUESTS.delete(key);
      if (cached && cached.data !== undefined) return cached.data;
      throw err;
    });

  IN_FLIGHT_REQUESTS.set(key, reqPromise);
  return reqPromise;
};

export const loadInitialCache = (pattern, fallback = []) => {
  // 1. Check ultra-fast RAM cache first (<0.01ms)
  for (const [k, v] of RAM_CACHE.entries()) {
    if (k.includes(pattern) && v && v.data !== undefined) {
      const inner = v.data;
      if (Array.isArray(fallback)) {
        if (Array.isArray(inner)) return inner;
        if (inner && Array.isArray(inner.data)) return inner.data;
        return fallback;
      }
      return inner;
    }
  }

  // 2. Check Session & Local Storage
  if (typeof window === 'undefined') return fallback;
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith('TIKO_CACHE_') && k.includes(pattern)) {
        const parsed = JSON.parse(sessionStorage.getItem(k) || '{}');
        if (parsed.expiry && Date.now() < parsed.expiry && parsed.data !== undefined) {
          const inner = parsed.data;
          RAM_CACHE.set(k.replace('TIKO_CACHE_', ''), parsed);
          if (Array.isArray(fallback)) {
            if (Array.isArray(inner)) return inner;
            if (inner && Array.isArray(inner.data)) return inner.data;
            return fallback;
          }
          return inner;
        }
      }
    }
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('TIKO_CACHE_') && k.includes(pattern)) {
        const parsed = JSON.parse(localStorage.getItem(k) || '{}');
        if (parsed.expiry && Date.now() < parsed.expiry && parsed.data !== undefined) {
          const inner = parsed.data;
          RAM_CACHE.set(k.replace('TIKO_CACHE_', ''), parsed);
          if (Array.isArray(fallback)) {
            if (Array.isArray(inner)) return inner;
            if (inner && Array.isArray(inner.data)) return inner.data;
            return fallback;
          }
          return inner;
        }
      }
    }
  } catch {}
  return fallback;
};

export const hasInitialCache = (pattern) => {
  for (const [k, v] of RAM_CACHE.entries()) {
    if (k.includes(pattern) && v && v.data !== undefined) return true;
  }
  if (typeof window === 'undefined') return false;
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith('TIKO_CACHE_') && k.includes(pattern)) {
        const parsed = JSON.parse(sessionStorage.getItem(k) || '{}');
        if (parsed.expiry && Date.now() < parsed.expiry && parsed.data !== undefined) {
          return true;
        }
      }
    }
  } catch {}
  return false;
};

export const notifyDataChanged = (type = 'general') => {
  if (typeof window !== 'undefined') {
    clientMemoryCache.clear(type === 'general' ? '' : type);
    window.dispatchEvent(new CustomEvent('app:data-changed', { detail: { type } }));
  }
};

// ─── Response Interceptor: handle errors globally & emit realtime data change events ───
api.interceptors.response.use(
  (res) => {
    const method = res.config?.method?.toLowerCase();
    if (['post', 'put', 'delete', 'patch'].includes(method)) {
      const url = res.config?.url || '';
      let type = 'general';
      if (url.includes('/orders')) type = 'order';
      else if (url.includes('/purchase-orders')) type = 'purchase_order';
      else if (url.includes('/returns')) type = 'return';
      else if (url.includes('/purchase-returns')) type = 'purchase_return';
      else if (url.includes('/cashbook')) type = 'cashbook';
      else if (url.includes('/customers')) type = 'customer';
      else if (url.includes('/suppliers')) type = 'supplier';
      else if (url.includes('/products')) type = 'product';

      notifyDataChanged(type);
    }
    return res;
  },
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;

    if (status === 401) {
      if (window.location.pathname.startsWith('/system-admin')) {
        localStorage.removeItem('super_admin_token');
        localStorage.removeItem('super_admin_user');
        window.location.href = '/system-admin/login';
      } else {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    if (!error.config?.hideErrorToast) {
      if (error.code === 'ECONNABORTED' || (message && (message.includes('timeout') || message.includes('exceeded')))) {
        toast.error('Kết nối máy chủ quá thời gian chờ (Timeout). Vui lòng thử lại!');
      } else if (status === 403) {
        toast.error('Bạn không có quyền thực hiện thao tác này');
      } else if (status === 404) {
        toast.error('Không tìm thấy dữ liệu');
      } else if (status >= 500) {
        toast.error('Lỗi máy chủ. Vui lòng thử lại sau');
      } else if (message) {
        toast.error(message);
      }
    }

    return Promise.reject(error);
  }
);

// ─── Local State Utils ───
const loadLocalState = (key, def) => { try { const val = localStorage.getItem('TIKO_' + key); return val ? JSON.parse(val) : def; } catch { return def; } };
const saveLocalState = (key, val) => { try { localStorage.setItem('TIKO_' + key, JSON.stringify(val)); } catch {} };

// ─── Products ───
const FALLBACK_PRODUCTS = [];

export const getDeletedProductIds = () => {
  if (typeof window === 'undefined') return [];
  try {
    const val = localStorage.getItem('TIKO_DELETED_PRODUCT_IDS');
    return val ? JSON.parse(val) : [];
  } catch {
    return [];
  }
};

export const markProductAsDeleted = (id) => {
  if (typeof window === 'undefined') return;
  try {
    const ids = getDeletedProductIds();
    const strId = String(id);
    if (!ids.includes(strId)) {
      ids.push(strId);
      localStorage.setItem('TIKO_DELETED_PRODUCT_IDS', JSON.stringify(ids));
    }
  } catch {}
};

const filterActiveProducts = (list) => {
  const deletedIds = new Set(getDeletedProductIds());
  return (list || []).filter(p => {
    if (!p) return false;
    if (deletedIds.has(String(p.id)) || deletedIds.has(Number(p.id))) return false;
    const status = (p.status || '').toLowerCase();
    if (status === 'inactive' || status === 'deleted') return false;
    if (p.is_active === false || p.isActive === false) return false;
    return true;
  });
};

export const productAPI = {
  getAll: () => {
    const cacheKey = 'products:all:' + getSubdomain();
    const cached = clientMemoryCache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) return Promise.resolve(filterActiveProducts(cached.data));

    return api.get('/products/all', { hideErrorToast: true }).then(r => {
      const raw = r.data;
      let list = FALLBACK_PRODUCTS;
      if (raw && Array.isArray(raw.data)) list = raw.data;
      else if (Array.isArray(raw)) list = raw;
      const cleanList = filterActiveProducts(list);
      clientMemoryCache.set(cacheKey, { data: cleanList, expiry: Date.now() + CACHE_TTL_MS });
      return cleanList;
    }).catch((err) => {
      console.warn("getAll /products/all failed, falling back to /products paginated endpoint", err);
      return api.get('/products', { params: { limit: 500 }, hideErrorToast: true }).then(r => {
        const raw = r.data;
        let list = FALLBACK_PRODUCTS;
        if (raw && Array.isArray(raw.data)) list = raw.data;
        else if (Array.isArray(raw)) list = raw;
        const cleanList = filterActiveProducts(list);
        clientMemoryCache.set(cacheKey, { data: cleanList, expiry: Date.now() + CACHE_TTL_MS });
        return cleanList;
      }).catch((e) => {
        const serverMsg = e.response?.data?.message || e.message;
        console.error("Both product endpoints failed. Server response:", e.response?.data, e);
        toast.error(`Máy chủ đang lỗi (${serverMsg}). Tự động dùng dữ liệu dự phòng.`);
        return FALLBACK_PRODUCTS;
      });
    });
  },
  list: (params) => api.get('/products', { params }).then(r => {
    const raw = r.data;
    if (raw && Array.isArray(raw.data)) {
      return { ...raw, data: filterActiveProducts(raw.data) };
    }
    return raw;
  }).catch(() => ({ data: FALLBACK_PRODUCTS, total: FALLBACK_PRODUCTS.length, page: 1, limit: 20, totalPages: 1 })),
  getById: (id) => api.get(`/products/${id}`).then(r => r.data).catch(() => FALLBACK_PRODUCTS.find(p => p.id === Number(id))),
  create: (data) => {
    const cacheKey = 'products:all:' + getSubdomain();
    clientMemoryCache.delete(cacheKey);
    if (typeof window !== 'undefined') {
      window.__tikovia_products_cache = null;
      try { sessionStorage.removeItem('tikovia_products_cache'); } catch (e) {}
    }
    return api.post('/products', data).then(r => r.data?.data || r.data);
  },
  importExcel: (data) => {
    const cacheKey = 'products:all:' + getSubdomain();
    clientMemoryCache.delete(cacheKey);
    if (typeof window !== 'undefined') {
      window.__tikovia_products_cache = null;
      try { sessionStorage.removeItem('tikovia_products_cache'); } catch (e) {}
    }
    return api.post('/products/import', data).then(r => r.data?.data || r.data);
  },
  update: (id, data) => {
    const cacheKey = 'products:all:' + getSubdomain();
    clientMemoryCache.delete(cacheKey);
    if (typeof window !== 'undefined') {
      window.__tikovia_products_cache = null;
      try { sessionStorage.removeItem('tikovia_products_cache'); } catch (e) {}
    }
    return api.put(`/products/${id}`, data).then(r => r.data?.data || r.data);
  },
  delete: async (id) => {
    markProductAsDeleted(id);
    const cacheKey = 'products:all:' + getSubdomain();
    clientMemoryCache.delete(cacheKey);
    if (typeof window !== 'undefined') {
      if (window.__tikovia_products_cache) {
        window.__tikovia_products_cache = window.__tikovia_products_cache.filter(p => String(p.id) !== String(id) && Number(p.id) !== Number(id));
      }
      try { sessionStorage.removeItem('tikovia_products_cache'); } catch (e) {}
    }
    try {
      const res = await api.delete(`/products/${id}`);
      return res.data;
    } catch (err) {
      console.warn("Hard delete failed, attempting soft delete status='INACTIVE'", err);
      try {
        const updateRes = await api.put(`/products/${id}`, { status: 'INACTIVE', is_active: false, isActive: false });
        return updateRes.data?.data || updateRes.data;
      } catch (subErr) {
        return { success: true };
      }
    }
  },
};

// ─── Categories ───
const FALLBACK_CATEGORIES = [];

export const categoryAPI = {
  getAll: () => {
    const cacheKey = 'categories:all:' + getSubdomain();
    const cached = clientMemoryCache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) return Promise.resolve(cached.data);

    return api.get('/categories').then(r => {
      clientMemoryCache.set(cacheKey, { data: r.data, expiry: Date.now() + CACHE_TTL_MS });
      return r.data;
    }).catch(() => FALLBACK_CATEGORIES);
  },
  create: (data) => api.post('/categories', data).then(r => r.data),
  update: (id, data) => api.put(`/categories/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/categories/${id}`).then(r => r.data),
};
export const brandAPI = {
  getAll: () => {
    const cacheKey = 'brands:all:' + getSubdomain();
    const cached = clientMemoryCache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) return Promise.resolve(cached.data);

    return api.get('/brands').then(r => {
      clientMemoryCache.set(cacheKey, { data: r.data, expiry: Date.now() + CACHE_TTL_MS });
      return r.data;
    });
  },
  create: (data) => api.post('/brands', data).then(r => r.data),
};

const isNetworkError = (error) => {
  return !error || !error.response || error.code === 'ERR_NETWORK' || error.message === 'Network Error';
};

// ─── Orders ───
// Normalize Prisma camelCase → snake_case keys that OrdersPage & Reports use
function normalizeOrder(o) {
  if (!o) return o;
  const rawItems = o.items || o.order_items || o._items || [];
  const normalizedItems = rawItems.map(it => ({
    ...it,
    id: it.id || it.productId || it.product_id || it.product?.id,
    productId: it.productId || it.product_id || it.product?.id,
    product_id: it.productId || it.product_id || it.product?.id,
    sku: it.sku || it.product_sku || it.product?.sku || (it.productId ? `SP${it.productId}` : ''),
    product_sku: it.sku || it.product_sku || it.product?.sku || (it.productId ? `SP${it.productId}` : ''),
    name: it.name || it.product_name || it.product?.name || 'Sản phẩm',
    product_name: it.name || it.product_name || it.product?.name || 'Sản phẩm',
    quantity: Number(it.quantity || 0),
    price: Number(it.price ?? it.unit_price ?? 0),
    unit_price: Number(it.unit_price ?? it.price ?? 0),
    category: it.category || it.category_name || it.product?.category?.name || '',
    categoryId: it.categoryId || it.category_id || it.product?.categoryId || it.product?.category?.id,
    brand: it.brand || it.brand_name || it.product?.brand?.name || '',
    cost_price: Number(it.cost_price ?? it.costPrice ?? it.product?.cost_price ?? 0),
    discount: Number(it.discount || 0),
    total: Number(it.total ?? ((it.price || it.unit_price || 0) * (it.quantity || 0) - (it.discount || 0))),
  }));

  return {
    ...o,
    order_code: o.order_code || o.code,
    created_at: o.created_at || o.createdAt,
    customer_name: o.customer_name || o.customer?.name || 'Khách lẻ',
    customer_code: (o.customer_name && o.customer_name !== 'Khách lẻ' && o.customer_name !== 'khách lẻ') 
      ? (o.customer_code || o.customer?.code || (o.customer?.id ? 'KH' + String(o.customer.id).padStart(6, '0') : null)) 
      : null,
    user_name: o.user_name || o.user?.fullName || null,
    total: Number(o.total || 0),
    subtotal: Number(o.subtotal || o.total || 0),
    discount_amount: Number(o.discount_amount ?? o.discount ?? 0),
    paid_amount: Number(o.paid_amount ?? o.paid ?? 0),
    payment_method: o.payment_method || (o.paymentMethod || '').toLowerCase(),
    payment_status: o.payment_status || (o.status === 'COMPLETED' ? 'completed' : o.status?.toLowerCase()),
    status: o.status?.toLowerCase?.() || o.status,
    return_code: (o.returns && o.returns.length > 0) ? o.returns.map(r => r.code).join(', ') : '---',
    delivery_status: o.deliveryStatus || o.delivery_status || null,
    driver_name: o.driverName || o.driver_name || null,
    driver_id: o.driverId || o.driver_id || null,
    delivery_address: o.deliveryAddress || o.delivery_address || null,
    receiver_name: o.receiverName || o.receiver_name || null,
    receiver_phone: o.receiverPhone || o.receiver_phone || null,
    items: normalizedItems,
    _items: normalizedItems,
  };
}

function normalizeOrderDetail(o) {
  if (!o) return o;
  return normalizeOrder(o);
}

// ─── Orders ───
const FALLBACK_ORDERS = [];

let LOCAL_ADDED_ORDERS = loadLocalState('ADDED_ORDERS', []);
let LOCAL_UPDATED_ORDERS = loadLocalState('UPD_ORDERS', {});
let LOCAL_DELETED_ORDERS = new Set(loadLocalState('DEL_ORDERS', []));

const persistOrders = () => {
  saveLocalState('ADDED_ORDERS', LOCAL_ADDED_ORDERS);
  saveLocalState('UPD_ORDERS', LOCAL_UPDATED_ORDERS);
  saveLocalState('DEL_ORDERS', [...LOCAL_DELETED_ORDERS]);
};

export const orderAPI = {
  getAll: (params) => {
    const cacheKey = 'orders:' + JSON.stringify(params || {}) + ':' + getSubdomain();
    const cached = clientMemoryCache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) return Promise.resolve(cached.data);

    return api.get('/orders', { params, hideErrorToast: true }).then(r => {
      let list = Array.isArray(r?.data?.data) ? r.data.data : (Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : []));
      list = list.map(normalizeOrder);
      
      // Clear local storage updates for these orders since we successfully synced with backend
      let changed = false;
      list.forEach(o => {
        if (LOCAL_UPDATED_ORDERS[o.id]) {
          delete LOCAL_UPDATED_ORDERS[o.id];
          changed = true;
        }
      });
      if (changed) {
        persistOrders();
      }

      list = list.filter(o => o && !LOCAL_DELETED_ORDERS.has(o.id) && !LOCAL_DELETED_ORDERS.has(o.code));
      list = list.map(o => LOCAL_UPDATED_ORDERS[o.id] ? normalizeOrder({ ...o, ...LOCAL_UPDATED_ORDERS[o.id] }) : o);
      const existingCodes = new Set(list.map(o => o.code));
      const toAdd = LOCAL_ADDED_ORDERS.map(normalizeOrder).filter(o => o && !existingCodes.has(o.code));
      const resultObj = { 
        data: [...toAdd, ...list], 
        total: r?.data?.total || (list.length + toAdd.length), 
        page: r?.data?.page || 1, 
        limit: r?.data?.limit || 100, 
        totalPages: r?.data?.totalPages || 1,
        summaryStats: r?.data?.summaryStats 
      };
      clientMemoryCache.set(cacheKey, { data: resultObj, expiry: Date.now() + CACHE_TTL_MS });
      return resultObj;
    }).catch(() => {
      let list = FALLBACK_ORDERS.map(normalizeOrder).filter(o => o && !LOCAL_DELETED_ORDERS.has(o.id) && !LOCAL_DELETED_ORDERS.has(o.code));
      list = list.map(o => LOCAL_UPDATED_ORDERS[o.id] ? normalizeOrder({ ...o, ...LOCAL_UPDATED_ORDERS[o.id] }) : o);
      const existingCodes = new Set(list.map(o => o.code));
      const toAdd = LOCAL_ADDED_ORDERS.map(normalizeOrder).filter(o => o && !existingCodes.has(o.code));
      return { data: [...toAdd, ...list], total: list.length + toAdd.length, page: 1, limit: 100, totalPages: 1 };
    });
  },
  getById: (id) => api.get(`/orders/${id}`, { hideErrorToast: true })
    .then(r => normalizeOrderDetail(r.data))
    .catch(() => {
      const found = LOCAL_ADDED_ORDERS.find(o => o.id === Number(id) || o.id === id || o.code === id || o.order_code === id)
        || FALLBACK_ORDERS.find(o => o.id === Number(id) || o.id === id || o.code === id || o.order_code === id);
      return normalizeOrderDetail(found);
    }),
  create: (data) => api.post('/orders', data, { hideErrorToast: true }).then(r => r.data).catch(err => {
    if (!isNetworkError(err)) {
      throw err;
    }
    console.warn("create order API failed (offline)", err);
    const newId = Date.now();
    const custId = data.customer_id || data.customerId;
    const customer = FALLBACK_CUSTOMERS.find(c => c.id === custId) || { name: 'Khách lẻ', code: '' };
    const newOrder = {
      id: newId,
      code: `HD${String(Math.floor(Math.random()*1000)).padStart(4, '0')}`,
      order_code: `HD${String(Math.floor(Math.random()*1000)).padStart(4, '0')}`,
      customer_id: custId,
      customer_name: customer.name,
      customer_code: customer.code,
      ...data,
      created_at: new Date().toISOString(),
      status: 'completed',
    };
    LOCAL_ADDED_ORDERS = [newOrder, ...LOCAL_ADDED_ORDERS];
    persistOrders();

    // Auto update customer debt
    if (custId) {
      const total = Number(data.total || 0);
      const paid = Number(data.paid_amount || data.paid || 0);
      const debtIncrease = total - paid;
      
      const c = FALLBACK_CUSTOMERS.find(x => x.id === custId);
      const currentDebt = c ? Number(c.debt !== undefined ? c.debt : c.totalDebt || 0) : 0;
      const currentSpent = c ? Number(c.total_spent !== undefined ? c.total_spent : c.totalSpent || 0) : 0;

      LOCAL_UPDATED_CUSTOMERS[custId] = {
        ...(LOCAL_UPDATED_CUSTOMERS[custId] || {}),
        debt: currentDebt + debtIncrease,
        total_spent: currentSpent + total
      };
      persistCustomers();
    }

    return newOrder;
  }),
  importExcel: (data) => api.post('/orders/import', data).then(r => r.data),
  update: (id, data) => api.put(`/orders/${id}`, data).then(r => {
    if (LOCAL_UPDATED_ORDERS[id]) {
      delete LOCAL_UPDATED_ORDERS[id];
      persistOrders();
    }
    return r.data;
  }).catch(err => {
    if (!isNetworkError(err)) {
      throw err;
    }
    const existing = LOCAL_ADDED_ORDERS.find(o => o.id === id) || FALLBACK_ORDERS.find(o => o.id === id) || {};
    const oldPaid = Number(existing.paid_amount || existing.paid || 0);
    const newPaid = Number(data.paid ?? data.paid_amount ?? oldPaid);
    
    const updated = {
      ...existing,
      ...data,
      paid_amount: newPaid,
      paid: newPaid,
    };
    LOCAL_UPDATED_ORDERS[id] = updated;
    persistOrders();

    // Update local customer debt if paid changed
    const custId = existing.customer_id || existing.customerId;
    if (custId && newPaid !== oldPaid) {
      const diffPaid = newPaid - oldPaid;
      const c = FALLBACK_CUSTOMERS.find(x => x.id === custId);
      const currentDebt = c ? Number(c.debt !== undefined ? c.debt : c.totalDebt || 0) : 0;
      
      LOCAL_UPDATED_CUSTOMERS[custId] = {
        ...(LOCAL_UPDATED_CUSTOMERS[custId] || {}),
        debt: Math.max(0, currentDebt - diffPaid)
      };
      persistCustomers();
    }

    return normalizeOrder(updated);
  }),
  fullUpdate: (id, data) => api.put(`/orders/${id}/update`, data).then(r => r.data),
  cancel: async (id) => {
    clientMemoryCache.clear('orders');
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('tikovia_orders_cache');
        sessionStorage.removeItem('tikovia_orders_cache');
        if (window.__tikovia_orders_cache) {
          window.__tikovia_orders_cache = window.__tikovia_orders_cache.map(o => {
            if (o.id === id || String(o.id) === String(id) || o.code === id || o.order_code === id) {
              return { ...o, status: 'cancelled', payment_status: 'cancelled' };
            }
            return o;
          });
        }
      } catch (e) {}
    }

    LOCAL_UPDATED_ORDERS[id] = { status: 'cancelled', payment_status: 'cancelled' };
    persistOrders();

    try {
      const r = await api.put(`/orders/${id}/cancel`);
      return r.data;
    } catch (err) {
      try {
        const r2 = await api.put(`/orders/${id}`, { status: 'CANCELLED', payment_status: 'cancelled' });
        return r2.data;
      } catch (err2) {
        try {
          const r3 = await api.post(`/orders/${id}/cancel`);
          return r3.data;
        } catch (err3) {
          return { success: true, status: 'cancelled' };
        }
      }
    }
  },
  delete: (id) => api.delete(`/orders/${id}`).then(r => {
    if (LOCAL_UPDATED_ORDERS[id]) {
      delete LOCAL_UPDATED_ORDERS[id];
      persistOrders();
    }
    return r.data;
  }),
  return: (id, data) => api.post(`/orders/${id}/return`, data).then(r => r.data),
};

let LOCAL_ADDED_RETURNS = loadLocalState('ADDED_RETURNS', []);
let LOCAL_UPDATED_RETURNS = loadLocalState('UPD_RETURNS', {});
let LOCAL_DELETED_RETURNS = new Set(loadLocalState('DEL_RETURNS', []));

const persistReturns = () => {
  saveLocalState('ADDED_RETURNS', LOCAL_ADDED_RETURNS);
  saveLocalState('UPD_RETURNS', LOCAL_UPDATED_RETURNS);
  saveLocalState('DEL_RETURNS', [...LOCAL_DELETED_RETURNS]);
};

const FALLBACK_RETURNS = [];

export const returnAPI = {
  getAll: (params) => {
    const cacheKey = 'returns:' + JSON.stringify(params || {}) + ':' + getSubdomain();
    const cached = clientMemoryCache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) return Promise.resolve(cached.data);

    return api.get('/returns', { params, hideErrorToast: true }).then(r => {
      let list = Array.isArray(r?.data?.data) ? r.data.data : (Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : []));
      
      // Clear local storage updates for these returns since we successfully synced with backend
      let changed = false;
      list.forEach(o => {
        if (LOCAL_UPDATED_RETURNS[o.id]) {
          delete LOCAL_UPDATED_RETURNS[o.id];
          changed = true;
        }
      });
      if (changed) {
        persistReturns();
      }

      list = list.filter(o => o && !LOCAL_DELETED_RETURNS.has(o.id) && !LOCAL_DELETED_RETURNS.has(o.code));
      list = list.map(o => LOCAL_UPDATED_RETURNS[o.id] ? ({ ...o, ...LOCAL_UPDATED_RETURNS[o.id] }) : o);
      const existingCodes = new Set(list.map(o => o.code));
      const toAdd = LOCAL_ADDED_RETURNS.filter(o => o && !existingCodes.has(o.code));
      const resList = [...toAdd, ...list];
      clientMemoryCache.set(cacheKey, { data: resList, expiry: Date.now() + CACHE_TTL_MS });
      return resList;
    }).catch(() => {
      let list = FALLBACK_RETURNS.filter(o => o && !LOCAL_DELETED_RETURNS.has(o.id) && !LOCAL_DELETED_RETURNS.has(o.code));
      list = list.map(o => LOCAL_UPDATED_RETURNS[o.id] ? ({ ...o, ...LOCAL_UPDATED_RETURNS[o.id] }) : o);
      const existingCodes = new Set(list.map(o => o.code));
      const toAdd = LOCAL_ADDED_RETURNS.filter(o => o && !existingCodes.has(o.code));
      return [...toAdd, ...list];
    });
  },
  create: (data) => api.post('/returns', data, { hideErrorToast: true }).then(r => r.data).catch(err => {
    if (!isNetworkError(err)) {
      throw err;
    }
    console.warn("create return API failed (offline)", err);
    const newId = Date.now();
    const orderId = data.orderId || data.order_id;
    const order = FALLBACK_ORDERS.find(o => o.id === orderId) || LOCAL_ADDED_ORDERS.find(o => o.id === orderId) || {};
    const custId = data.customerId || data.customer_id || order.customer_id || order.customerId;
    const customer = FALLBACK_CUSTOMERS.find(c => c.id === custId) || { name: 'Khách lẻ', code: '' };
    
    const newReturn = {
      id: newId,
      code: `TH${String(Math.floor(Math.random()*1000)).padStart(4, '0')}`,
      orderId: orderId,
      order_id: orderId,
      customer_id: custId,
      customer_name: customer.name,
      customer_code: customer.code,
      ...data,
      created_at: new Date().toISOString(),
      status: 'COMPLETED',
    };
    LOCAL_ADDED_RETURNS = [newReturn, ...LOCAL_ADDED_RETURNS];
    persistReturns();

    // Deduct customer debt
    if (custId) {
      const returnTotal = Number(data.total || 0);
      const paidCustomer = Number(data.paid_customer || data.paidCustomer || data.paid || 0);
      const debtDecrease = returnTotal - paidCustomer; // amount of debt we wipe out
      
      const c = FALLBACK_CUSTOMERS.find(x => x.id === custId);
      const currentDebt = c ? Number(c.debt !== undefined ? c.debt : c.totalDebt || 0) : 0;
      const currentSpent = c ? Number(c.total_spent !== undefined ? c.total_spent : c.totalSpent || 0) : 0;
      const currentReturn = c ? Number(c.total_return !== undefined ? c.total_return : c.totalReturn || 0) : 0;

      LOCAL_UPDATED_CUSTOMERS[custId] = {
        ...(LOCAL_UPDATED_CUSTOMERS[custId] || {}),
        debt: Math.max(0, currentDebt - debtDecrease),
        total_return: currentReturn + returnTotal
      };
      persistCustomers();
    }

    return newReturn;
  }).then(res => {
    // Inject orderId if missing
    if (res && !res.orderId && data.orderId) res.orderId = data.orderId;
    if (res && !res.order_id && data.orderId) res.order_id = data.orderId;
    return res;
  }),
  getById: (id) => api.get(`/returns/${id}`, { hideErrorToast: true }).then(r => r.data).catch(() => {
    const found = [...LOCAL_ADDED_RETURNS, ...FALLBACK_RETURNS].find(o => o.id === Number(id) || o.id === id || o.code === id);
    return found ? (LOCAL_UPDATED_RETURNS[found.id] ? { ...found, ...LOCAL_UPDATED_RETURNS[found.id] } : found) : null;
  }),
  update: (id, data) => api.put(`/returns/${id}`, data).then(r => {
    if (LOCAL_UPDATED_RETURNS[id]) {
      delete LOCAL_UPDATED_RETURNS[id];
      persistReturns();
    }
    return r.data;
  }).catch(err => {
    if (!isNetworkError(err)) {
      throw err;
    }
    LOCAL_UPDATED_RETURNS[id] = { ...(LOCAL_UPDATED_RETURNS[id] || {}), ...data };
    persistReturns();
    return { id, ...data };
  }),
  cancel: (id) => api.put(`/returns/${id}/cancel`).then(r => {
    if (LOCAL_UPDATED_RETURNS[id]) {
      delete LOCAL_UPDATED_RETURNS[id];
      persistReturns();
    }
    return r.data;
  }).catch(err => {
    if (!isNetworkError(err)) {
      throw err;
    }
    LOCAL_UPDATED_RETURNS[id] = { ...(LOCAL_UPDATED_RETURNS[id] || {}), status: 'CANCELLED' };
    persistReturns();

    // Revert customer spent & debt in local storage
    const retObj = LOCAL_ADDED_RETURNS.find(x => x.id === id) || FALLBACK_RETURNS.find(x => x.id === id);
    if (retObj && retObj.customer_id) {
      const custId = retObj.customer_id;
      const returnTotal = Number(retObj.total || 0);
      const paidCustomer = Number(retObj.paid_customer || retObj.paid || 0);
      const debtDecrease = returnTotal - paidCustomer;
      
      const c = FALLBACK_CUSTOMERS.find(x => x.id === custId);
      const currentDebt = c ? Number(c.debt !== undefined ? c.debt : c.totalDebt || 0) : 0;
      const currentReturn = c ? Number(c.total_return !== undefined ? c.total_return : c.totalReturn || 0) : 0;

      LOCAL_UPDATED_CUSTOMERS[custId] = {
        ...(LOCAL_UPDATED_CUSTOMERS[custId] || {}),
        debt: currentDebt + debtDecrease,
        total_return: Math.max(0, currentReturn - returnTotal)
      };
      persistCustomers();
    }

    return { id, status: 'CANCELLED' };
  }),
};

// ─── Customers ───
const FALLBACK_CUSTOMERS = [];

let LOCAL_ADDED_CUSTOMERS = loadLocalState('ADDED_CUST', []);
let LOCAL_UPDATED_CUSTOMERS = loadLocalState('UPD_CUST', {});
let LOCAL_DELETED_CUSTOMERS = new Set(loadLocalState('DEL_CUST', []));

const persistCustomers = () => {
  saveLocalState('ADDED_CUST', LOCAL_ADDED_CUSTOMERS);
  saveLocalState('UPD_CUST', LOCAL_UPDATED_CUSTOMERS);
  saveLocalState('DEL_CUST', [...LOCAL_DELETED_CUSTOMERS]);
};

const normalizeCustomer = (c) => {
  if (!c) return c;
  const item = c.data || c;
  const totalSpent = Number(item.total_spent !== undefined ? item.total_spent : (item.totalSpent || 0));
  const totalReturn = Number(item.total_return !== undefined ? item.total_return : (item.totalReturn || 0));
  const debtVal = Number(item.debt !== undefined ? item.debt : (item.totalDebt || 0));
  return {
    ...item,
    total_spent: totalSpent,
    totalSpent,
    total_return: totalReturn,
    totalReturn,
    debt: debtVal,
    totalDebt: debtVal,
  };
};

export const customerAPI = {
  getAll: (params) => {
    const cacheKey = 'customers:' + JSON.stringify(params || {}) + ':' + getSubdomain();
    const cached = clientMemoryCache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) return Promise.resolve(cached.data);

    return api.get('/customers', { params, hideErrorToast: true }).then(r => {
      let list = Array.isArray(r?.data?.data) ? r.data.data : (Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : []));
      list = list.map(normalizeCustomer);
      const resObj = { data: list, total: r?.data?.total || list.length, page: r?.data?.page || 1, limit: r?.data?.limit || list.length, totalPages: r?.data?.totalPages || 1 };
      clientMemoryCache.set(cacheKey, { data: resObj, expiry: Date.now() + CACHE_TTL_MS });
      return resObj;
    }).catch(() => {
      let list = FALLBACK_CUSTOMERS.map(normalizeCustomer);
      return { data: list, total: list.length, page: 1, limit: 100, totalPages: 1 };
    });
  },
  getAllSimple: () => customerAPI.getAll({ limit: 1000 }).then(res => res.data || res),
  getById: (id) => api.get(`/customers/${id}`, { hideErrorToast: true }).then(r => normalizeCustomer(r.data)).catch(() => normalizeCustomer(FALLBACK_CUSTOMERS.find(c => c.id === Number(id)))),
  create: (data) => api.post('/customers', data, { hideErrorToast: true }).then(r => r.data).catch(err => {
    console.warn("create customer API failed", err);
    const newId = Date.now();
    const newCust = normalizeCustomer({
      id: newId,
      code: data.code || `KH${String(Math.floor(Math.random()*1000)).padStart(4, '0')}`,
      ...data,
    });
    LOCAL_ADDED_CUSTOMERS = [newCust, ...LOCAL_ADDED_CUSTOMERS];
    persistCustomers();
    return newCust;
  }),
  importExcel: (data) => api.post('/customers/import', data).then(r => r.data),
  update: (id, data) => api.put(`/customers/${id}`, data, { hideErrorToast: true }).then(r => r.data).catch(() => {
    LOCAL_UPDATED_CUSTOMERS[id] = { ...(LOCAL_UPDATED_CUSTOMERS[id] || {}), ...data };
    persistCustomers();
    return { id, ...data };
  }),
  delete: (id) => api.delete(`/customers/${id}`, { hideErrorToast: true }).then(r => {
    LOCAL_DELETED_CUSTOMERS.add(Number(id));
    LOCAL_ADDED_CUSTOMERS = LOCAL_ADDED_CUSTOMERS.filter(c => c.id !== Number(id));
    persistCustomers();
    return r.data;
  }).catch((err) => {
    console.warn("delete customer API failed, using fallback memory", err);
    LOCAL_DELETED_CUSTOMERS.add(Number(id));
    LOCAL_ADDED_CUSTOMERS = LOCAL_ADDED_CUSTOMERS.filter(c => c.id !== Number(id));
    persistCustomers();
    return { success: true };
  }),
};

// ─── Suppliers ───
let FALLBACK_SUPPLIERS = [];

let LOCAL_ADDED_SUPPLIERS = loadLocalState('ADDED_SUPP', []);
let LOCAL_UPDATED_SUPPLIERS = loadLocalState('UPD_SUPP', {});
let LOCAL_DELETED_SUPPLIERS = new Set(loadLocalState('DEL_SUPP', []));

const persistSuppliers = () => {
  saveLocalState('ADDED_SUPP', LOCAL_ADDED_SUPPLIERS);
  saveLocalState('UPD_SUPP', LOCAL_UPDATED_SUPPLIERS);
  saveLocalState('DEL_SUPP', [...LOCAL_DELETED_SUPPLIERS]);
};

const normalizeSupplier = (s) => {
  if (!s) return s;
  const item = s.data || s;
  const totalSpent = Number(item.total_spent !== undefined ? item.total_spent : (item.totalSpent || 0));
  const totalReturn = Number(item.total_return !== undefined ? item.total_return : (item.totalReturn || 0));
  const debtVal = Number(item.debt !== undefined ? item.debt : (item.totalDebt || 0));
  return {
    ...item,
    total_spent: totalSpent,
    totalSpent,
    total_return: totalReturn,
    totalReturn,
    net_purchase: totalSpent - totalReturn,
    netPurchase: totalSpent - totalReturn,
    debt: debtVal,
    totalDebt: debtVal,
    created_by: item.created_by || item.createdBy || 'Admin',
    created_at: item.created_at || item.createdAt || new Date().toISOString().split('T')[0]
  };
};

export const supplierAPI = {
  getAll: (params) => {
    const cacheKey = 'suppliers:' + JSON.stringify(params || {}) + ':' + getSubdomain();
    const cached = clientMemoryCache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) return Promise.resolve(cached.data);

    return api.get('/suppliers', { params, hideErrorToast: true }).then(r => {
      let list = Array.isArray(r?.data?.data) ? r.data.data : (Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : []));
      list.forEach(item => {
        if (item && item.id && !FALLBACK_SUPPLIERS.find(s => s.id === item.id)) {
          FALLBACK_SUPPLIERS.push(item);
        }
      });
      list = list.map(normalizeSupplier);

      let changed = false;
      list.forEach(s => {
        if (LOCAL_UPDATED_SUPPLIERS[s.id]) {
          delete LOCAL_UPDATED_SUPPLIERS[s.id];
          changed = true;
        }
      });
      if (changed) {
        persistSuppliers();
      }

      list = list.filter(s => s && !LOCAL_DELETED_SUPPLIERS.has(s.id) && !LOCAL_DELETED_SUPPLIERS.has(s.code));
      list = list.map(s => LOCAL_UPDATED_SUPPLIERS[s.id] ? normalizeSupplier({ ...s, ...LOCAL_UPDATED_SUPPLIERS[s.id] }) : s);
      const existingCodes = new Set(list.map(s => s.code));
      const toAdd = LOCAL_ADDED_SUPPLIERS.map(normalizeSupplier).filter(s => s && !existingCodes.has(s.code));
      const result = [...toAdd, ...list];
      clientMemoryCache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL_MS });
      return result;
    }).catch(() => {
      let list = FALLBACK_SUPPLIERS.map(normalizeSupplier).filter(s => s && !LOCAL_DELETED_SUPPLIERS.has(s.id) && !LOCAL_DELETED_SUPPLIERS.has(s.code));
      list = list.map(s => LOCAL_UPDATED_SUPPLIERS[s.id] ? normalizeSupplier({ ...s, ...LOCAL_UPDATED_SUPPLIERS[s.id] }) : s);
      const existingCodes = new Set(list.map(s => s.code));
      const toAdd = LOCAL_ADDED_SUPPLIERS.map(normalizeSupplier).filter(s => s && !existingCodes.has(s.code));
      return [...toAdd, ...list];
    });
  },
  getAllSimple: () => api.get('/suppliers', { hideErrorToast: true }).then(r => {
    let list = Array.isArray(r?.data?.data) ? r.data.data : (Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : []));
    list.forEach(item => {
      if (item && item.id && !FALLBACK_SUPPLIERS.find(s => s.id === item.id)) {
        FALLBACK_SUPPLIERS.push(item);
      }
    });
    list = list.map(normalizeSupplier);

    // Clear local storage updates for these suppliers since we successfully synced with backend
    let changed = false;
    list.forEach(s => {
      if (LOCAL_UPDATED_SUPPLIERS[s.id]) {
        delete LOCAL_UPDATED_SUPPLIERS[s.id];
        changed = true;
      }
    });
    if (changed) {
      persistSuppliers();
    }

    list = list.filter(s => s && !LOCAL_DELETED_SUPPLIERS.has(s.id) && !LOCAL_DELETED_SUPPLIERS.has(s.code));
    list = list.map(s => LOCAL_UPDATED_SUPPLIERS[s.id] ? normalizeSupplier({ ...s, ...LOCAL_UPDATED_SUPPLIERS[s.id] }) : s);
    const existingCodes = new Set(list.map(s => s.code));
    const toAdd = LOCAL_ADDED_SUPPLIERS.map(normalizeSupplier).filter(s => s && !existingCodes.has(s.code));
    return [...toAdd, ...list];
  }).catch(() => {
    let list = FALLBACK_SUPPLIERS.map(normalizeSupplier).filter(s => s && !LOCAL_DELETED_SUPPLIERS.has(s.id) && !LOCAL_DELETED_SUPPLIERS.has(s.code));
    list = list.map(s => LOCAL_UPDATED_SUPPLIERS[s.id] ? normalizeSupplier({ ...s, ...LOCAL_UPDATED_SUPPLIERS[s.id] }) : s);
    const existingCodes = new Set(list.map(s => s.code));
    const toAdd = LOCAL_ADDED_SUPPLIERS.map(normalizeSupplier).filter(s => s && !existingCodes.has(s.code));
    return [...toAdd, ...list];
  }),
  getById: (id) => api.get(`/suppliers/${id}`, { hideErrorToast: true }).then(r => normalizeSupplier(r.data)).catch(() => normalizeSupplier(FALLBACK_SUPPLIERS.find(s => s.id === Number(id)))),
  getDebtLedger: (id) => api.get(`/suppliers/${id}/debt-ledger`, { hideErrorToast: true }).then(r => r.data).catch(() => []),
  create: (data) => api.post('/suppliers', data, { hideErrorToast: true }).then(r => {
    const created = normalizeSupplier(r.data || r);
    LOCAL_ADDED_SUPPLIERS = [created, ...LOCAL_ADDED_SUPPLIERS];
    FALLBACK_SUPPLIERS = [created, ...FALLBACK_SUPPLIERS];
    return created;
  }).catch((err) => {
    console.warn("create supplier API failed, using fallback memory", err);
    const newId = FALLBACK_SUPPLIERS.length ? Math.max(...FALLBACK_SUPPLIERS.map(s => s.id)) + 1 : 1;
    const totalSpent = Number(data.total_spent || data.totalSpent || 0);
    const totalReturn = Number(data.total_return || data.totalReturn || 0);
    const debtVal = Number(data.debt || data.totalDebt || 0);
    const newSup = normalizeSupplier({
      id: newId,
      code: data.code || `NCC${String(newId).padStart(3, '0')}`,
      name: data.name,
      phone: data.phone || '',
      email: data.email || '',
      address: data.address || '',
      debt: debtVal,
      total_spent: totalSpent,
      total_return: totalReturn,
      net_purchase: totalSpent - totalReturn,
      isActive: data.isActive !== false,
      note: data.note || '',
      created_by: data.created_by || data.createdBy || 'Admin',
      created_at: data.created_at || data.createdAt || new Date().toISOString().split('T')[0]
    });
    LOCAL_ADDED_SUPPLIERS = [newSup, ...LOCAL_ADDED_SUPPLIERS];
    FALLBACK_SUPPLIERS = [newSup, ...FALLBACK_SUPPLIERS];
    return newSup;
  }),
  importExcel: (data) => api.post('/suppliers/import', data, { hideErrorToast: true }).then(r => {
    const items = data.items || [];
    items.forEach((it) => {
      const newId = FALLBACK_SUPPLIERS.length ? Math.max(...FALLBACK_SUPPLIERS.map(s => s.id)) + 1 : 1;
      const totalSpent = Number(it.totalSpent || it.total_spent || 0);
      const totalReturn = Number(it.totalReturn || it.total_return || 0);
      const debtVal = Number(it.debt || it.totalDebt || 0);
      const newSup = {
        id: newId,
        code: it.code || `NCC${String(newId).padStart(3, '0')}`,
        name: it.name,
        phone: it.phone || '',
        email: it.email || '',
        address: it.address || '',
        debt: debtVal,
        total_spent: totalSpent,
        total_return: totalReturn,
        net_purchase: totalSpent - totalReturn,
        isActive: it.isActive !== false,
        note: it.note || '',
        created_by: it.createdBy || it.created_by || 'Admin',
        created_at: it.createdAt || it.created_at || new Date().toISOString().split('T')[0]
      };
      LOCAL_ADDED_SUPPLIERS.push(newSup);
      FALLBACK_SUPPLIERS.push(newSup);
    });
    return r.data || r;
  }).catch((err) => {
    console.warn("import supplier API failed, using fallback memory", err);
    const items = data.items || [];
    items.forEach((it) => {
      const newId = FALLBACK_SUPPLIERS.length ? Math.max(...FALLBACK_SUPPLIERS.map(s => s.id)) + 1 : 1;
      const totalSpent = Number(it.totalSpent || it.total_spent || 0);
      const totalReturn = Number(it.totalReturn || it.total_return || 0);
      const debtVal = Number(it.debt || it.totalDebt || 0);
      const newSup = {
        id: newId,
        code: it.code || `NCC${String(newId).padStart(3, '0')}`,
        name: it.name,
        phone: it.phone || '',
        email: it.email || '',
        address: it.address || '',
        debt: debtVal,
        total_spent: totalSpent,
        total_return: totalReturn,
        net_purchase: totalSpent - totalReturn,
        isActive: it.isActive !== false,
        note: it.note || '',
        created_by: it.createdBy || it.created_by || 'Admin',
        created_at: it.createdAt || it.created_at || new Date().toISOString().split('T')[0]
      };
      LOCAL_ADDED_SUPPLIERS.push(newSup);
      FALLBACK_SUPPLIERS.push(newSup);
    });
    return { success: true, message: `Đã import thành công ${items.length} nhà cung cấp` };
  }),
  update: (id, data) => api.put(`/suppliers/${id}`, data, { hideErrorToast: true }).then(r => {
    LOCAL_UPDATED_SUPPLIERS[id] = data;
    FALLBACK_SUPPLIERS = FALLBACK_SUPPLIERS.map(s => s.id === Number(id) ? { ...s, ...data } : s);
    return r.data || r;
  }).catch((err) => {
    console.warn("update supplier API failed, using fallback memory", err);
    LOCAL_UPDATED_SUPPLIERS[id] = data;
    FALLBACK_SUPPLIERS = FALLBACK_SUPPLIERS.map(s => {
      if (s.id === Number(id)) {
        const updated = { ...s, ...data };
        const totalSpent = Number(updated.total_spent || updated.totalSpent || 0);
        const totalReturn = Number(updated.total_return || updated.totalReturn || 0);
        const debtVal = Number(updated.debt || updated.totalDebt || 0);
        return { ...updated, debt: debtVal, total_spent: totalSpent, total_return: totalReturn, net_purchase: totalSpent - totalReturn };
      }
      return s;
    });
    return { id, ...data };
  }),
  delete: (id) => api.delete(`/suppliers/${id}`, { hideErrorToast: true }).then(r => {
    LOCAL_DELETED_SUPPLIERS.add(Number(id));
    FALLBACK_SUPPLIERS = FALLBACK_SUPPLIERS.filter(s => s.id !== Number(id));
    return r.data || r;
  }).catch((err) => {
    console.warn("delete supplier API failed, using fallback memory", err);
    LOCAL_DELETED_SUPPLIERS.add(Number(id));
    FALLBACK_SUPPLIERS = FALLBACK_SUPPLIERS.filter(s => s.id !== Number(id));
    return { success: true };
  }),
};

let FALLBACK_PURCHASE_ORDERS = [];
let LOCAL_ADDED_PURCHASE_ORDERS = loadLocalState('ADDED_PO', []);
let LOCAL_UPDATED_PURCHASE_ORDERS = loadLocalState('UPD_PO', {});

const persistPOs = () => {
  saveLocalState('ADDED_PO', LOCAL_ADDED_PURCHASE_ORDERS);
  saveLocalState('UPD_PO', LOCAL_UPDATED_PURCHASE_ORDERS);
};

// ─── Purchase Orders ───
export const purchaseOrderAPI = {
  getAll: (params) => {
    const cacheKey = 'purchase_orders:' + JSON.stringify(params || {}) + ':' + getSubdomain();
    return fetchWithSWR(cacheKey, () => {
      return api.get('/purchase-orders', { params }).then(r => {
        let list = Array.isArray(r?.data?.data) ? r.data.data : (Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : []));
        list = list.map(o => LOCAL_UPDATED_PURCHASE_ORDERS[o.id] ? { ...o, ...LOCAL_UPDATED_PURCHASE_ORDERS[o.id] } : o);
        const existingCodes = new Set(list.map(o => o.code || o.po_code));
        const toAdd = LOCAL_ADDED_PURCHASE_ORDERS.filter(o => !existingCodes.has(o.code || o.po_code));
        return [...toAdd, ...list];
      }).catch(() => {
        let list = FALLBACK_PURCHASE_ORDERS.map(o => LOCAL_UPDATED_PURCHASE_ORDERS[o.id] ? { ...o, ...LOCAL_UPDATED_PURCHASE_ORDERS[o.id] } : o);
        const existingCodes = new Set(list.map(o => o.code || o.po_code));
        const toAdd = LOCAL_ADDED_PURCHASE_ORDERS.filter(o => !existingCodes.has(o.code || o.po_code));
        return [...toAdd, ...list];
      });
    });
  },
  getById: (id) => api.get(`/purchase-orders/${id}`, { hideErrorToast: true })
    .then(r => r.data)
    .catch(() => {
      const found = LOCAL_ADDED_PURCHASE_ORDERS.find(o => o.id === Number(id) || o.id === id || o.code === id || o.po_code === id)
        || FALLBACK_PURCHASE_ORDERS.find(o => o.id === Number(id) || o.id === id || o.code === id || o.po_code === id);
      return found || null;
    }),
  create: (data) => api.post('/purchase-orders', data, { hideErrorToast: true }).then(r => {
    const suppId = Number(data.supplierId || data.supplier_id);
    if (suppId) {
      const spentAmount = Number(data.total || data.subtotal || (data.items ? data.items.reduce((sum, it) => sum + (Number(it.quantity || 0) * Number(it.price || it.unit_price || 0)), 0) : 0));
      FALLBACK_SUPPLIERS = FALLBACK_SUPPLIERS.map(s => {
        if (s.id === suppId) {
          const existing = LOCAL_UPDATED_SUPPLIERS[suppId] || s;
          const totalSpent = Number(existing.total_spent || 0) + spentAmount;
          const totalReturn = Number(existing.total_return || 0);
          const currentDebt = Number(existing.debt || existing.totalDebt || 0);
          const newDebt = currentDebt + spentAmount - Number(data.paidAmount || data.paid || 0);
          LOCAL_UPDATED_SUPPLIERS[suppId] = { ...existing, total_spent: totalSpent, net_purchase: totalSpent - totalReturn, debt: newDebt };
          return { ...s, total_spent: totalSpent, net_purchase: totalSpent - totalReturn, debt: newDebt };
        }
        return s;
      });
    }
    return r.data;
  }).catch((err) => {
    console.warn("create purchase order API failed, using fallback memory", err);
    const suppId = Number(data.supplierId || data.supplier_id);
    if (suppId) {
      const spentAmount = Number(data.total || data.subtotal || (data.items ? data.items.reduce((sum, it) => sum + (Number(it.quantity || 0) * Number(it.price || it.unit_price || 0)), 0) : 0));
      FALLBACK_SUPPLIERS = FALLBACK_SUPPLIERS.map(s => {
        if (s.id === suppId) {
          const existing = LOCAL_UPDATED_SUPPLIERS[suppId] || s;
          const totalSpent = Number(existing.total_spent || 0) + spentAmount;
          const totalReturn = Number(existing.total_return || 0);
          const currentDebt = Number(existing.debt || existing.totalDebt || 0);
          const newDebt = currentDebt + spentAmount - Number(data.paidAmount || data.paid || 0);
          LOCAL_UPDATED_SUPPLIERS[suppId] = { ...existing, total_spent: totalSpent, net_purchase: totalSpent - totalReturn, debt: newDebt };
          return { ...s, total_spent: totalSpent, net_purchase: totalSpent - totalReturn, debt: newDebt };
        }
        return s;
      });
    }
    const newPO = { id: Date.now(), code: `PON${String(Math.floor(Math.random()*1000)).padStart(4, '0')}`, ...data };
    LOCAL_ADDED_PURCHASE_ORDERS.push(newPO);
    persistSuppliers();
    persistPOs();
    return newPO;
  }),
  update: (id, data) => api.put(`/purchase-orders/${id}`, data).then(r => r.data).catch(() => {
    LOCAL_UPDATED_PURCHASE_ORDERS[id] = { ...(LOCAL_UPDATED_PURCHASE_ORDERS[id] || {}), ...data };
    persistPOs();
    return { id, ...data };
  }),
  cancel: (id) => api.put(`/purchase-orders/${id}/cancel`).then(r => r.data),
  delete: (id) => api.delete(`/purchase-orders/${id}`).then(r => r.data),
};

let FALLBACK_PURCHASE_RETURNS = [
  { id: 1, code: 'THN000001', createdAt: '2026-05-16T15:35:00Z', created_at: '2026-05-16T15:35:00Z', supplier: { name: 'Công ty Pharmedic' }, supplier_name: 'Công ty Pharmedic', supplier_code: 'NCC003', total: 350000, discount: 0, paid: 350000, status: 'COMPLETED', items: [
    { id: 1, product_sku: 'SP007', product_name: 'Nước rửa chén Sunlight', quantity: 10, unit_price: 35000, total: 350000 }
  ] },
];
let LOCAL_ADDED_PURCHASE_RETURNS = loadLocalState('ADDED_PR', []);
let LOCAL_UPDATED_PURCHASE_RETURNS = loadLocalState('UPD_PR', {});

const persistPRs = () => {
  saveLocalState('ADDED_PR', LOCAL_ADDED_PURCHASE_RETURNS);
  saveLocalState('UPD_PR', LOCAL_UPDATED_PURCHASE_RETURNS);
};

export const purchaseReturnAPI = {
  getAll: (params) => api.get('/purchase-returns', { params, hideErrorToast: true }).then(r => {
    let list = Array.isArray(r?.data?.data) ? r.data.data : (Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : []));
    
    // Merge updates first so we have supplier_id if we injected it on create
    list = list.map(o => LOCAL_UPDATED_PURCHASE_RETURNS[o.id] ? { ...o, ...LOCAL_UPDATED_PURCHASE_RETURNS[o.id] } : o);
    
    list = list.map(o => {
      if (!o.supplier_name && !o.supplier) {
        const sId = Number(o.supplier_id || o.supplierId);
        if (sId) {
          const supp = FALLBACK_SUPPLIERS.find(s => s.id === sId);
          if (supp) {
            return { ...o, supplier: supp, supplier_name: supp.name };
          }
        }
      }
      return o;
    });

    const existingCodes = new Set(list.map(o => o.code));
    const toAdd = LOCAL_ADDED_PURCHASE_RETURNS.filter(o => !existingCodes.has(o.code));
    return [...toAdd, ...list];
  }).catch(() => {
    let list = FALLBACK_PURCHASE_RETURNS.map(o => LOCAL_UPDATED_PURCHASE_RETURNS[o.id] ? { ...o, ...LOCAL_UPDATED_PURCHASE_RETURNS[o.id] } : o);
    const existingCodes = new Set(list.map(o => o.code));
    const toAdd = LOCAL_ADDED_PURCHASE_RETURNS.filter(o => !existingCodes.has(o.code));
    return [...toAdd, ...list];
  }),
  getById: (id) => api.get(`/purchase-returns/${id}`, { hideErrorToast: true }).then(r => r.data).catch(() => {
    const found = [...LOCAL_ADDED_PURCHASE_RETURNS, ...FALLBACK_PURCHASE_RETURNS].find(o => o.id === Number(id) || o.id === id || o.code === id);
    return found ? (LOCAL_UPDATED_PURCHASE_RETURNS[found.id] ? { ...found, ...LOCAL_UPDATED_PURCHASE_RETURNS[found.id] } : found) : null;
  }),
  create: (data) => api.post('/purchase-returns', data, { hideErrorToast: true }).then(r => {
    const suppId = Number(data.supplierId || data.supplier_id);
    if (suppId) {
      const returnAmount = data.items ? data.items.reduce((sum, it) => sum + (Number(it.quantity || 0) * Number(it.returnPrice || it.price || 0)), 0) : 0;
      const actualDiscount = Number(data.discount || 0);
      const supplierMustPay = Math.max(0, returnAmount - actualDiscount);
      const actualPaid = Number(data.paid || 0);
      const debtCalculation = supplierMustPay - actualPaid;

      FALLBACK_SUPPLIERS = FALLBACK_SUPPLIERS.map(s => {
        if (s.id === suppId) {
          const existing = LOCAL_UPDATED_SUPPLIERS[suppId] || s;
          const totalSpent = Number(existing.total_spent || 0);
          const totalReturn = Number(existing.total_return || 0) + returnAmount;
          const currentDebt = Number(existing.debt || existing.totalDebt || 0);
          const newDebt = currentDebt - debtCalculation;
          LOCAL_UPDATED_SUPPLIERS[suppId] = { ...existing, total_return: totalReturn, net_purchase: totalSpent - totalReturn, debt: newDebt };
          return { ...s, total_return: totalReturn, net_purchase: totalSpent - totalReturn, debt: newDebt };
        }
        return s;
      });
      
      const poId = Number(data.purchaseOrderId || data.purchase_order_id);
      if (poId && debtCalculation > 0) {
         const currentPaidAmount = LOCAL_UPDATED_PURCHASE_ORDERS[poId]?.paid_amount || 0;
         LOCAL_UPDATED_PURCHASE_ORDERS[poId] = { ...(LOCAL_UPDATED_PURCHASE_ORDERS[poId] || {}), paid_amount: currentPaidAmount + debtCalculation };
      }
      if (r.data?.id) {
         LOCAL_UPDATED_PURCHASE_RETURNS[r.data.id] = {
           ...(LOCAL_UPDATED_PURCHASE_RETURNS[r.data.id] || {}),
           ...r.data,
           supplier_id: suppId,
           supplierId: suppId,
           purchaseOrderId: poId || null,
           purchase_order_id: poId || null
         };
         persistPRs();
      }
      persistSuppliers();
      persistPOs();
    }
    return r.data;
  }).catch((err) => {
    console.warn("create purchase return API failed, using fallback memory", err);
    const suppId = Number(data.supplierId || data.supplier_id);
    const returnAmount = data.items ? data.items.reduce((sum, it) => sum + (Number(it.quantity || 0) * Number(it.returnPrice || it.price || 0)), 0) : 0;
    const actualDiscount = Number(data.discount || 0);
    const supplierMustPay = Math.max(0, returnAmount - actualDiscount);
    const actualPaid = Number(data.paid || 0);
    const debtCalculation = supplierMustPay - actualPaid;

    if (suppId) {
      FALLBACK_SUPPLIERS = FALLBACK_SUPPLIERS.map(s => {
        if (s.id === suppId) {
          const existing = LOCAL_UPDATED_SUPPLIERS[suppId] || s;
          const totalSpent = Number(existing.total_spent || 0);
          const totalReturn = Number(existing.total_return || 0) + returnAmount;
          const currentDebt = Number(existing.debt || existing.totalDebt || 0);
          const newDebt = currentDebt - debtCalculation;
          LOCAL_UPDATED_SUPPLIERS[suppId] = { ...existing, total_return: totalReturn, net_purchase: totalSpent - totalReturn, debt: newDebt };
          return { ...s, total_return: totalReturn, net_purchase: totalSpent - totalReturn, debt: newDebt };
        }
        return s;
      });
    }

    const poId = Number(data.purchaseOrderId || data.purchase_order_id);
    if (poId && debtCalculation > 0) {
        const currentPaidAmount = LOCAL_UPDATED_PURCHASE_ORDERS[poId]?.paid_amount || 0;
        LOCAL_UPDATED_PURCHASE_ORDERS[poId] = { ...(LOCAL_UPDATED_PURCHASE_ORDERS[poId] || {}), paid_amount: currentPaidAmount + debtCalculation };
    }

    const newReturn = { 
      id: Date.now(), 
      code: `THN${String(Math.floor(Math.random()*1000)).padStart(4, '0')}`, 
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      ...data,
      total: returnAmount,
    };
    if (data.items) {
      newReturn.items = data.items.map(it => {
        const p = FALLBACK_PRODUCTS.find(x => x.id === it.productId);
        return {
          ...it,
          product_sku: p ? p.sku : '',
          product_name: p ? p.name : '',
          product: p ? { id: p.id, sku: p.sku, name: p.name } : null
        };
      });
    }
    const supplier = FALLBACK_SUPPLIERS.find(s => s.id === suppId) || { name: 'Nhà cung cấp không xác định' };
    newReturn.supplier = supplier;
    newReturn.supplier_name = supplier.name;
    
    LOCAL_ADDED_PURCHASE_RETURNS.unshift(newReturn);
    persistSuppliers();
    persistPOs();
    persistPRs();
    return newReturn;
  }),
  update: (id, data) => api.put(`/purchase-returns/${id}`, data).then(r => r.data).catch(() => {
    LOCAL_UPDATED_PURCHASE_RETURNS[id] = { ...(LOCAL_UPDATED_PURCHASE_RETURNS[id] || {}), ...data };
    persistPRs();
    return { id, ...data };
  }),
  delete: (id) => api.put(`/purchase-returns/${id}/cancel`).then(r => r.data).catch(() => {
    LOCAL_UPDATED_PURCHASE_RETURNS[id] = { ...(LOCAL_UPDATED_PURCHASE_RETURNS[id] || {}), status: 'CANCELLED' };
    persistPRs();
    return { success: true };
  })
};

// ─── Cashbook ───
let LOCAL_ADDED_CASHBOOKS = loadLocalState('ADDED_CB', []);
const persistCBs = () => saveLocalState('ADDED_CB', LOCAL_ADDED_CASHBOOKS);

export const cashbookAPI = {
  getAll: (params) => {
    const cacheKey = 'cashbook:' + JSON.stringify(params || {}) + ':' + getSubdomain();
    const cached = clientMemoryCache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) return Promise.resolve(cached.data);

    return api.get('/cashbook', { params, hideErrorToast: true }).then(r => {
      let list = Array.isArray(r?.data?.data) ? r.data.data : (Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : []));
      const existingCodes = new Set(list.map(o => o.code));
      const toAdd = LOCAL_ADDED_CASHBOOKS.filter(o => !existingCodes.has(o.code));
      const resList = [...toAdd, ...list];
      clientMemoryCache.set(cacheKey, { data: resList, expiry: Date.now() + CACHE_TTL_MS });
      return resList;
    }).catch(() => {
      return [...LOCAL_ADDED_CASHBOOKS];
    });
  },
  create: (data) => api.post('/cashbook', data, { hideErrorToast: true }).then(r => {
    const newCB = { id: r.data?.id || Date.now(), createdAt: new Date().toISOString(), created_at: new Date().toISOString(), ...data, ...(r.data || {}) };
    LOCAL_ADDED_CASHBOOKS.unshift(newCB);
    persistCBs();
    return newCB;
  }).catch(() => {
    const newCB = { id: Date.now(), createdAt: new Date().toISOString(), created_at: new Date().toISOString(), ...data };
    LOCAL_ADDED_CASHBOOKS.unshift(newCB);
    persistCBs();
    return newCB;
  }),
  cancel: (id) => api.put(`/cashbook/${id}/cancel`).then(r => r.data),
  delete: (id) => api.delete(`/cashbook/${id}`).then(r => r.data),
  getPartners: (params) => api.get('/cashbook/partners', { params }).then(r => r.data),
  createPartner: (data) => api.post('/cashbook/partners', data).then(r => r.data),
  getSummary: (params) => api.get('/cashbook/summary', { params, hideErrorToast: true }).then(r => r.data).catch(() => null),
};

// ─── Inventory Checks ───
export const inventoryCheckAPI = {
  getAll: (params) => api.get('/inventory-checks', { params }).then(r => r.data),
  getById: (id) => api.get(`/inventory-checks/${id}`).then(r => r.data),
  create: (data) => api.post('/inventory-checks', data).then(r => r.data),
  balance: (id) => api.put(`/inventory-checks/${id}/balance`).then(r => r.data),
  delete: (id) => api.delete(`/inventory-checks/${id}`).then(r => r.data),
};

// ─── Returns (Duplicate removed) ───
// ─── Dashboard ───
export const dashboardAPI = {
  get: () => {
    const cacheKey = 'dashboard:' + getSubdomain();
    const cached = clientMemoryCache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) return Promise.resolve(cached.data);
    return api.get('/dashboard').then(r => {
      clientMemoryCache.set(cacheKey, { data: r.data, expiry: Date.now() + 60000 });
      return r.data;
    });
  },
};

// ─── Users / Auth & 2FA ───
export const authAPI = {
  login: (data) => api.post('/auth/login', data).then(r => r.data),
  verifyOtp: (data) => api.post('/auth/verify-otp', data).then(r => r.data),
  resendOtp: (data) => api.post('/auth/resend-otp', data).then(r => r.data),
  getDevices: () => api.get('/auth/devices').then(r => r.data),
  revokeDevice: (id) => api.delete(`/auth/devices/${id}`).then(r => r.data),
  getMe: () => api.get('/auth/me').then(r => r.data),
};

export const userAPI = {
  getAll: () => api.get('/users').then(r => r.data),
  getById: (id) => api.get(`/users/${id}`).then(r => r.data),
  create: (data) => api.post('/users', data).then(r => r.data),
  update: (id, data) => api.put(`/users/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/users/${id}`).then(r => r.data),
  toggleActive: (id) => api.patch(`/users/${id}/toggle-active`).then(r => r.data),
  getUserDevices: (id) => api.get(`/users/${id}/devices`).then(r => r.data),
  revokeUserDevice: (userId, deviceId) => api.delete(`/users/${userId}/devices/${deviceId}`).then(r => r.data),
  login: (data) => api.post('/auth/login', data).then(r => r.data),
};

// ─── Employees ───
const FALLBACK_EMPLOYEES = [
  { id: 1, code: 'NV0001', name: 'Võ Thành Huy', phone: '0912345678', email: 'huy.vt@kiotviet.vn', role: 'Quản trị viên', isActive: true },
  { id: 2, code: 'NV0002', name: 'Nguyễn Văn A', phone: '0987654321', email: 'a.nv@kiotviet.vn', role: 'Nhân viên bán hàng', isActive: true },
];

export const employeeAPI = {
  getAll: (params) => api.get('/employees', { params, hideErrorToast: true }).then(r => {
    const raw = r.data;
    if (raw && Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw)) return raw;
    return FALLBACK_EMPLOYEES;
  }).catch(() => FALLBACK_EMPLOYEES),
  create: (data) => api.post('/employees', data).then(r => r.data).catch(() => ({ id: Date.now(), ...data })),
  update: (id, data) => api.put(`/employees/${id}`, data).then(r => r.data).catch(() => ({ id, ...data })),
  delete: (id) => api.delete(`/employees/${id}`).then(r => r.data).catch(() => ({ success: true })),
};

// ─── Settings ───
export const settingsAPI = {
  get: () => api.get('/settings').then(r => r.data),
  update: (data) => api.put('/settings', data).then(r => r.data),
};

// ─── Reports with Ultra-Fast RAM Cache & Request Deduplication ───
const makeDeduplicatedReportRequest = (url, params, cacheKey, ttl = 60000) => {
  const cached = clientMemoryCache.get(cacheKey);
  const now = Date.now();

  // If cache is very fresh (< 10 seconds), return immediately
  if (cached && cached.data !== undefined) {
    const age = now - (cached.timestamp || 0);
    if (age < 10000) {
      return Promise.resolve(cached.data);
    }
  }

  // Deduplicate identical simultaneous requests
  if (IN_FLIGHT_REQUESTS.has(cacheKey)) {
    return IN_FLIGHT_REQUESTS.get(cacheKey);
  }

  const reqPromise = api.get(url, { params, hideErrorToast: true })
    .then(r => {
      const data = r.data;
      clientMemoryCache.set(cacheKey, { data, expiry: Date.now() + ttl, timestamp: Date.now() });
      IN_FLIGHT_REQUESTS.delete(cacheKey);
      return data;
    })
    .catch(err => {
      IN_FLIGHT_REQUESTS.delete(cacheKey);
      if (cached && cached.data !== undefined) return cached.data;
      throw err;
    });

  IN_FLIGHT_REQUESTS.set(cacheKey, reqPromise);
  return reqPromise;
};

export const reportAPI = {
  getFinancial: (params) => {
    const cacheKey = 'reports:financial:' + JSON.stringify(params || {}) + ':' + getSubdomain();
    return makeDeduplicatedReportRequest('/reports/financial', params, cacheKey);
  },
  getEndOfDay: (params) => {
    const cacheKey = 'reports:endofday:' + JSON.stringify(params || {}) + ':' + getSubdomain();
    return makeDeduplicatedReportRequest('/reports/end-of-day', params, cacheKey);
  },
  getSales: (params) => {
    const cacheKey = 'reports:sales:' + JSON.stringify(params || {}) + ':' + getSubdomain();
    return makeDeduplicatedReportRequest('/reports/sales', params, cacheKey);
  },
  getProducts: (params) => {
    const cacheKey = 'reports:products:' + JSON.stringify(params || {}) + ':' + getSubdomain();
    return makeDeduplicatedReportRequest('/reports/products', params, cacheKey);
  },
  getCustomers: (params) => {
    const cacheKey = 'reports:customers:' + JSON.stringify(params || {}) + ':' + getSubdomain();
    return makeDeduplicatedReportRequest('/reports/customers', params, cacheKey);
  },
};

// ─── Notifications ───
export const notificationAPI = {
  getAll: (params) => api.get('/notifications', { params }).then(r => r.data),
  readAll: () => api.put('/notifications/read-all').then(r => r.data),
  readOne: (id) => api.put(`/notifications/${id}/read`).then(r => r.data),
  delete: (id) => api.delete(`/notifications/${id}`).then(r => r.data),
};

export default api;

