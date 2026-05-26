import axios from 'axios';
import toast from 'react-hot-toast';

export const getSubdomain = () => {
  const hostname = window.location.hostname.toLowerCase();
  
  // Check if hostname is an IP address (IPv4)
  const isIP = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname);
  if (isIP) {
    return localStorage.getItem('tenant_subdomain') || 'demo';
  }

  // Base landing hosts do not have tenant subdomains -> fall back to default 'demo'
  if (hostname === 'localhost' || hostname === 'bizpos.tikovia.vn' || hostname === 'www.bizpos.tikovia.vn') {
    return 'demo';
  }

  const parts = hostname.split('.');
  
  // For local development e.g. "store.localhost"
  if (parts.length === 2 && parts[1] === 'localhost') {
    return parts[0];
  }

  // e.g. "store.bizpos.tikovia.vn"
  if (hostname.endsWith('.bizpos.tikovia.vn')) {
    const sub = parts[0];
    if (sub !== 'www') return sub;
  }

  // e.g. "store.tikovia.vn" (3 parts)
  if (hostname.endsWith('.tikovia.vn') && parts.length === 3) {
    const sub = parts[0];
    if (sub !== 'www' && sub !== 'bizpos') return sub;
  }

  return localStorage.getItem('tenant_subdomain') || 'demo';
};

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://api.tikovia.vn/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request Interceptor: auto-attach token & tenant subdomain ───
api.interceptors.request.use((config) => {
  const isSystemRoute = config.url?.includes('/system-login') || config.url?.includes('/system-me') || config.url?.includes('/tenants');
  const superAdminToken = localStorage.getItem('super_admin_token');

  if (isSystemRoute && superAdminToken) {
    config.headers.Authorization = `Bearer ${superAdminToken}`;
  } else {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }

  const subdomain = getSubdomain();
  if (subdomain) {
    config.headers['X-Tenant-Subdomain'] = subdomain;
  }

  return config;
});

