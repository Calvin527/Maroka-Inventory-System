import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Search, X } from "lucide-react";
import { orderApi } from "../api/endpoints";
import type { OrderStatus } from "../api/types";
import { count, dateTime, money, statusLabel } from "../lib/format";
import { useAsync, useDebounce } from "../lib/hooks";
import { Empty, ErrorBanner, Loading, PageHeader, Pagination, StatusBadge } from "../components/ui";

const STATUSES: ("" | OrderStatus)[] = ["", "PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];

export function OrdersPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const status = (params.get("status") ?? "") as "" | OrderStatus;
  const customerId = params.get("customerId") ? Number(params.get("customerId")) : undefined;
  const customerName = params.get("customer");

  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const search = useDebounce(q);
  useEffect(() => setPage(0), [search, status, customerId]);

  const { data, error, loading, reload } = useAsync(
    () => orderApi.search({ status: status || undefined, customerId, q: search, page, size: 20 }),
    [status, customerId, search, page],
  );

  function setStatus(s: "" | OrderStatus) {
    const next = new URLSearchParams(params);
    if (s) next.set("status", s);
    else next.delete("status");
    setParams(next, { replace: true });
  }

  function clearCustomer() {
    const next = new URLSearchParams(params);
    next.delete("customerId");
    next.delete("customer");
    setParams(next, { replace: true });
  }

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle={data ? `${count(data.totalElements)} ${data.totalElements === 1 ? "order" : "orders"}` : "Customer orders"}
        actions={
          <Link to="/orders/new" className="btn btn-primary">
            <Plus size={16} /> New order
          </Link>
        }
      />

      <div className="toolbar">
        <div className="segmented" role="group" aria-label="Filter by status">
          {STATUSES.map((s) => (
            <button key={s || "all"} aria-pressed={status === s} onClick={() => setStatus(s)}>
              {s ? statusLabel[s] : "All"}
            </button>
          ))}
        </div>
        <div className="search">
          <Search size={16} />
          <input className="input" placeholder="Order number or customer" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search orders" />
        </div>
        {customerId && (
          <button className="btn btn-sm" onClick={clearCustomer}>
            Customer: {customerName ?? customerId} <X size={14} />
          </button>
        )}
      </div>

      {error && <ErrorBanner message={error} onRetry={reload} />}
      <section className="panel">
        {loading && !data ? (
          <Loading label="Loading orders" />
        ) : data && data.content.length === 0 ? (
          <Empty
            title="No orders found"
            action={
              <Link to="/orders/new" className="btn btn-primary">
                <Plus size={16} /> Capture an order
              </Link>
            }
          >
            {status || search ? "Nothing matches these filters." : "Orders you capture will appear here."}
          </Empty>
        ) : (
          data && (
            <>
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Placed</th>
                      <th>Status</th>
                      <th className="num">Total (incl. VAT)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.content.map((o) => (
                      <tr key={o.id} className="clickable" onClick={() => navigate(`/orders/${o.id}`)}>
                        <td className="sku">{o.orderNumber}</td>
                        <td>{o.customerName}</td>
                        <td>{dateTime(o.createdAt)}</td>
                        <td><StatusBadge status={o.status} /></td>
                        <td className="num">{money(o.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={data} onPage={setPage} />
            </>
          )
        )}
      </section>
    </>
  );
}
