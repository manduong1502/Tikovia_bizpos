import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, Suspense, lazy } from 'react';
import { Toaster } from 'react-hot-toast';
import AppLayout from './components/layout/AppLayout';
import ErrorBoundary from './components/ErrorBoundary';
import { DashboardSkeleton } from './components/ui/Skeleton';
import { useAppStore } from './stores/appStore';
import { SocketProvider } from './context/SocketContext';

// Helper function to retry loading lazy dynamic imports if they fail (e.g. after a deploy)
const lazyRetry = (componentImport) => {
  return lazy(() =>
    componentImport().catch((error) => {
      const isChunkLoadFailed =
        error.name === 'ChunkLoadError' ||
        /Failed to fetch dynamically imported module/i.test(error.message);

      if (isChunkLoadFailed) {
        const hasReloaded = sessionStorage.getItem('chunk-load-reloaded');
        if (!hasReloaded) {
          sessionStorage.setItem('chunk-load-reloaded', 'true');
          window.location.reload();
          return new Promise(() => {}); // Return a pending promise to keep loading state
        }
      }
      throw error;
    })
  );
};

// ─── Lazy loaded pages ───
const LoginPage = lazyRetry(() => import('./pages/Login/LoginPage'));
const RegisterTenantPage = lazyRetry(() => import('./pages/RegisterTenant/RegisterTenantPage'));
const DashboardPage = lazyRetry(() => import('./pages/Dashboard/DashboardPage'));
const ProductsPage = lazyRetry(() => import('./pages/Products/ProductsPage'));
const OrdersPage = lazyRetry(() => import('./pages/Orders/OrdersPage'));
const CustomersPage = lazyRetry(() => import('./pages/Customers/CustomersPage'));
const CashbookPage = lazyRetry(() => import('./pages/Cashbook/CashbookPage'));
const ReportsPage = lazyRetry(() => import('./pages/Reports/ReportsPage'));
const EndOfDayReportPage = lazyRetry(() => import('./pages/Reports/EndOfDayReportPage'));
const SalesReportPage = lazyRetry(() => import('./pages/Reports/SalesReportPage'));
const ProductsReportPage = lazyRetry(() => import('./pages/Reports/ProductsReportPage'));
const CustomersReportPage = lazyRetry(() => import('./pages/Reports/CustomersReportPage'));
const SettingsPage = lazyRetry(() => import('./pages/Settings/SettingsPage'));
const SuppliersPage = lazyRetry(() => import('./pages/Suppliers/SuppliersPage'));
const PurchaseOrdersPage = lazyRetry(() => import('./pages/PurchaseOrders/PurchaseOrdersPage'));
const CategoriesPage = lazyRetry(() => import('./pages/Categories/CategoriesPage'));
const POSPage = lazyRetry(() => import('./pages/POS/POSPage'));
const PlaceholderPage = lazyRetry(() => import('./pages/PlaceholderPage'));
const PriceBooksPage = lazyRetry(() => import('./pages/PriceBooks/PriceBooksPage'));
const CreatePurchaseOrderPage = lazyRetry(() => import('./pages/PurchaseOrders/CreatePurchaseOrderPage'));
const PurchaseReturnsPage = lazyRetry(() => import('./pages/PurchaseReturns/PurchaseReturnsPage'));
const CreatePurchaseReturnPage = lazyRetry(() => import('./pages/PurchaseReturns/CreatePurchaseReturnPage'));

const ReturnsPage = lazyRetry(() => import('./pages/Returns/ReturnsPage'));
const ReturnOrderPage = lazyRetry(() => import('./pages/Returns/ReturnOrderPage'));

