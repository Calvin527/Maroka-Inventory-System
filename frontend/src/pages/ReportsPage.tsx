import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download } from "lucide-react";
import { downloadFile, errorMessage } from "../api/client";
import { reportApi } from "../api/endpoints";
import type { SalesSummary } from "../api/types";
import { count, date, isoDate, money, moneyCompact } from "../lib/format";
import { useAsync } from "../lib/hooks";
import { Empty, ErrorBanner, Field, Loading, PageHeader, Panel } from "../components/ui";
import { useToast } from "../components/Toast";

type Preset = "this-month" | "last-month" | "last-30" | "this-year";

function presetRange(p: Preset): [string, string] {
  const now = new Date();
  switch (p) {
    case "this-month":
      return [isoDate(new Date(now.getFullYear(), now.getMonth(), 1)), isoDate(now)];
    case "last-month":
      return [isoDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)), isoDate(new Date(now.getFullYear(), now.getMonth(), 0))];
    case "last-30":
      return [isoDate(new Date(now.getTime() - 29 * 86400000)), isoDate(now)];
    case "this-year":
      return [isoDate(new Date(now.getFullYear(), 0, 1)), isoDate(now)];
  }
}

const PRESETS: { value: Preset; label: string }[] = [
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "last-30", label: "Last 30 days" },
  { value: "this-year", label: "This year" },
];

export function ReportsPage() {
  const notify = useToast();
  const [preset, setPreset] = useState<Preset | null>("this-month");
  const [[from, to], setRange] = useState(presetRange("this-month"));
  const { data, error, loading, reload } = useAsync(() => reportApi.salesSummary(from, to), [from, to]);

  function choose(p: Preset) {
    setPreset(p);
    setRange(presetRange(p));
  }

  async function download(url: string, name: string) {
    try {
      await downloadFile(url, name);
    } catch (e) {
      notify(errorMessage(e), "error");
    }
  }

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Sales performance and stock exports. Sales count confirmed, shipped and delivered orders."
      />

      <Panel title="Downloads" subtitle="CSV files that open in Excel or Google Sheets" className="no-print">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn" onClick={() => download("/reports/inventory.csv", "inventory.csv")}>
            <Download size={16} /> Full stock list
          </button>
          <button className="btn" onClick={() => download("/reports/low-stock.csv", "low-stock.csv")}>
            <Download size={16} /> Reorder list with supplier contacts
          </button>
          <button className="btn" onClick={() => download(`/reports/sales.csv?from=${from}&to=${to}`, "sales.csv")}>
            <Download size={16} /> Orders for the selected dates
          </button>
        </div>
      </Panel>

      <div className="toolbar" style={{ marginTop: 18, alignItems: "flex-end" }}>
        <div className="segmented" role="group" aria-label="Date range">
          {PRESETS.map((p) => (
            <button key={p.value} aria-pressed={preset === p.value} onClick={() => choose(p.value)}>
              {p.label}
            </button>
          ))}
        </div>
        <Field label="From">
          <input className="input" type="date" value={from} max={to} onChange={(e) => { setPreset(null); setRange([e.target.value, to]); }} />
        </Field>
        <Field label="To">
          <input className="input" type="date" value={to} min={from} onChange={(e) => { setPreset(null); setRange([from, e.target.value]); }} />
        </Field>
      </div>

      {error && <ErrorBanner message={error} onRetry={reload} />}
      {loading && !data ? <Loading label="Building report" /> : data && <SalesReport s={data} />}
    </>
  );
}

function SalesReport({ s }: { s: SalesSummary }) {
  return (
    <>
      <section className="panel kpis" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        <div className="kpi">
          <div className="label">Revenue</div>
          <div className="value">{money(s.revenue)}</div>
          <div className="note">excl. VAT</div>
        </div>
        <div className="kpi">
          <div className="label">Orders</div>
          <div className="value">{count(s.orderCount)}</div>
          <div className="note">{date(s.from)} to {date(s.to)}</div>
        </div>
        <div className="kpi">
          <div className="label">Average order</div>
          <div className="value">{money(s.averageOrderValue)}</div>
          <div className="note">excl. VAT</div>
        </div>
        <div className="kpi">
          <div className="label">VAT collected</div>
          <div className="value">{money(s.taxCollected)}</div>
          <div className="note">{money(s.grossTotal)} incl. VAT</div>
        </div>
      </section>

      {s.orderCount === 0 ? (
        <section className="panel">
          <Empty title="No sales in this period">Pick a wider date range, or confirm pending orders to count them as sales.</Empty>
        </section>
      ) : (
        <>
          <Panel title="Revenue by day" subtitle="Excluding VAT">
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={s.daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--grid)" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={{ stroke: "var(--line)" }}
                    tick={{ fill: "var(--steel)", fontSize: 12 }}
                    tickFormatter={(d: string) => new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
                    minTickGap={24}
                  />
                  <YAxis tickLine={false} axisLine={false} width={64} tick={{ fill: "var(--steel)", fontSize: 12.5 }} tickFormatter={(v: number) => moneyCompact(v)} />
                  <Tooltip
                    cursor={{ fill: "rgba(37, 99, 184, 0.06)" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as SalesSummary["daily"][number];
                      return (
                        <div className="chart-tip">
                          <strong>{date(d.date)}</strong>
                          {money(d.revenue)} from {d.orders} {d.orders === 1 ? "order" : "orders"}
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="revenue" fill="var(--chart)" radius={[4, 4, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <div className="grid-1-1" style={{ marginTop: 18 }}>
            <Panel title="Top products" bodyClass="">
              <div className="table-wrap" style={{ marginTop: 12 }}>
                <table className="data">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th className="num">Units</th>
                      <th className="num">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.topProducts.map((p) => (
                      <tr key={p.productId}>
                        <td>{p.productName}</td>
                        <td className="num">{count(p.quantitySold)}</td>
                        <td className="num">{money(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
            <Panel title="Top customers" bodyClass="">
              <div className="table-wrap" style={{ marginTop: 12 }}>
                <table className="data">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th className="num">Orders</th>
                      <th className="num">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.topCustomers.map((c) => (
                      <tr key={c.customerId}>
                        <td>{c.customerName}</td>
                        <td className="num">{count(c.orders)}</td>
                        <td className="num">{money(c.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
