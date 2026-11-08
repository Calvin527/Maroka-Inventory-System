import { Link, useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Plus } from "lucide-react";
import { dashboardApi } from "../api/endpoints";
import type { Dashboard, OrderStatus } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { count, date, money, moneyCompact, statusLabel } from "../lib/format";
import { useAsync } from "../lib/hooks";
import { Empty, ErrorBanner, Loading, PageHeader, Panel, StatusBadge } from "../components/ui";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function DashboardPage() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useAsync(dashboardApi.get, []);
  const firstName = user?.fullName.split(" ")[0];
  const today = new Date().toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" });

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        subtitle={`Here's where the business stands on ${today}.`}
        actions={
          <Link to="/orders/new" className="btn btn-primary">
            <Plus size={16} /> New order
          </Link>
        }
      />
      {error && <ErrorBanner message={error} onRetry={reload} />}
      {loading && !data && <Loading label="Loading dashboard" />}
      {data && <DashboardBody d={data} />}
    </>
  );
}

function DashboardBody({ d }: { d: Dashboard }) {
  const navigate = useNavigate();

  return (
    <>
      <div className="attention">
        <ReorderPanel d={d} />
        <Panel title="Waiting on you">
          <div className="queue">
            <span className="big">{d.pendingOrders}</span>
            <p>{d.pendingOrders === 1 ? "order needs" : "orders need"} confirming before stock is set aside.</p>
            {(["CONFIRMED", "SHIPPED"] as OrderStatus[]).map((s) => (
              <div className="row" key={s}>
                <span>{statusLabel[s]}, not yet delivered</span>
                <strong>{d.ordersByStatus[s] ?? 0}</strong>
              </div>
            ))}
            <Link to="/orders?status=PENDING" className="btn" style={{ marginTop: 12 }}>
              Review pending orders
            </Link>
          </div>
        </Panel>
      </div>

      <section className="panel kpis" aria-label="Key figures">
        <div className="kpi">
          <div className="label">Revenue this month</div>
          <div className="value">{money(d.revenueThisMonth)}</div>
          <div className="note">
            {d.revenueLastMonth > 0 ? <>Last month {money(d.revenueLastMonth)}</> : "excl. VAT"}
          </div>
        </div>
        <div className="kpi">
          <div className="label">Orders this month</div>
          <div className="value">{count(d.ordersThisMonth)}</div>
          <div className="note">confirmed or later</div>
        </div>
        <div className="kpi">
          <div className="label">Stock value</div>
          <div className="value">{moneyCompact(d.totalStockValue)}</div>
          <div className="note">at cost price</div>
        </div>
        <div className="kpi">
          <div className="label">Active products</div>
          <div className="value">{count(d.totalProducts)}</div>
          <div className="note">{d.outOfStockCount} out of stock</div>
        </div>
        <div className="kpi">
          <div className="label">Customers</div>
          <div className="value">{count(d.totalCustomers)}</div>
          <div className="note">{d.totalSuppliers} suppliers</div>
        </div>
      </section>

      <div className="grid-2-1">
        <Panel title="Revenue by month" subtitle="Last six months, excluding VAT">
          <RevenueChart data={d.monthlySales} />
        </Panel>
        <Panel title="Orders by status" subtitle="All time">
          <HBars
            rows={Object.entries(d.ordersByStatus).map(([s, n]) => ({
              key: s,
              label: statusLabel[s as OrderStatus],
              value: n,
              display: count(n),
            }))}
          />
        </Panel>
      </div>

      <div className="grid-2-1">
        <Panel title="Recent orders" bodyClass="" action={<Link to="/orders" className="btn btn-sm">All orders</Link>}>
          <div className="table-wrap" style={{ marginTop: 12 }}>
            {d.recentOrders.length === 0 ? (
              <Empty title="No orders yet">Orders you capture will show up here.</Empty>
            ) : (
              <table className="data">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th className="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {d.recentOrders.map((o) => (
                    <tr key={o.id} className="clickable" onClick={() => navigate(`/orders/${o.id}`)}>
                      <td className="sku">{o.orderNumber}</td>
                      <td>{o.customerName}</td>
                      <td>{date(o.createdAt)}</td>
                      <td><StatusBadge status={o.status} /></td>
                      <td className="num">{money(o.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Panel>
        <Panel title="Best sellers" subtitle="Units sold, all time">
          {d.topProducts.length === 0 ? (
            <Empty title="No sales yet" />
          ) : (
            <HBars
              rows={d.topProducts.map((p) => ({
                key: String(p.productId),
                label: p.productName,
                value: p.quantitySold,
                display: count(p.quantitySold),
                title: `${p.productName}: ${count(p.quantitySold)} sold, ${money(p.revenue)} revenue`,
              }))}
            />
          )}
        </Panel>
      </div>
    </>
  );
}

function ReorderPanel({ d }: { d: Dashboard }) {
  const items = d.lowStockProducts;
  return (
    <Panel
      className="reorder"
      title={d.lowStockCount === 0 ? "Stock levels are healthy" : `${d.lowStockCount} ${d.lowStockCount === 1 ? "product needs" : "products need"} reordering`}
      subtitle={d.lowStockCount === 0 ? "Nothing is at or below its reorder level." : "At or below the reorder level, emptiest first"}
      action={
        d.lowStockCount > 0 && (
          <Link to="/products?stock=reorder" className="btn btn-sm">
            See all
          </Link>
        )
      }
    >
      {items.length > 0 && (
        <ul className="reorder-list">
          {items.map((p) => {
            const pct = Math.min(100, (p.quantity / Math.max(p.reorderLevel * 2, 1)) * 100);
            return (
              <li key={p.id}>
                <Link to={`/products/${p.id}`} className="name" style={{ color: "inherit" }}>
                  {p.name}
                  <small>{p.supplierName ?? "No supplier"}</small>
                </Link>
                <div
                  className={`level ${p.outOfStock ? "out" : ""}`}
                  role="img"
                  aria-label={`${p.quantity} on hand, reorder at ${p.reorderLevel}`}
                >
                  <span style={{ width: `${Math.max(pct, p.outOfStock ? 0 : 3)}%` }} />
                </div>
                <div className="level-text">
                  {p.outOfStock ? (
                    <strong style={{ color: "var(--danger)" }}>Out of stock</strong>
                  ) : (
                    <>
                      <strong>{p.quantity}</strong> left, reorder at {p.reorderLevel}
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function RevenueChart({ data }: { data: Dashboard["monthlySales"] }) {
  const rows = data.map((m, i) => ({ ...m, tipLabel: i === data.length - 1 ? moneyCompact(m.revenue) : undefined }));
  return (
    <div className="chart-box" role="img" aria-label={`Monthly revenue: ${data.map((m) => `${m.label} ${money(m.revenue)}`).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "var(--line)" }} tick={{ fill: "var(--steel)", fontSize: 13 }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={64}
            tick={{ fill: "var(--steel)", fontSize: 12.5 }}
            tickFormatter={(v: number) => moneyCompact(v)}
          />
          <Tooltip
            cursor={{ fill: "rgba(37, 99, 184, 0.06)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const m = payload[0].payload as Dashboard["monthlySales"][number];
              return (
                <div className="chart-tip">
                  <strong>{m.label}</strong>
                  {money(m.revenue)} from {m.orders} {m.orders === 1 ? "order" : "orders"}
                </div>
              );
            }}
          />
          <Bar dataKey="revenue" fill="var(--chart)" radius={[4, 4, 0, 0]} maxBarSize={24}>
            {/* Label only the current month; the axis and tooltip carry the rest. */}
            <LabelList dataKey="tipLabel" position="top" offset={8} fill="var(--ink)" fontSize={13} fontWeight={600} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Simple horizontal bars in plain HTML: one hue, value at the tip, label above. */
function HBars({ rows }: { rows: { key: string; label: string; value: number; display: string; title?: string }[] }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="hbars">
      {rows.map((r) => (
        <li key={r.key} title={r.title ?? `${r.label}: ${r.display}`}>
          <span>{r.label}</span>
          <span className="val">{r.display}</span>
          <div className="track">
            <div className="bar" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