const SystemLogin = lazyRetry(() => import('./pages/SystemAdmin/SystemLogin'));
const SystemDashboard = lazyRetry(() => import('./pages/SystemAdmin/SystemDashboard'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-[40vh]">
      <div className="w-7 h-7 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ─── Bảo vệ route: chưa đăng nhập → về trang Login ───
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// ─── Đã đăng nhập rồi thì không cần vào lại trang Login ───
function GuestRoute({ children }) {
  const token = localStorage.getItem('token');
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

// ─── Bảo vệ route Super Admin ───
function SuperAdminProtectedRoute({ children }) {
  const token = localStorage.getItem('super_admin_token');
  if (!token) {
    return <Navigate to="/system-admin/login" replace />;
  }
  return children;
}

function SuperAdminGuestRoute({ children }) {
  const token = localStorage.getItem('super_admin_token');
  if (token) {
    return <Navigate to="/system-admin" replace />;
  }
  return children;
}

function App() {
  const navigate = useNavigate();
  const darkMode = useAppStore(s => s.darkMode);

  // Apply dark mode class on mount and clean chunk reloaded flag
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    sessionStorage.removeItem('chunk-load-reloaded');
  }, [darkMode]);

  // Tải trước (prefetch) các trang lớn chạy ngầm để kế toán chuyển trang tức thời không giật lag
  useEffect(() => {
    const prefetchTimer = setTimeout(() => {
      const pageImports = [
        () => import('./pages/Orders/OrdersPage'),
        () => import('./pages/Products/ProductsPage'),
        () => import('./pages/PurchaseOrders/PurchaseOrdersPage'),
        () => import('./pages/Customers/CustomersPage'),
        () => import('./pages/Cashbook/CashbookPage'),
        () => import('./pages/Returns/ReturnsPage'),
        () => import('./pages/Suppliers/SuppliersPage'),
        () => import('./pages/POS/POSPage'),
        () => import('./pages/Categories/CategoriesPage'),
        () => import('./pages/PriceBooks/PriceBooksPage'),
        () => import('./pages/PurchaseReturns/PurchaseReturnsPage'),
      ];
      pageImports.forEach(fn => fn().catch(() => {}));
    }, 2000);

    return () => clearTimeout(prefetchTimer);
  }, []);

  return (
    <ErrorBoundary>
      <SocketProvider>
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
        {/* Trang chủ → chuyển về Dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Trang đăng nhập: chỉ cho phép nếu chưa login */}
        <Route path="/login" element={
          <GuestRoute>
            <Suspense fallback={<PageLoader />}><LoginPage /></Suspense>
          </GuestRoute>
        } />

        {/* Trang đăng ký gian hàng: chỉ cho phép nếu chưa login */}
        <Route path="/register-tenant" element={
          <GuestRoute>
            <Suspense fallback={<PageLoader />}><RegisterTenantPage /></Suspense>
          </GuestRoute>
        } />

        {/* Super Admin Routes */}
        <Route path="/system-admin/login" element={
          <SuperAdminGuestRoute>
            <Suspense fallback={<PageLoader />}><SystemLogin /></Suspense>
          </SuperAdminGuestRoute>
        } />

        <Route path="/system-admin" element={
          <SuperAdminProtectedRoute>
            <Suspense fallback={<PageLoader />}><SystemDashboard /></Suspense>
          </SuperAdminProtectedRoute>
        } />

        {/* Màn hình bán hàng (POS): Full screen, yêu cầu đăng nhập */}
        <Route path="/pos" element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoader />}><POSPage /></Suspense>
          </ProtectedRoute>
        } />

        {/* Tất cả các trang quản lý: yêu cầu đăng nhập */}
        <Route element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }>
          <Route path="/dashboard" element={<Suspense fallback={<DashboardSkeleton />}><DashboardPage /></Suspense>} />
          <Route path="/products" element={<Suspense fallback={<PageLoader />}><ProductsPage /></Suspense>} />
          <Route path="/categories" element={<Suspense fallback={<PageLoader />}><CategoriesPage /></Suspense>} />
          <Route path="/pricebook" element={<Suspense fallback={<PageLoader />}><PriceBooksPage /></Suspense>} />

          <Route path="/suppliers" element={<Suspense fallback={<PageLoader />}><SuppliersPage /></Suspense>} />
          <Route path="/purchase-orders" element={<Suspense fallback={<PageLoader />}><PurchaseOrdersPage /></Suspense>} />
          <Route path="/purchase-orders/create" element={<Suspense fallback={<PageLoader />}><CreatePurchaseOrderPage /></Suspense>} />
          <Route path="/purchase-returns" element={<Suspense fallback={<PageLoader />}><PurchaseReturnsPage /></Suspense>} />
          <Route path="/purchase-returns/create" element={<Suspense fallback={<PageLoader />}><CreatePurchaseReturnPage /></Suspense>} />

          <Route path="/returns" element={<Suspense fallback={<PageLoader />}><ReturnsPage /></Suspense>} />
          <Route path="/returns/new" element={<Suspense fallback={<PageLoader />}><ReturnOrderPage /></Suspense>} />
          <Route path="/returns/new/:orderId" element={<Suspense fallback={<PageLoader />}><ReturnOrderPage /></Suspense>} />

          <Route path="/invoices" element={<Suspense fallback={<PageLoader />}><OrdersPage /></Suspense>} />

          <Route path="/customers" element={<Suspense fallback={<PageLoader />}><CustomersPage /></Suspense>} />
          <Route path="/cashbook" element={<Suspense fallback={<PageLoader />}><CashbookPage /></Suspense>} />

          <Route path="/reports/end-of-day" element={<Suspense fallback={<PageLoader />}><EndOfDayReportPage /></Suspense>} />
          <Route path="/reports/sales" element={<Suspense fallback={<PageLoader />}><SalesReportPage /></Suspense>} />
          <Route path="/reports/products" element={<Suspense fallback={<PageLoader />}><ProductsReportPage /></Suspense>} />
          <Route path="/reports/customers" element={<Suspense fallback={<PageLoader />}><CustomersReportPage /></Suspense>} />

          <Route path="/settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
        </Route>

        {/* Route không tồn tại → về Dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      </SocketProvider>
    </ErrorBoundary>
  );
}

export default App;
