import { useEffect, useState, type FormEvent } from "react";
import { productApi, stockApi } from "../api/endpoints";
import { errorMessage } from "../api/client";
import type { MovementType, Product } from "../api/types";
import { Field, Modal } from "./ui";
import { useToast } from "./Toast";

const TYPES: { value: MovementType; label: string; help: string }[] = [
  { value: "IN", label: "Stock in", help: "A delivery or return. Enter how many units arrived." },
  { value: "OUT", label: "Stock out", help: "Damaged, expired or used internally. Enter how many units left." },
  { value: "ADJUSTMENT", label: "Stock take", help: "Enter the number you counted on the shelf; the difference is recorded." },
];

/** Records stock in/out or a stock-take. Pass `product` to lock the form to one product. */
export function StockMovementForm({ product, onClose, onSaved }: { product?: Product; onClose: () => void; onSaved: () => void }) {
  const notify = useToast();
  const [products, setProducts] = useState<Product[]>(product ? [product] : []);
  const [productId, setProductId] = useState(product?.id.toString() ?? "");
  const [type, setType] = useState<MovementType>("IN");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (product) return;
    productApi.search({ active: true, size: 1000, sort: "name,asc" }).then((p) => setProducts(p.content)).catch(() => {});
  }, [product]);

  const selected = products.find((p) => p.id === Number(productId));
  const qty = Number(quantity);
  const preview =
    selected && quantity !== ""
      ? type === "IN"
        ? selected.quantity + qty
        : type === "OUT"
          ? selected.quantity - qty
          : qty
      : null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await stockApi.record({ productId: Number(productId), type, quantity: qty, reason, reference });
      notify("Stock movement recorded");
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Record stock movement"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" type="submit" form="stock-form" disabled={busy || !productId}>
            {busy ? <span className="spinner" /> : "Record movement"}
          </button>
        </>
      }
    >
      {error && <div className="banner banner-error">{error}</div>}
      <form id="stock-form" onSubmit={submit} style={{ display: "grid", gap: 14 }}>
        {!product && (
          <Field label="Product">
            <select className="select" value={productId} onChange={(e) => setProductId(e.target.value)} required>
              <option value="">Choose a product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}), {p.quantity} on hand
                </option>
              ))}
            </select>
          </Field>
        )}
        <div className="segmented" role="group" aria-label="Movement type">
          {TYPES.map((t) => (
            <button key={t.value} type="button" aria-pressed={type === t.value} onClick={() => setType(t.value)}>
              {t.label}
            </button>
          ))}
        </div>
        <Field
          label={type === "ADJUSTMENT" ? "Counted quantity" : "Quantity"}
          hint={
            preview !== null && selected
              ? `${TYPES.find((t) => t.value === type)!.help} Stock goes from ${selected.quantity} to ${preview}.`
              : TYPES.find((t) => t.value === type)!.help
          }
          error={preview !== null && preview < 0 ? `Only ${selected?.quantity} on hand.` : undefined}
        >
          <input className="input" type="number" min={type === "ADJUSTMENT" ? 0 : 1} step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
        </Field>
        <Field label="Reason" hint="Optional, e.g. supplier delivery, water damage">
          <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={255} />
        </Field>
        <Field label="Reference" hint="Optional, e.g. delivery note or invoice number">
          <input className="input" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={100} />
        </Field>
      </form>
    </Modal>
  );
}
