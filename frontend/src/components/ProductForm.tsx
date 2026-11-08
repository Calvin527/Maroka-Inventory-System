import { useEffect, useState, type FormEvent } from "react";
import { categoryApi, productApi, supplierApi } from "../api/endpoints";
import { errorMessage, fieldErrors } from "../api/client";
import type { Category, Product, ProductInput, Supplier } from "../api/types";
import { money } from "../lib/format";
import { Field, Modal } from "./ui";
import { useToast } from "./Toast";

/** Create or edit a product. Quantity is only set here when creating (as opening stock). */
export function ProductForm({ product, onClose, onSaved }: { product?: Product; onClose: () => void; onSaved: (p: Product) => void }) {
  const notify = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [form, setForm] = useState({
    sku: product?.sku ?? "",
    name: product?.name ?? "",
    description: product?.description ?? "",
    categoryId: product?.categoryId?.toString() ?? "",
    supplierId: product?.supplierId?.toString() ?? "",
    costPrice: product?.costPrice?.toString() ?? "",
    sellingPrice: product?.sellingPrice?.toString() ?? "",
    openingQuantity: "0",
    reorderLevel: product?.reorderLevel?.toString() ?? "10",
    unit: product?.unit ?? "unit",
    active: product?.active ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    categoryApi.list().then(setCategories).catch(() => {});
    supplierApi.list().then(setSuppliers).catch(() => {});
  }, []);

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const cost = Number(form.costPrice);
  const sell = Number(form.sellingPrice);
  const margin = cost > 0 && sell > 0 ? ((sell - cost) / sell) * 100 : null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setErrors({});
    const body: ProductInput = {
      sku: form.sku,
      name: form.name,
      description: form.description,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      supplierId: form.supplierId ? Number(form.supplierId) : null,
      costPrice: cost,
      sellingPrice: sell,
      reorderLevel: Number(form.reorderLevel),
      unit: form.unit,
      active: form.active,
      ...(product ? {} : { openingQuantity: Number(form.openingQuantity) || 0 }),
    };
    try {
      const saved = product ? await productApi.update(product.id, body) : await productApi.create(body);
      notify(product ? "Product saved" : "Product added");
      onSaved(saved);
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={product ? `Edit ${product.name}` : "Add product"}
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" type="submit" form="product-form" disabled={busy}>
            {busy ? <span className="spinner" /> : product ? "Save product" : "Add product"}
          </button>
        </>
      }
    >
      {error && <div className="banner banner-error">{error}</div>}
      <form id="product-form" className="form-grid" onSubmit={submit}>
        <Field label="SKU" error={errors.sku} hint="Your stock code, e.g. BM-CEM-50">
          <input className="input" value={form.sku} onChange={set("sku")} required maxLength={50} />
        </Field>
        <Field label="Name" error={errors.name}>
          <input className="input" value={form.name} onChange={set("name")} required maxLength={150} />
        </Field>
        <Field label="Category" error={errors.categoryId}>
          <select className="select" value={form.categoryId} onChange={set("categoryId")}>
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Supplier" error={errors.supplierId}>
          <select className="select" value={form.supplierId} onChange={set("supplierId")}>
            <option value="">No supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Cost price (R)" error={errors.costPrice}>
          <input className="input" type="number" min="0" step="0.01" value={form.costPrice} onChange={set("costPrice")} required />
        </Field>
        <Field
          label="Selling price (R, excl. VAT)"
          error={errors.sellingPrice}
          hint={margin === null ? undefined : `Margin ${margin.toFixed(1)}% (${money(sell - cost)} per ${form.unit || "unit"})`}
        >
          <input className="input" type="number" min="0" step="0.01" value={form.sellingPrice} onChange={set("sellingPrice")} required />
        </Field>
        {!product && (
          <Field label="Opening stock" error={errors.openingQuantity} hint="Recorded as the first stock movement">
            <input className="input" type="number" min="0" step="1" value={form.openingQuantity} onChange={set("openingQuantity")} />
          </Field>
        )}
        <Field label="Reorder level" error={errors.reorderLevel} hint="Alert when stock falls to this number">
          <input className="input" type="number" min="0" step="1" value={form.reorderLevel} onChange={set("reorderLevel")} required />
        </Field>
        <Field label="Unit" error={errors.unit} hint="bag, box, length, litre…">
          <input className="input" value={form.unit} onChange={set("unit")} maxLength={20} />
        </Field>
        <Field label="Description" error={errors.description} className="span-2">
          <textarea className="textarea" value={form.description} onChange={set("description")} maxLength={1000} />
        </Field>
        {product && (
          <label className="check span-2">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
            Active (archived products are hidden from new orders)
          </label>
        )}
      </form>
    </Modal>
  );
}
