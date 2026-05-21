import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, Suspense, lazy } from 'react';
import { Toaster } from 'react-hot-toast';
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
const CashbookPage = lazy(() => import('./pages/Cashbook/CashbookPage'));
const ReportsPage = lazy(() => import('./pages/Reports/ReportsPage'));
const EndOfDayReportPage = lazy(() => import('./pages/Reports/EndOfDayReportPage'));
const SalesReportPage = lazy(() => import('./pages/Reports/SalesReportPage'));
const ProductsReportPage = lazy(() => import('./pages/Reports/ProductsReportPage'));
const CustomersReportPage = lazy(() => import('./pages/Reports/CustomersReportPage'));
const SettingsPage = lazy(() => import('./pages/Settings/SettingsPage'));
const SuppliersPage = lazy(() => import('./pages/Suppliers/SuppliersPage'));
const PurchaseOrdersPage = lazy(() => import('./pages/PurchaseOrders/PurchaseOrdersPage'));
const CategoriesPage = lazy(() => import('./pages/Categories/CategoriesPage'));
const POSPage = lazy(() => import('./pages/POS/POSPage'));
const PlaceholderPage = lazy(() => import('./pages/PlaceholderPage'));
const PriceBooksPage = lazy(() => import('./pages/PriceBooks/PriceBooksPage'));
const CreatePurchaseOrderPage = lazy(() => import('./pages/PurchaseOrders/CreatePurchaseOrderPage'));
const PurchaseReturnsPage = lazy(() => import('./pages/PurchaseReturns/PurchaseReturnsPage'));
const CreatePurchaseReturnPage = lazy(() => import('./pages/PurchaseReturns/CreatePurchaseReturnPage'));

const ReturnsPage = lazy(() => import('./pages/Returns/ReturnsPage'));
const ReturnOrderPage = lazy(() => import('./pages/Returns/ReturnOrderPage'));

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

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const darkMode = useAppStore(s => s.darkMode);

  // Apply dark mode class on mount
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

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
        {/* Trang chủ → chuyển về Dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Trang đăng nhập: chỉ cho phép nếu chưa login */}
        <Route path="/login" element={
          <GuestRoute>
            <Suspense fallback={<PageLoader />}><LoginPage /></Suspense>
          </GuestRoute>
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
    </ErrorBoundary>
  );
}

export default App;