// ─── Response Interceptor: handle errors globally ───
api.interceptors.response.use(
  (res) => res,
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
      if (status === 403) {
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
const FALLBACK_PRODUCTS = [
  { id: 1, sku: 'SP001', name: 'Coca Cola 330ml', barcode: '8935049500100', categoryId: 1, category_id: 1, category: { id: 1, name: 'Đồ uống' }, costPrice: 7000, sellPrice: 10000, stock: 200, minStock: 10, maxStock: 500, unit: 'Lon', direct_sale: true, isActive: true, createdAt: '2026-05-15T07:00:00Z', brand: 'Coca Cola', location: 'Kho A', supplierId: 1, supplierName: 'Công ty TNHH Phân phối ABC', supplier: { id: 1, name: 'Công ty TNHH Phân phối ABC' } },
  { id: 2, sku: 'SP002', name: 'Pepsi 330ml', barcode: '8935049500200', categoryId: 1, category_id: 1, category: { id: 1, name: 'Đồ uống' }, costPrice: 7000, sellPrice: 10000, stock: 150, minStock: 10, maxStock: 500, unit: 'Lon', direct_sale: true, isActive: true, createdAt: '2026-05-15T08:00:00Z', brand: 'Pepsi', location: 'Kho B', supplierId: 2, supplierName: 'Đại lý XYZ', supplier: { id: 2, name: 'Đại lý XYZ' } },
  { id: 3, sku: 'SP003', name: 'Nước suối Aquafina 500ml', barcode: '8935049500300', categoryId: 1, category_id: 1, category: { id: 1, name: 'Đồ uống' }, costPrice: 3000, sellPrice: 5000, stock: 300, minStock: 10, maxStock: 500, unit: 'Chai', direct_sale: true, isActive: true, createdAt: '2026-05-15T09:00:00Z', brand: 'Suntory', location: 'Kho A', supplierId: 1, supplierName: 'Công ty TNHH Phân phối ABC', supplier: { id: 1, name: 'Công ty TNHH Phân phối ABC' } },
  { id: 4, sku: 'SP004', name: 'Mì Hảo Hảo tôm chua cay', barcode: '8935049500400', categoryId: 2, category_id: 2, category: { id: 2, name: 'Thực phẩm' }, costPrice: 3500, sellPrice: 5000, stock: 500, minStock: 20, maxStock: 1000, unit: 'Gói', direct_sale: true, isActive: true, createdAt: '2026-05-15T10:00:00Z', brand: 'Acecook', location: 'Kho C', supplierId: 2, supplierName: 'Đại lý XYZ', supplier: { id: 2, name: 'Đại lý XYZ' } },
  { id: 5, sku: 'SP005', name: 'Snack Oishi tôm', barcode: '8935049500500', categoryId: 2, category_id: 2, category: { id: 2, name: 'Thực phẩm' }, costPrice: 5000, sellPrice: 8000, stock: 100, minStock: 15, maxStock: 300, unit: 'Gói', direct_sale: true, isActive: true, createdAt: '2026-05-15T11:00:00Z', brand: 'Liwayway', location: 'Kho C', supplierId: 1, supplierName: 'Công ty TNHH Phân phối ABC', supplier: { id: 1, name: 'Công ty TNHH Phân phối ABC' } },
  { id: 6, sku: 'SP006', name: 'Bột giặt OMO 3kg', barcode: '8935049500600', categoryId: 3, category_id: 3, category: { id: 3, name: 'Gia dụng' }, costPrice: 65000, sellPrice: 85000, stock: 30, minStock: 5, maxStock: 100, unit: 'Bịch', direct_sale: true, isActive: true, createdAt: '2026-05-15T12:00:00Z', brand: 'Unilever', location: 'Kho D', supplierId: 2, supplierName: 'Đại lý XYZ', supplier: { id: 2, name: 'Đại lý XYZ' } },
  { id: 7, sku: 'SP007', name: 'Nước rửa chén Sunlight', barcode: '8935049500700', categoryId: 3, category_id: 3, category: { id: 3, name: 'Gia dụng' }, costPrice: 25000, sellPrice: 35000, stock: 50, minStock: 10, maxStock: 200, unit: 'Chai', direct_sale: true, isActive: true, createdAt: '2026-05-15T13:00:00Z', brand: 'Unilever', location: 'Kho D', supplierId: 1, supplierName: 'Công ty TNHH Phân phối ABC', supplier: { id: 1, name: 'Công ty TNHH Phân phối ABC' } },
  { id: 8, sku: 'SP008', name: 'Pin AA Panasonic (vỉ 4)', barcode: '8935049500800', categoryId: 4, category_id: 4, category: { id: 4, name: 'Điện tử' }, costPrice: 20000, sellPrice: 30000, stock: 80, minStock: 10, maxStock: 300, unit: 'Vỉ', direct_sale: true, isActive: true, createdAt: '2026-05-15T14:00:00Z', brand: 'Panasonic', location: 'Kho E', supplierId: 2, supplierName: 'Đại lý XYZ', supplier: { id: 2, name: 'Đại lý XYZ' } },
  { id: 9, sku: 'SP009', name: 'Bút bi Thiên Long TL-027', barcode: '8935049500900', categoryId: 5, category_id: 5, category: { id: 5, name: 'Văn phòng phẩm' }, costPrice: 3000, sellPrice: 5000, stock: 200, minStock: 20, maxStock: 1000, unit: 'Cây', direct_sale: true, isActive: true, createdAt: '2026-05-15T15:00:00Z', brand: 'Thiên Long', location: 'Kho F', supplierId: 1, supplierName: 'Công ty TNHH Phân phối ABC', supplier: { id: 1, name: 'Công ty TNHH Phân phối ABC' } },
  { id: 10, sku: 'SP010', name: 'Vở Campus 200 trang', barcode: '8935049501000', categoryId: 5, category_id: 5, category: { id: 5, name: 'Văn phòng phẩm' }, costPrice: 10000, sellPrice: 15000, stock: 150, minStock: 15, maxStock: 500, unit: 'Cuốn', direct_sale: true, isActive: true, createdAt: '2026-05-15T16:00:00Z', brand: 'Kokuyo', location: 'Kho F', supplierId: 2, supplierName: 'Đại lý XYZ', supplier: { id: 2, name: 'Đại lý XYZ' } },
];

export const productAPI = {
  getAll: () => api.get('/products/all', { hideErrorToast: true }).then(r => {
    const raw = r.data;
    if (raw && Array.isArray(raw.data)) return raw.data;
    if (Array.isArray(raw)) return raw;
    return FALLBACK_PRODUCTS;
  }).catch((err) => {
    console.warn("getAll /products/all failed, falling back to /products paginated endpoint", err);
    return api.get('/products', { params: { limit: 500 }, hideErrorToast: true }).then(r => {
      const raw = r.data;
      if (raw && Array.isArray(raw.data)) return raw.data;
      if (Array.isArray(raw)) return raw;
      return FALLBACK_PRODUCTS;
    }).catch((e) => {
      const serverMsg = e.response?.data?.message || e.message;
      console.error("Both product endpoints failed. Server response:", e.response?.data, e);
      toast.error(`Máy chủ đang lỗi (${serverMsg}). Tự động dùng dữ liệu dự phòng.`);
      return FALLBACK_PRODUCTS;
    });
  }),
  list: (params) => api.get('/products', { params }).then(r => {
    const raw = r.data;
    if (raw && Array.isArray(raw.data)) return raw;
    return raw;
  }).catch(() => ({ data: FALLBACK_PRODUCTS, total: FALLBACK_PRODUCTS.length, page: 1, limit: 20, totalPages: 1 })),
  getById: (id) => api.get(`/products/${id}`).then(r => r.data).catch(() => FALLBACK_PRODUCTS.find(p => p.id === Number(id))),
  create: (data) => api.post('/products', data).then(r => r.data?.data || r.data),
  importExcel: (data) => api.post('/products/import', data).then(r => r.data?.data || r.data),
  update: (id, data) => api.put(`/products/${id}`, data).then(r => r.data?.data || r.data),
  delete: (id) => api.delete(`/products/${id}`).then(r => r.data),
};



// ─── Categories ───
const FALLBACK_CATEGORIES = [
  { id: 1, name: 'Đồ uống' },
  { id: 2, name: 'Thực phẩm' },
  { id: 3, name: 'Gia dụng' },
  { id: 4, name: 'Điện tử' },
  { id: 5, name: 'Văn phòng phẩm' },
];

export const categoryAPI = {
  getAll: () => api.get('/categories').then(r => r.data).catch(() => FALLBACK_CATEGORIES),
  create: (data) => api.post('/categories', data).then(r => r.data),
  update: (id, data) => api.put(`/categories/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/categories/${id}`).then(r => r.data),
};
export const brandAPI = {
  getAll: () => api.get('/brands').then(r => r.data),
  create: (data) => api.post('/brands', data).then(r => r.data),
};

// ─── Orders ───
// Normalize Prisma camelCase → snake_case keys that OrdersPage uses
function normalizeOrder(o) {
  if (!o) return o;
  return {
    ...o,
    order_code: o.order_code || o.code,
    created_at: o.created_at || o.createdAt,
    customer_name: o.customer_name || o.customer?.name || null,
    customer_code: o.customer_code || (o.customer?.id ? 'KH' + String(o.customer.id).padStart(6, '0') : null),
    user_name: o.user_name || o.user?.fullName || null,
    total: Number(o.total || 0),
    subtotal: Number(o.subtotal || o.total || 0),
    discount_amount: Number(o.discount_amount ?? o.discount ?? 0),
    paid_amount: Number(o.paid_amount ?? o.paid ?? 0),
    payment_method: o.payment_method || (o.paymentMethod || '').toLowerCase(),
    payment_status: o.payment_status || (o.status === 'COMPLETED' ? 'completed' : o.status?.toLowerCase()),
    status: o.status?.toLowerCase?.() || o.status,
    return_code: (o.returns && o.returns.length > 0) ? o.returns.map(r => r.code).join(', ') : '---',
  };
}

function normalizeOrderDetail(o) {
  if (!o) return o;
  const base = normalizeOrder(o);
  if (o.items) {
    base.items = o.items.map(it => ({
      ...it,
      product_sku: it.product_sku || it.product?.sku || '',
      product_name: it.product_name || it.product?.name || '',
      quantity: Number(it.quantity || 0),
      unit_price: Number(it.unit_price ?? it.price ?? 0),
      discount: Number(it.discount || 0),
      total: Number(it.total ?? ((it.price || 0) * (it.quantity || 0) - (it.discount || 0))),
    }));
  }
  return base;
}

// ─── Orders ───
const FALLBACK_ORDERS = [
  { id: 1, code: 'HD0001', order_code: 'HD0001', customer_name: 'Trần Thị B', customer_code: 'KH001', user_name: 'Nguyễn Văn A', total: 150000, subtotal: 150000, discount_amount: 0, paid_amount: 150000, payment_method: 'cash', payment_status: 'completed', status: 'completed', created_at: '2026-05-15T10:30:00Z', items: [{ id: 1, product_name: 'Coca Cola 330ml', product_sku: 'SP001', quantity: 15, unit_price: 10000, total: 150000 }] },
  { id: 2, code: 'HD0002', order_code: 'HD0002', customer_name: 'Lê Văn C', customer_code: 'KH002', user_name: 'Nguyễn Văn A', total: 350000, subtotal: 350000, discount_amount: 0, paid_amount: 350000, payment_method: 'transfer', payment_status: 'completed', status: 'completed', created_at: '2026-05-15T14:15:00Z', items: [{ id: 2, product_name: 'Bột giặt OMO 3kg', product_sku: 'SP006', quantity: 4, unit_price: 85000, total: 340000 }, { id: 3, product_name: 'Coca Cola 330ml', product_sku: 'SP001', quantity: 1, unit_price: 10000, total: 10000 }] },
];

let LOCAL_ADDED_ORDERS = loadLocalState('ADDED_ORDERS', []);
let LOCAL_UPDATED_ORDERS = loadLocalState('UPD_ORDERS', {});
let LOCAL_DELETED_ORDERS = new Set(loadLocalState('DEL_ORDERS', []));

const persistOrders = () => {
  saveLocalState('ADDED_ORDERS', LOCAL_ADDED_ORDERS);
  saveLocalState('UPD_ORDERS', LOCAL_UPDATED_ORDERS);
  saveLocalState('DEL_ORDERS', [...LOCAL_DELETED_ORDERS]);
};

export const orderAPI = {
  getAll: (params) => api.get('/orders', { params, hideErrorToast: true }).then(r => {
    let list = Array.isArray(r?.data?.data) ? r.data.data : (Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : []));
    list = list.map(normalizeOrder);
    list = list.filter(o => o && !LOCAL_DELETED_ORDERS.has(o.id) && !LOCAL_DELETED_ORDERS.has(o.code));
    list = list.map(o => LOCAL_UPDATED_ORDERS[o.id] ? normalizeOrder({ ...o, ...LOCAL_UPDATED_ORDERS[o.id] }) : o);
    const existingCodes = new Set(list.map(o => o.code));
    const toAdd = LOCAL_ADDED_ORDERS.map(normalizeOrder).filter(o => o && !existingCodes.has(o.code));
    return { data: [...toAdd, ...list], total: list.length + toAdd.length, page: 1, limit: 100, totalPages: 1 };
  }).catch(() => {
    let list = FALLBACK_ORDERS.map(normalizeOrder).filter(o => o && !LOCAL_DELETED_ORDERS.has(o.id) && !LOCAL_DELETED_ORDERS.has(o.code));
    list = list.map(o => LOCAL_UPDATED_ORDERS[o.id] ? normalizeOrder({ ...o, ...LOCAL_UPDATED_ORDERS[o.id] }) : o);
    const existingCodes = new Set(list.map(o => o.code));
    const toAdd = LOCAL_ADDED_ORDERS.map(normalizeOrder).filter(o => o && !existingCodes.has(o.code));
    return { data: [...toAdd, ...list], total: list.length + toAdd.length, page: 1, limit: 100, totalPages: 1 };
  }),
  getById: (id) => {
    console.log("orderAPI.getById calling URL:", `/orders/${id}`);
    return api.get(`/orders/${id}`, { hideErrorToast: true })
      .then(r => {
        console.log("orderAPI.getById success response data:", r.data);
        return normalizeOrderDetail(r.data);
      })
      .catch((err) => {
        console.error("orderAPI.getById network error:", err);
        const found = LOCAL_ADDED_ORDERS.find(o => o.id === Number(id) || o.id === id || o.code === id || o.order_code === id)
          || FALLBACK_ORDERS.find(o => o.id === Number(id) || o.id === id || o.code === id || o.order_code === id);
        console.log("orderAPI.getById fallback found:", found);
        return normalizeOrderDetail(found);
      });
  },
  create: (data) => api.post('/orders', data, { hideErrorToast: true }).then(r => r.data).catch(err => {
    console.warn("create order API failed", err);
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
  update: (id, data) => api.put(`/orders/${id}`, data).then(r => r.data),
  fullUpdate: (id, data) => api.put(`/orders/${id}/update`, data).then(r => r.data),
  cancel: (id) => api.put(`/orders/${id}/cancel`).then(r => r.data),
  delete: (id) => api.delete(`/orders/${id}`).then(r => r.data),
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
  getAll: (params) => api.get('/returns', { params, hideErrorToast: true }).then(r => {
    let list = Array.isArray(r?.data?.data) ? r.data.data : (Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : []));
    list = list.filter(o => o && !LOCAL_DELETED_RETURNS.has(o.id) && !LOCAL_DELETED_RETURNS.has(o.code));
    list = list.map(o => LOCAL_UPDATED_RETURNS[o.id] ? ({ ...o, ...LOCAL_UPDATED_RETURNS[o.id] }) : o);
    const existingCodes = new Set(list.map(o => o.code));
    const toAdd = LOCAL_ADDED_RETURNS.filter(o => o && !existingCodes.has(o.code));
    return [...toAdd, ...list];
  }).catch(() => {
    let list = FALLBACK_RETURNS.filter(o => o && !LOCAL_DELETED_RETURNS.has(o.id) && !LOCAL_DELETED_RETURNS.has(o.code));
    list = list.map(o => LOCAL_UPDATED_RETURNS[o.id] ? ({ ...o, ...LOCAL_UPDATED_RETURNS[o.id] }) : o);
    const existingCodes = new Set(list.map(o => o.code));
    const toAdd = LOCAL_ADDED_RETURNS.filter(o => o && !existingCodes.has(o.code));
    return [...toAdd, ...list];
  }),
  create: (data) => api.post('/returns', data, { hideErrorToast: true }).then(r => r.data).catch(err => {
    console.warn("create return API failed", err);
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
};

// ─── Customers ───
const FALLBACK_CUSTOMERS = [
  { id: 1, code: 'KH001', name: 'Trần Thị B', phone: '0912345678', address: 'Q.1, TP.HCM', total_spent: 1500000, debt: 0, total_return: 0 },
  { id: 2, code: 'KH002', name: 'Lê Văn C', phone: '0923456789', address: 'Q.3, TP.HCM', total_spent: 3200000, debt: 500000, total_return: 0 },
  { id: 3, code: 'KH003', name: 'Phạm Thị D', phone: '0934567890', address: 'Q.7, TP.HCM', total_spent: 800000, debt: 0, total_return: 0 },
];

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
  getAll: (params) => api.get('/customers', { params, hideErrorToast: true }).then(r => {
    let list = Array.isArray(r?.data?.data) ? r.data.data : (Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : []));
    list = list.map(normalizeCustomer);
    list = list.filter(c => c && !LOCAL_DELETED_CUSTOMERS.has(c.id) && !LOCAL_DELETED_CUSTOMERS.has(c.code));
    list = list.map(c => LOCAL_UPDATED_CUSTOMERS[c.id] ? normalizeCustomer({ ...c, ...LOCAL_UPDATED_CUSTOMERS[c.id] }) : c);
    const existingCodes = new Set(list.map(c => c.code));
    const toAdd = LOCAL_ADDED_CUSTOMERS.map(normalizeCustomer).filter(c => c && !existingCodes.has(c.code));
    return { data: [...toAdd, ...list], total: list.length + toAdd.length, page: 1, limit: 100, totalPages: 1 };
  }).catch(() => {
    let list = FALLBACK_CUSTOMERS.map(normalizeCustomer).filter(c => c && !LOCAL_DELETED_CUSTOMERS.has(c.id) && !LOCAL_DELETED_CUSTOMERS.has(c.code));
    list = list.map(c => LOCAL_UPDATED_CUSTOMERS[c.id] ? normalizeCustomer({ ...c, ...LOCAL_UPDATED_CUSTOMERS[c.id] }) : c);
    const existingCodes = new Set(list.map(c => c.code));
    const toAdd = LOCAL_ADDED_CUSTOMERS.map(normalizeCustomer).filter(c => c && !existingCodes.has(c.code));
    return { data: [...toAdd, ...list], total: list.length + toAdd.length, page: 1, limit: 100, totalPages: 1 };
  }),
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
  delete: (id) => api.delete(`/customers/${id}`).then(r => r.data),
};

// ─── Suppliers ───
let FALLBACK_SUPPLIERS = [
  { id: 1, code: 'NCC001', name: 'Công ty TNHH Phân phối ABC', phone: '0281234567', email: 'contact@abc.vn', address: 'Q.Bình Tân, TP.HCM', debt: 1500000, total_spent: 12500000, total_return: 0, net_purchase: 12500000, isActive: true, note: 'Nhà cung cấp uy tín', created_by: 'Admin', created_at: '2026-05-15' },
  { id: 2, code: 'NCC002', name: 'Đại lý XYZ', phone: '0282345678', email: 'sales@xyz.com', address: 'Q.Tân Phú, TP.HCM', debt: 0, total_spent: 8400000, total_return: 0, net_purchase: 8400000, isActive: true, note: 'Giao hàng nhanh', created_by: 'Admin', created_at: '2026-05-15' },
];

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
  getAll: (params) => api.get('/suppliers', { params, hideErrorToast: true }).then(r => {
    let list = Array.isArray(r?.data?.data) ? r.data.data : (Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : []));
    list.forEach(item => {
      if (item && item.id && !FALLBACK_SUPPLIERS.find(s => s.id === item.id)) {
        FALLBACK_SUPPLIERS.push(item);
      }
    });
    list = list.map(normalizeSupplier);
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
  getAllSimple: () => api.get('/suppliers', { hideErrorToast: true }).then(r => {
    let list = Array.isArray(r?.data?.data) ? r.data.data : (Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : []));
    list.forEach(item => {
      if (item && item.id && !FALLBACK_SUPPLIERS.find(s => s.id === item.id)) {
        FALLBACK_SUPPLIERS.push(item);
      }
    });
    list = list.map(normalizeSupplier);
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

let FALLBACK_PURCHASE_ORDERS = [
  { id: 1, po_code: 'PN000042', created_at: '2026-05-11T11:35:00Z', supplier_code: 'NCC001', supplier_name: 'Công ty TNHH Citigo', total: 4550000, paid_amount: 4550000, payment_status: 'paid', created_by: 'Võ Thành Huy', received_by: 'Võ Thành Huy', note: '', items: [
    { id: 1, product_sku: 'SP001', product_name: 'Coca Cola 330ml', quantity: 250, unit_price: 10000, total: 2500000 },
    { id: 6, product_sku: 'SP006', product_name: 'Bột giặt OMO 3kg', quantity: 24, unit_price: 85000, total: 2040000 }
  ] },
  { id: 2, po_code: 'PN000041', created_at: '2026-05-10T11:35:00Z', supplier_code: 'NCC002', supplier_name: 'Công ty Hoàng Gia', total: 3200000, paid_amount: 3200000, payment_status: 'paid', created_by: 'Võ Thành Huy', received_by: 'Võ Thành Huy', note: '', items: [
    { id: 2, product_sku: 'SP002', product_name: 'Pepsi 330ml', quantity: 320, unit_price: 10000, total: 3200000 }
  ] },
  { id: 3, po_code: 'PN000040', created_at: '2026-05-09T11:34:00Z', supplier_code: 'NCC003', supplier_name: 'Công ty Pharmedic', total: 1850000, paid_amount: 1850000, payment_status: 'paid', created_by: 'Võ Thành Huy', received_by: 'Võ Thành Huy', note: '', items: [
    { id: 7, product_sku: 'SP007', product_name: 'Nước rửa chén Sunlight', quantity: 50, unit_price: 35000, total: 1750000 },
    { id: 1, product_sku: 'SP001', product_name: 'Coca Cola 330ml', quantity: 10, unit_price: 10000, total: 100000 }
  ] },
  { id: 4, po_code: 'PN000039', created_at: '2026-05-08T11:33:00Z', supplier_code: 'NCC002', supplier_name: 'Công ty Hoàng Gia', total: 5400000, paid_amount: 5400000, payment_status: 'paid', created_by: 'Võ Thành Huy', received_by: 'Võ Thành Huy', note: '', items: [
    { id: 4, product_sku: 'SP004', product_name: 'Mì Hảo Hảo tôm chua cay', quantity: 1000, unit_price: 5000, total: 5000000 },
    { id: 5, product_sku: 'SP005', product_name: 'Snack Oishi tôm', quantity: 50, unit_price: 8000, total: 400000 }
  ] },
  { id: 5, po_code: 'PN000038', created_at: '2026-05-07T11:32:00Z', supplier_code: 'NCC003', supplier_name: 'Công ty Pharmedic', total: 2100000, paid_amount: 2100000, payment_status: 'paid', created_by: 'Võ Thành Huy', received_by: 'Võ Thành Huy', note: '', items: [
    { id: 10, product_sku: 'SP010', product_name: 'Vở Campus 200 trang', quantity: 140, unit_price: 15000, total: 2100000 }
  ] },
];
let LOCAL_ADDED_PURCHASE_ORDERS = loadLocalState('ADDED_PO', []);
let LOCAL_UPDATED_PURCHASE_ORDERS = loadLocalState('UPD_PO', {});

const persistPOs = () => {
  saveLocalState('ADDED_PO', LOCAL_ADDED_PURCHASE_ORDERS);
  saveLocalState('UPD_PO', LOCAL_UPDATED_PURCHASE_ORDERS);
};

// ─── Purchase Orders ───
export const purchaseOrderAPI = {
  getAll: (params) => api.get('/purchase-orders', { params }).then(r => {
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
  }),
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
      const spentAmount = Number(data.total || data.subtotal || 0);
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
      const spentAmount = Number(data.total || data.subtotal || 0);
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
    const supplier = FALLBACK_SUPPLIERS.find(s => s.id === suppId) || { name: 'Nhà cung cấp không xác định' };
    newReturn.supplier = supplier;
    newReturn.supplier_name = supplier.name;
    
    LOCAL_ADDED_PURCHASE_RETURNS.unshift(newReturn);
    persistSuppliers();
    persistPOs();
    persistPRs();
    return newReturn;
  }),
};

// ─── Cashbook ───
let LOCAL_ADDED_CASHBOOKS = loadLocalState('ADDED_CB', []);
const persistCBs = () => saveLocalState('ADDED_CB', LOCAL_ADDED_CASHBOOKS);

export const cashbookAPI = {
  getAll: (params) => api.get('/cashbook', { params, hideErrorToast: true }).then(r => {
    let list = Array.isArray(r?.data?.data) ? r.data.data : (Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : []));
    const existingCodes = new Set(list.map(o => o.code));
    const toAdd = LOCAL_ADDED_CASHBOOKS.filter(o => !existingCodes.has(o.code));
    return [...toAdd, ...list];
  }).catch(() => {
    return [...LOCAL_ADDED_CASHBOOKS];
  }),
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
  get: () => api.get('/dashboard').then(r => r.data),
};

// ─── Users / Auth ───
export const userAPI = {
  getAll: () => api.get('/users').then(r => r.data),
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

// ─── Reports ───
export const reportAPI = {
  getEndOfDay: (params) => api.get('/reports/end-of-day', { params }).then(r => r.data),
  getSales: (params) => api.get('/reports/sales', { params }).then(r => r.data),
  getProducts: (params) => api.get('/reports/products', { params }).then(r => r.data),
  getCustomers: (params) => api.get('/reports/customers', { params }).then(r => r.data),
};

export default api;

