import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Plus, Trash2 } from "lucide-react";
import { customerApi, orderApi, productApi } from "../api/endpoints";
import { errorMessage } from "../api/client";
import type { Customer, Product } from "../api/types";
import { money } from "../lib/format";
import { Field, Loading, PageHeader, Panel } from "../components/ui";
import { useToast } from "../components/Toast";

const VAT_RATE = 0.15;

interface Line {
  key: number;
  productId: string;
  quantity: string;
}

let nextKey = 1;
const newLine = (): Line => ({ key: nextKey++, productId: "", quantity: "1" });

export function NewOrderPage() {
  const navigate = useNavigate();
  const notify = useToast();
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    customerApi.search({ size: 1000, sort: "name,asc" }).then((p) => setCustomers(p.content)).catch((e) => setError(errorMessage(e)));
    productApi.search({ active: true, size: 1000, sort: "name,asc" }).then((p) => setProducts(p.content)).catch((e) => setError(errorMessage(e)));
  }, []);

  const byId = useMemo(() => new Map((products ?? []).map((p) => [p.id, p])), [products]);

  // Total requested per product across lines, to warn before the server rejects it.
  const requested = useMemo(() => {
    const m = new Map<number, number>();
    for (const l of lines) {
      if (l.productId) m.set(Number(l.productId), (m.get(Number(l.productId)) ?? 0) + (Number(l.quantity) || 0));
    }
    return m;
  }, [lines]);

  const subtotal = lines.reduce((sum, l) => {
    const p = byId.get(Number(l.productId));
    return p ? sum + p.sellingPrice * (Number(l.quantity) || 0) : sum;
  }, 0);
  const vat = Math.round(subtotal * VAT_RATE * 100) / 100;
  const overStock = [...requested.entries()].some(([id, qty]) => qty > (byId.get(id)?.quantity ?? 0));
  const validLines = lines.filter((l) => l.productId && Number(l.quantity) > 0);

  const update = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const order = await orderApi.create({
        customerId: Number(customerId),
        items: validLines.map((l) => ({ productId: Number(l.productId), quantity: Number(l.quantity) })),
        notes,
      });
      notify(`Order ${order.orderNumber} created`);
      navigate(`/orders/${order.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  const back = (
    <Link to="/orders" className="back-link">
      <ChevronLeft size={16} /> Orders
    </Link>
  );

  if (!customers || !products) {
    return (
      <>
        <PageHeader back={back} title="New order" />
        {error ? <div className="banner banner-error">{error}</div> : <Loading />}
      </>
    );
  }

  return (
    <form onSubmit={submit}>
      <PageHeader
        back={back}
        title="New order"
        subtitle="The order starts as pending. Stock is only deducted once you confirm it."
      />
      {error && <div className="banner banner-error" role="alert">{error}</div>}

      <div className="grid-2-1">
        <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
          <Panel title="Customer">
            {customers.length === 0 ? (
              <p style={{ margin: 0 }}>
                You need a customer first. <Link to="/customers">Add a customer</Link>
              </p>
            ) : (
              <Field label="Who is this order for?">
                <select className="select" value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
                  <option value="">Choose a customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
            )}
          </Panel>

          <Panel title="Items">
            <div className="line-items">
              {lines.map((l) => {
                const p = byId.get(Number(l.productId));
                const totalRequested = p ? requested.get(p.id) ?? 0 : 0;
                const short = p && totalRequested > p.quantity;
                return (
                  <div key={l.key}>
                    <div className="line-item">
                      <select
                        className="select"
                        value={l.productId}
                        onChange={(e) => update(l.key, { productId: e.target.value })}
                        aria-label="Product"
                      >
                        <option value="">Choose a product</option>
                        {products.map((prod) => (
                          <option key={prod.id} value={prod.id} disabled={prod.quantity === 0}>
                            {prod.name} ({prod.quantity} in stock)
                          </option>
                        ))}
                      </select>
                      <input
                        className="input"
                        type="number"
                        min={1}
                        step={1}
                        value={l.quantity}
                        onChange={(e) => update(l.key, { quantity: e.target.value })}
                        aria-label="Quantity"
                        aria-invalid={short || undefined}
                      />
                      <div className="amount">{p ? money(p.sellingPrice * (Number(l.quantity) || 0)) : ""}</div>
                      <button
                        type="button"
                        className="icon-btn danger"
                        style={{ height: 38, width: 38 }}
                        onClick={() => setLines((ls) => (ls.length === 1 ? [newLine()] : ls.filter((x) => x.key !== l.key)))}
                        aria-label="Remove line"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {p && (
                      <div className={short ? "warn-text" : "field hint"} style={{ marginTop: 4, fontSize: 12.5, color: short ? undefined : "var(--steel)" }}>
                        {short
                          ? `Only ${p.quantity} ${p.unit} in stock`
                          : `${money(p.sellingPrice)} per ${p.unit}`}
                      </div>
                    )}
                  </div>
                );
              })}
              <button type="button" className="btn" style={{ justifySelf: "start" }} onClick={() => setLines((ls) => [...ls, newLine()])}>
                <Plus size={16} /> Add another product
              </button>
            </div>
          </Panel>

          <Panel title="Notes">
            <Field label="Delivery instructions or anything the team should know" hint="Optional">
              <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
            </Field>
          </Panel>
        </div>

        <Panel title="Summary" className="" bodyClass="panel-body">
          <div className="totals" style={{ width: "100%" }}>
            <div className="row">
              <span>Items</span>
              <span>{validLines.reduce((n, l) => n + Number(l.quantity), 0)}</span>
            </div>
            <div className="row">
              <span>Subtotal</span>
              <span>{money(subtotal)}</span>
            </div>
            <div className="row">
              <span>VAT (15%)</span>
              <span>{money(vat)}</span>
            </div>
            <div className="row grand">
              <span>Total</span>
              <span>{money(subtotal + vat)}</span>
            </div>
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: 18, height: 42 }}
            disabled={busy || !customerId || validLines.length === 0 || overStock}
          >
            {busy ? <span className="spinner" /> : "Create order"}
          </button>
          {overStock && <p className="warn-text" style={{ marginTop: 8 }}>Reduce the quantities marked in red to continue.</p>}
        </Panel>
      </div>
    </form>
  );
}
