import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://api.tikovia.vn/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request Interceptor: auto-attach token ───
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Response Interceptor: handle errors globally ───
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;

    if (status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    if (status === 403) {
      toast.error('Bạn không có quyền thực hiện thao tác này');
    } else if (status === 404) {
      toast.error('Không tìm thấy dữ liệu');
    } else if (status >= 500) {
      toast.error('Lỗi máy chủ. Vui lòng thử lại sau');
    } else if (message) {
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

// ─── Products ───
export const productAPI = {
  getAll: () => api.get('/products/all').then(r => r.data),
  getById: (id) => api.get(`/products/${id}`).then(r => r.data),
  create: (data) => api.post('/products', data).then(r => r.data),
  update: (id, data) => api.put(`/products/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/products/${id}`).then(r => r.data),
};

// ─── Categories ───
export const categoryAPI = {
  getAll: () => api.get('/categories').then(r => r.data),
  create: (data) => api.post('/categories', data).then(r => r.data),
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
    discount_amount: o.discount_amount ?? o.discount ?? 0,
    paid_amount: o.paid_amount ?? o.paid ?? 0,
    payment_method: o.payment_method || (o.paymentMethod || '').toLowerCase(),
    payment_status: o.payment_status || (o.status === 'COMPLETED' ? 'completed' : o.status?.toLowerCase()),
    status: o.status?.toLowerCase?.() || o.status,
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
      unit_price: it.unit_price ?? it.price ?? 0,
      total: it.total ?? ((it.price || 0) * (it.quantity || 0) - (it.discount || 0)),
    }));
  }
  return base;
}

export const orderAPI = {
  getAll: (params) => api.get('/orders', { params }).then(r => {
    const raw = r.data;
    if (raw && Array.isArray(raw.data)) {
      return { ...raw, data: raw.data.map(normalizeOrder) };
    }
    if (Array.isArray(raw)) return raw.map(normalizeOrder);
    return raw;
  }),
  getById: (id) => api.get(`/orders/${id}`).then(r => normalizeOrderDetail(r.data)),
  create: (data) => api.post('/orders', data).then(r => r.data),
  update: (id, data) => api.put(`/orders/${id}`, data).then(r => r.data),
  fullUpdate: (id, data) => api.put(`/orders/${id}/update`, data).then(r => r.data),
  cancel: (id) => api.put(`/orders/${id}/cancel`).then(r => r.data),
  return: (id, data) => api.post(`/orders/${id}/return`, data).then(r => r.data),
};

// ─── Customers ───
export const customerAPI = {
  getAll: (params) => api.get('/customers', { params }).then(r => r.data),
  getById: (id) => api.get(`/customers/${id}`).then(r => r.data),
  create: (data) => api.post('/customers', data).then(r => r.data),
  update: (id, data) => api.put(`/customers/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/customers/${id}`).then(r => r.data),
};

// ─── Employees ───
export const employeeAPI = {
  getAll: (params) => api.get('/employees', { params }).then(r => r.data),
  create: (data) => api.post('/employees', data).then(r => r.data),
  update: (id, data) => api.put(`/employees/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/employees/${id}`).then(r => r.data),
};

// ─── Suppliers ───
export const supplierAPI = {
  getAll: (params) => api.get('/suppliers', { params }).then(r => r.data),
  getAllSimple: () => api.get('/suppliers/all').then(r => r.data),
  getById: (id) => api.get(`/suppliers/${id}`).then(r => r.data),
  create: (data) => api.post('/suppliers', data).then(r => r.data),
  update: (id, data) => api.put(`/suppliers/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/suppliers/${id}`).then(r => r.data),
};

// ─── Purchase Orders ───
export const purchaseOrderAPI = {
  getAll: (params) => api.get('/suppliers/purchase-orders/list', { params }).then(r => r.data),
  getById: (id) => api.get(`/suppliers/purchase-orders/${id}`).then(r => r.data),
  create: (data) => api.post('/suppliers/purchase-orders', data).then(r => r.data),
};

// ─── Cashbook ───
export const cashbookAPI = {
  getAll: (params) => api.get('/cashbook', { params }).then(r => r.data),
  create: (data) => api.post('/cashbook', data).then(r => r.data),
  delete: (id) => api.delete(`/cashbook/${id}`).then(r => r.data),
};

// ─── Inventory Checks ───
export const inventoryCheckAPI = {
  getAll: (params) => api.get('/inventory-checks', { params }).then(r => r.data),
  getById: (id) => api.get(`/inventory-checks/${id}`).then(r => r.data),
  create: (data) => api.post('/inventory-checks', data).then(r => r.data),
  balance: (id) => api.put(`/inventory-checks/${id}/balance`).then(r => r.data),
  delete: (id) => api.delete(`/inventory-checks/${id}`).then(r => r.data),
};

// ─── Returns ───
export const returnAPI = {
  getAll: (params) => api.get('/orders/returns/list', { params }).then(r => r.data),
};

// ─── Dashboard ───
export const dashboardAPI = {
  get: () => api.get('/dashboard').then(r => r.data),
};

// ─── Users / Auth ───
export const userAPI = {
  getAll: () => api.get('/users').then(r => r.data),
  login: (data) => api.post('/auth/login', data).then(r => r.data),
};

// ─── Settings ───
export const settingsAPI = {
  get: () => api.get('/settings').then(r => r.data),
  update: (data) => api.put('/settings', data).then(r => r.data),
};

export default api;

