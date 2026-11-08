import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Printer, Trash2 } from "lucide-react";
import { orderApi } from "../api/endpoints";
import { errorMessage } from "../api/client";
import type { Order, OrderStatus } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { count, dateTime, money, statusLabel } from "../lib/format";
import { useAsync } from "../lib/hooks";
import { ConfirmDialog, ErrorBanner, Loading, PageHeader, Panel, StatusBadge } from "../components/ui";
import { useToast } from "../components/Toast";

const FLOW: OrderStatus[] = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED"];

/** The next step(s) available from each status, with plain-language labels. */
const ACTIONS: Record<OrderStatus, { to: OrderStatus; label: string; primary?: boolean }[]> = {
  PENDING: [
    { to: "CONFIRMED", label: "Confirm order", primary: true },
    { to: "CANCELLED", label: "Cancel order" },
  ],
  CONFIRMED: [
    { to: "SHIPPED", label: "Mark as shipped", primary: true },
    { to: "CANCELLED", label: "Cancel order" },
  ],
  SHIPPED: [{ to: "DELIVERED", label: "Mark as delivered", primary: true }],
  DELIVERED: [],
  CANCELLED: [],
};

const DONE_MESSAGE: Record<OrderStatus, string> = {
  PENDING: "Order is pending",
  CONFIRMED: "Order confirmed and stock deducted",
  SHIPPED: "Order marked as shipped",
  DELIVERED: "Order marked as delivered",
  CANCELLED: "Order cancelled",
};

export function OrderDetailPage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const notify = useToast();
  const { canManage } = useAuth();
  const { data: order, error, reload, setData } = useAsync(() => orderApi.get(id), [id]);
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const back = (
      <Link to="/orders" className="back-link no-print">
        <ChevronLeft size={16} /> Orders
      </Link>
  );

  if (error) return <>{back}<ErrorBanner message={error} onRetry={reload} /></>;
  if (!order) return <Loading label="Loading order" />;

  async function move(to: OrderStatus) {
    setBusy(true);
    try {
      const updated = await orderApi.setStatus(id, to);
      setData(updated);
      notify(DONE_MESSAGE[to]);
      setConfirmCancel(false);
    } catch (e) {
      notify(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await orderApi.remove(id);
      notify(`Order ${order!.orderNumber} deleted`);
      navigate("/orders");
    } catch (e) {
      notify(errorMessage(e), "error");
      setBusy(false);
    }
  }

  const canDelete = canManage && (order.status === "PENDING" || order.status === "CANCELLED");

  // Only managers and admins may confirm (the backend enforces this too); staff don't see the button.
  const actions = ACTIONS[order.status].filter((a) => a.to !== "CONFIRMED" || canManage);
  const awaitingManager = order.status === "PENDING" && !canManage;

  return (
      <>
        <PageHeader
            back={back}
            title={`Order ${order.orderNumber}`}
            subtitle={
              <>
                <StatusBadge status={order.status} /> Placed {dateTime(order.createdAt)}
                {order.createdBy && <> by {order.createdBy}</>}
              </>
            }
            actions={
              <>
                {actions.map((a) => (
                    <button
                        key={a.to}
                        className={`btn ${a.primary ? "btn-primary" : a.to === "CANCELLED" ? "btn-danger" : ""}`}
                        disabled={busy}
                        onClick={() => (a.to === "CANCELLED" ? setConfirmCancel(true) : move(a.to))}
                    >
                      {a.label}
                    </button>
                ))}
                <button className="btn" onClick={() => window.print()}>
                  <Printer size={16} /> Print
                </button>
                {canDelete && (
                    <button className="icon-btn danger" style={{ height: 38, width: 38 }} onClick={() => setConfirmDelete(true)} aria-label="Delete order">
                      <Trash2 size={16} />
                    </button>
                )}
              </>
            }
        />

        {awaitingManager && (
            <div className="banner banner-info no-print">
              A manager needs to confirm this order before stock is set aside. You can still cancel it if the customer
              changes their mind.
            </div>
        )}

        <Panel className="no-print" bodyClass="panel-body">
          <Progress order={order} />
        </Panel>

        <div className="grid-2-1" style={{ marginTop: 18 }}>
          <Panel title="Items" bodyClass="">
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table className="data">
                <thead>
                <tr>
                  <th>Product</th>
                  <th className="num">Qty</th>
                  <th className="num">Unit price</th>
                  <th className="num">Line total</th>
                </tr>
                </thead>
                <tbody>
                {order.items.map((i) => (
                    <tr key={i.id}>
                      <td>
                        <Link to={`/products/${i.productId}`}>{i.productName}</Link>
                        <span className="sub sku">{i.productSku}</span>
                      </td>
                      <td className="num">{count(i.quantity)}</td>
                      <td className="num">{money(i.unitPrice)}</td>
                      <td className="num">{money(i.lineTotal)}</td>
                    </tr>
                ))}
                </tbody>
              </table>
            </div>
            <div className="panel-body">
              <div className="totals">
                <div className="row"><span>Subtotal</span><span>{money(order.subtotal)}</span></div>
                <div className="row"><span>VAT (15%)</span><span>{money(order.taxAmount)}</span></div>
                <div className="row grand"><span>Total</span><span>{money(order.total)}</span></div>
              </div>
            </div>
          </Panel>

          <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
            <Panel title="Customer">
              <dl className="info-list">
                <dt>Name</dt>
                <dd>{order.customerName}</dd>
                <dt>Email</dt>
                <dd>{order.customerEmail ?? "Not given"}</dd>
                <dt>Phone</dt>
                <dd>{order.customerPhone ?? "Not given"}</dd>
              </dl>
              <Link
                  className="btn btn-sm no-print"
                  style={{ marginTop: 14 }}
                  to={`/orders?customerId=${order.customerId}&customer=${encodeURIComponent(order.customerName)}`}
              >
                Other orders from this customer
              </Link>
            </Panel>
            {order.notes && (
                <Panel title="Notes">
                  <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{order.notes}</p>
                </Panel>
            )}
          </div>
        </div>

        {confirmCancel && (
            <ConfirmDialog
                title={`Cancel order ${order.orderNumber}?`}
                message={
                  order.status === "CONFIRMED"
                      ? "The items on this order will be returned to stock. This can't be undone."
                      : "The order will be marked as cancelled. This can't be undone."
                }
                confirmLabel="Cancel order"
                busy={busy}
                onConfirm={() => move("CANCELLED")}
                onCancel={() => setConfirmCancel(false)}
            />
        )}
        {confirmDelete && (
            <ConfirmDialog
                title={`Delete order ${order.orderNumber}?`}
                message="The order will be removed permanently and won't appear in reports."
                confirmLabel="Delete order"
                busy={busy}
                onConfirm={remove}
                onCancel={() => setConfirmDelete(false)}
            />
        )}
      </>
  );
}

function Progress({ order }: { order: Order }) {
  if (order.status === "CANCELLED") {
    return <p style={{ margin: 0, color: "var(--steel)" }}>This order was cancelled. If stock had been deducted for it, that stock was returned.</p>;
  }
  // A delivered order shows every step as done.
  const current = order.status === "DELIVERED" ? FLOW.length : FLOW.indexOf(order.status);
  return (
      <ol className="steps" aria-label="Order progress">
        {FLOW.map((s, i) => (
            <li key={s} className={i < current ? "done" : i === current ? "current" : ""} aria-current={i === current ? "step" : undefined}>
              {statusLabel[s]}
            </li>
        ))}
      </ol>
  );
}