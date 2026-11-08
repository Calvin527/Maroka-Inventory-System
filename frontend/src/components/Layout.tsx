import { Suspense, useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ShieldCheck,
  ShoppingCart,
  Tags,
  Truck,
  Users,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { authApi, productApi } from "../api/endpoints";
import { roleLabel } from "../lib/format";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { Loading } from "./ui";

export function Logo({ size = 28 }: { size?: number }) {
  return (
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="6" fill="#ffffff" fillOpacity="0.08" />
        <path d="M8 12l8-4 8 4v9l-8 4-8-4z M8 12l8 4 8-4 M16 16v9" fill="none" stroke="#f2b300" strokeWidth="2.2" strokeLinejoin="round" />
      </svg>
  );
}

export function Layout() {
  const { user, logout, canManage, isAdmin } = useAuth();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [lowStock, setLowStock] = useState(0);
  const [demoReset, setDemoReset] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Refresh the reorder count whenever the user moves between pages.
  useEffect(() => {
    setNavOpen(false);
    productApi.lowStock().then((p) => setLowStock(p.length)).catch(() => {});
  }, [location.pathname]);

  // In the demo version, remind visitors that this is sample data.
  useEffect(() => {
    authApi.demo().then((d) => setDemoReset(d.enabled ? d.resetTime ?? "" : null)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const initials = user?.fullName.split(" ").map((p) => p[0]).slice(0, 2).join("") ?? "";

  return (
      <div className={`shell ${navOpen ? "nav-open" : ""}`}>
        <aside className="sidebar" aria-label="Main navigation">
          <div className="brand">
            <Logo />
            {/* Two-line name so it fits the narrow sidebar neatly. */}
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.05 }}>
            <span style={{ fontFamily: "var(--font)", fontSize: 13, fontWeight: 600, color: "#8ea3bd" }}>Maroka</span>
            Smart Inventory
          </span>
          </div>
          <nav className="nav">
            <NavLink to="/" end>
              <LayoutDashboard size={18} /> Dashboard
            </NavLink>

            <div className="nav-group">Stock</div>
            <NavLink to="/products">
              <Package size={18} /> Products
              {lowStock > 0 && <span className="count" aria-label={`${lowStock} need reordering`}>{lowStock}</span>}
            </NavLink>
            <NavLink to="/stock">
              <ArrowLeftRight size={18} /> Stock movements
            </NavLink>
            <NavLink to="/categories">
              <Tags size={18} /> Categories
            </NavLink>

            <div className="nav-group">Sales</div>
            <NavLink to="/orders">
              <ShoppingCart size={18} /> Orders
            </NavLink>
            <NavLink to="/customers">
              <Users size={18} /> Customers
            </NavLink>
            <NavLink to="/suppliers">
              <Truck size={18} /> Suppliers
            </NavLink>

            {(canManage || isAdmin) && <div className="nav-group">Admin</div>}
            {canManage && (
                <NavLink to="/reports">
                  <BarChart3 size={18} /> Reports
                </NavLink>
            )}
            {isAdmin && (
                <NavLink to="/users">
                  <ShieldCheck size={18} /> Users
                </NavLink>
            )}
          </nav>
          <div className="sidebar-foot">Prices in ZAR, VAT at 15%</div>
        </aside>

        <div className="main">
          <header className="topbar">
            <button className="icon-btn menu-btn" onClick={() => setNavOpen((o) => !o)} aria-label="Open menu">
              <Menu size={20} />
            </button>
            {demoReset !== null && (
                <span className="badge badge-low" title={`Sample data that resets every night${demoReset ? ` at ${demoReset}` : ""}`}>
              Demo version
            </span>
            )}
            <div className="spacer" />
            {lowStock > 0 && (
                <Link to="/products?stock=reorder" className="alert-pill">
              <span className="tape">
                <AlertTriangle size={14} />
              </span>
                  {lowStock} <span className="label">to reorder</span>
                </Link>
            )}
            <div className="user-menu" ref={menuRef}>
              <button className="user-btn" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} aria-haspopup="menu">
                <span className="avatar">{initials}</span>
                <span className="who">
                {user?.fullName}
                  <small>{user && roleLabel[user.role]}</small>
              </span>
              </button>
              {menuOpen && (
                  <div className="dropdown" role="menu">
                    <button role="menuitem" onClick={() => { setMenuOpen(false); setPasswordOpen(true); }}>
                      <KeyRound size={16} /> Change password
                    </button>
                    <button role="menuitem" onClick={logout}>
                      <LogOut size={16} /> Log out
                    </button>
                  </div>
              )}
            </div>
          </header>

          <main className="content">
            <Suspense fallback={<Loading />}>
              <Outlet />
            </Suspense>
          </main>
        </div>

        {passwordOpen && <ChangePasswordModal onClose={() => setPasswordOpen(false)} />}
      </div>
  );
}