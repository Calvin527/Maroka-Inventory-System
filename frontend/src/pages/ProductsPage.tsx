import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeftRight, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { categoryApi, productApi } from "../api/endpoints";
import { errorMessage } from "../api/client";
import type { Category, Product, StockStatus } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { count, money } from "../lib/format";
import { useAsync, useDebounce } from "../lib/hooks";
import { ConfirmDialog, Empty, ErrorBanner, Loading, PageHeader, Pagination, SortHeader, StockBadge } from "../components/ui";
import { ProductForm } from "../components/ProductForm";
import { StockMovementForm } from "../components/StockMovementForm";
import { useToast } from "../components/Toast";

const STOCK_FILTERS: { value: "" | StockStatus; label: string }[] = [
  { value: "", label: "Any stock level" },
  { value: "REORDER", label: "Needs reorder" },
  { value: "LOW", label: "Low (not empty)" },
  { value: "OUT", label: "Out of stock" },
  { value: "IN_STOCK", label: "Well stocked" },
];

export function ProductsPage() {
  const { canManage } = useAuth();
  const notify = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [stock, setStock] = useState<"" | StockStatus>(params.get("stock") === "reorder" ? "REORDER" : "");
  const [showArchived, setShowArchived] = useState(false);
  const [sort, setSort] = useState("name,asc");
  const [page, setPage] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);

  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [moving, setMoving] = useState<Product | "any" | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);

  const search = useDebounce(q);
  useEffect(() => setPage(0), [search, categoryId, stock, showArchived, sort]);
  useEffect(() => {
    categoryApi.list().then(setCategories).catch(() => {});
  }, []);

  const { data, error, loading, reload } = useAsync(
    () =>
      productApi.search({
        q: search,
        categoryId: categoryId ? Number(categoryId) : undefined,
        stockStatus: stock || undefined,
        active: showArchived ? undefined : true,
        page,
        size: 15,
        sort,
      }),
    [search, categoryId, stock, showArchived, page, sort],
  );

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      const res = await productApi.remove(deleting.id);
      notify(res.archived ? `${deleting.name} has order history, so it was archived instead` : `${deleting.name} deleted`);
      setDeleting(null);
      reload();
    } catch (e) {
      notify(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Products"
        subtitle={data ? `${count(data.totalElements)} ${data.totalElements === 1 ? "product" : "products"} match` : "Your stock catalogue"}
        actions={
          <>
            <button className="btn" onClick={() => setMoving("any")}>
              <ArrowLeftRight size={16} /> Record stock movement
            </button>
            {canManage && (
              <button className="btn btn-primary" onClick={() => setEditing("new")}>
                <Plus size={16} /> Add product
              </button>
            )}
          </>
        }
      />

      <div className="toolbar">
        <div className="search">
          <Search size={16} />
          <input className="input" placeholder="Search name or SKU" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" />
        </div>
        <select className="select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select className="select" value={stock} onChange={(e) => setStock(e.target.value as "" | StockStatus)} aria-label="Stock level">
          {STOCK_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <label className="check">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Include archived
        </label>
      </div>

      {error && <ErrorBanner message={error} onRetry={reload} />}

      <section className="panel">
        {loading && !data ? (
          <Loading label="Loading products" />
        ) : data && data.content.length === 0 ? (
          <Empty
            title={search || categoryId || stock ? "No products match these filters" : "No products yet"}
            action={
              canManage && !search && (
                <button className="btn btn-primary" onClick={() => setEditing("new")}>
                  <Plus size={16} /> Add your first product
                </button>
              )
            }
          >
            {search || categoryId || stock ? "Try a different search or clear a filter." : "Add products to start tracking stock."}
          </Empty>
        ) : (
          data && (
            <>
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <SortHeader label="Product" field="name" sort={sort} onSort={setSort} />
                      <th>Supplier</th>
                      <SortHeader label="On hand" field="quantity" sort={sort} onSort={setSort} align="num" />
                      <th className="num">Reorder at</th>
                      <SortHeader label="Price" field="sellingPrice" sort={sort} onSort={setSort} align="num" />
                      <th className="num">Stock value</th>
                      <th>Status</th>
                      <th><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.content.map((p) => (
                      <tr key={p.id} className={`clickable ${p.active ? "" : "archived"}`} onClick={() => navigate(`/products/${p.id}`)}>
                        <td>
                          <strong>{p.name}</strong>
                          <span className="sub">
                            <span className="sku">{p.sku}</span>
                            {p.categoryName && <>, {p.categoryName}</>}
                          </span>
                        </td>
                        <td>{p.supplierName ?? <span style={{ color: "var(--muted)" }}>None</span>}</td>
                        <td className="num">
                          <strong>{count(p.quantity)}</strong> <span className="sub" style={{ display: "inline" }}>{p.unit}</span>
                        </td>
                        <td className="num">{count(p.reorderLevel)}</td>
                        <td className="num">{money(p.sellingPrice)}</td>
                        <td className="num">{money(p.stockValue)}</td>
                        <td><StockBadge product={p} /></td>
                        <td className="actions" onClick={(e) => e.stopPropagation()}>
                          <button className="icon-btn" title="Record stock movement" aria-label={`Record stock movement for ${p.name}`} onClick={() => setMoving(p)}>
                            <ArrowLeftRight size={16} />
                          </button>
                          {canManage && (
                            <>
                              <button className="icon-btn" title="Edit" aria-label={`Edit ${p.name}`} onClick={() => setEditing(p)}>
                                <Pencil size={16} />
                              </button>
                              <button className="icon-btn danger" title="Delete" aria-label={`Delete ${p.name}`} onClick={() => setDeleting(p)}>
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </td>
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

      {editing && (
        <ProductForm
          product={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
      {moving && (
        <StockMovementForm
          product={moving === "any" ? undefined : moving}
          onClose={() => setMoving(null)}
          onSaved={() => {
            setMoving(null);
            reload();
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting.name}?`}
          message="If this product appears on any orders it will be archived instead, so your sales history stays intact."
          confirmLabel="Delete product"
          busy={busy}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}
