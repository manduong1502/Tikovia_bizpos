import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, Suspense, lazy } from 'react';
import { Toaster } from 'react-hot-toast';
import axios from 'axios';
import AppLayout from './components/layout/AppLayout';
import ErrorBoundary from './components/ErrorBoundary';
import { DashboardSkeleton } from './components/ui/Skeleton';
import { useAppStore } from './stores/appStore';

// ─── Lazy loaded pages ───
const LoginPage = lazy(() => import('./pages/Login/LoginPage'));
const DashboardPage = lazy(() => import('./pages/Dashboard/DashboardPage'));
const ProductsPage = lazy(() => import('./pages/Products/ProductsPage'));
const OrdersPage = lazy(() => import('./pages/Orders/OrdersPage'));
const CustomersPage = lazy(() => import('./pages/Customers/CustomersPage'));
const EmployeesPage = lazy(() => import('./pages/Employees/EmployeesPage'));
const CashbookPage = lazy(() => import('./pages/Cashbook/CashbookPage'));
const ReportsPage = lazy(() => import('./pages/Reports/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/Settings/SettingsPage'));
const SuppliersPage = lazy(() => import('./pages/Suppliers/SuppliersPage'));
const PurchaseOrdersPage = lazy(() => import('./pages/PurchaseOrders/PurchaseOrdersPage'));
const CategoriesPage = lazy(() => import('./pages/Categories/CategoriesPage'));
const InventoryCheckPage = lazy(() => import('./pages/InventoryCheck/InventoryCheckPage'));
const ReturnsPage = lazy(() => import('./pages/Returns/ReturnsPage'));
const PlaceholderPage = lazy(() => import('./pages/PlaceholderPage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-[40vh]">
      <div className="w-7 h-7 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const darkMode = useAppStore(s => s.darkMode);

  // Apply dark mode class on mount
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    const interceptor = axios.interceptors.response.use(
      r => r,
      error => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          if (location.pathname !== '/login') navigate('/login');
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, [navigate, location]);

  return (
    <ErrorBoundary>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { fontFamily: 'Inter, sans-serif', fontSize: '13px', borderRadius: '10px', padding: '12px 16px' },
          success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />

      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Suspense fallback={<PageLoader />}><LoginPage /></Suspense>} />
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Suspense fallback={<DashboardSkeleton />}><DashboardPage /></Suspense>} />
          <Route path="/products" element={<Suspense fallback={<PageLoader />}><ProductsPage /></Suspense>} />
          <Route path="/categories" element={<Suspense fallback={<PageLoader />}><CategoriesPage /></Suspense>} />
          <Route path="/pricebook" element={<Suspense fallback={<PageLoader />}><PlaceholderPage title="Thiết lập giá" icon="💰" /></Suspense>} />
          <Route path="/inventory-check" element={<Suspense fallback={<PageLoader />}><InventoryCheckPage /></Suspense>} />
          <Route path="/stock-transfer" element={<Suspense fallback={<PageLoader />}><PlaceholderPage title="Chuyển kho" icon="🔄" /></Suspense>} />
          <Route path="/suppliers" element={<Suspense fallback={<PageLoader />}><SuppliersPage /></Suspense>} />
          <Route path="/purchase-orders" element={<Suspense fallback={<PageLoader />}><PurchaseOrdersPage /></Suspense>} />
          <Route path="/orders" element={<Suspense fallback={<PageLoader />}><OrdersPage /></Suspense>} />
          <Route path="/returns" element={<Suspense fallback={<PageLoader />}><ReturnsPage /></Suspense>} />
          <Route path="/customers" element={<Suspense fallback={<PageLoader />}><CustomersPage /></Suspense>} />
          <Route path="/employees" element={<Suspense fallback={<PageLoader />}><EmployeesPage /></Suspense>} />
          <Route path="/cashbook" element={<Suspense fallback={<PageLoader />}><CashbookPage /></Suspense>} />
          <Route path="/reports" element={<Suspense fallback={<PageLoader />}><ReportsPage /></Suspense>} />
          <Route path="/settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
