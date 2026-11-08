import { lazy, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { Layout } from "./components/Layout";
import { Loading } from "./components/ui";
import { LoginPage } from "./pages/LoginPage";

// Pages load on demand so the login screen stays fast.
const DashboardPage = lazy(() => import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const ProductsPage = lazy(() => import("./pages/ProductsPage").then((m) => ({ default: m.ProductsPage })));
const ProductDetailPage = lazy(() => import("./pages/ProductDetailPage").then((m) => ({ default: m.ProductDetailPage })));
const StockMovementsPage = lazy(() => import("./pages/StockMovementsPage").then((m) => ({ default: m.StockMovementsPage })));
const CategoriesPage = lazy(() => import("./pages/CategoriesPage").then((m) => ({ default: m.CategoriesPage })));
const OrdersPage = lazy(() => import("./pages/OrdersPage").then((m) => ({ default: m.OrdersPage })));
const NewOrderPage = lazy(() => import("./pages/NewOrderPage").then((m) => ({ default: m.NewOrderPage })));
const OrderDetailPage = lazy(() => import("./pages/OrderDetailPage").then((m) => ({ default: m.OrderDetailPage })));
const CustomersPage = lazy(() => import("./pages/CustomersPage").then((m) => ({ default: m.CustomersPage })));
const SuppliersPage = lazy(() => import("./pages/SuppliersPage").then((m) => ({ default: m.SuppliersPage })));
const ReportsPage = lazy(() => import("./pages/ReportsPage").then((m) => ({ default: m.ReportsPage })));
const UsersPage = lazy(() => import("./pages/UsersPage").then((m) => ({ default: m.UsersPage })));

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, checking } = useAuth();
  const location = useLocation();
  if (checking) return <Loading label="Signing you in" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

function RequireRole({ allowed, children }: { allowed: boolean; children: ReactNode }) {
  return allowed ? children : <Navigate to="/" replace />;
}

export function App() {
  const { canManage, isAdmin } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/:id" element={<ProductDetailPage />} />
        <Route path="stock" element={<StockMovementsPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/new" element={<NewOrderPage />} />
        <Route path="orders/:id" element={<OrderDetailPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="suppliers" element={<SuppliersPage />} />
        <Route path="reports" element={<RequireRole allowed={canManage}><ReportsPage /></RequireRole>} />
        <Route path="users" element={<RequireRole allowed={isAdmin}><UsersPage /></RequireRole>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
