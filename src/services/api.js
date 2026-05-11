import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: '/api',
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

// ─── Convenience methods ───
export const productAPI = {
  getAll: () => api.get('/products/all').then(r => r.data),
  getById: (id) => api.get(`/products/${id}`).then(r => r.data),
  create: (data) => api.post('/products', data).then(r => r.data),
  update: (id, data) => api.put(`/products/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/products/${id}`).then(r => r.data),
};

export const categoryAPI = {
  getAll: () => api.get('/categories').then(r => r.data),
  create: (data) => api.post('/categories', data).then(r => r.data),
};

export const orderAPI = {
  getAll: (params) => api.get('/orders', { params }).then(r => r.data),
  getById: (id) => api.get(`/orders/${id}`).then(r => r.data),
  cancel: (id) => api.put(`/orders/${id}/cancel`).then(r => r.data),
  update: (id, data) => api.put(`/orders/${id}`, data).then(r => r.data),
};

export const customerAPI = {
  getAll: (params) => api.get('/customers', { params }).then(r => r.data),
  getById: (id) => api.get(`/customers/${id}`).then(r => r.data),
  create: (data) => api.post('/customers', data).then(r => r.data),
  update: (id, data) => api.put(`/customers/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/customers/${id}`).then(r => r.data),
};

export const supplierAPI = {
  getAll: () => api.get('/suppliers').then(r => r.data),
};

export const dashboardAPI = {
  get: () => api.get('/dashboard').then(r => r.data),
};

export const cashbookAPI = {
  getAll: () => api.get('/cashbook').then(r => r.data),
};

export const userAPI = {
  getAll: () => api.get('/users').then(r => r.data),
  login: (data) => api.post('/auth/login', data).then(r => r.data),
};

export default api;
