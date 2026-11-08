import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeftRight, ChevronLeft, Pencil } from "lucide-react";
import { productApi, stockApi } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import { count, dateTime, money } from "../lib/format";
import { useAsync } from "../lib/hooks";
import { Empty, ErrorBanner, Loading, MovementBadge, PageHeader, Pagination, Panel, SignedQty, StockBadge } from "../components/ui";
import { ProductForm } from "../components/ProductForm";
import { StockMovementForm } from "../components/StockMovementForm";

export function ProductDetailPage() {
  const id = Number(useParams().id);
  const { canManage } = useAuth();
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState(false);
  const [moving, setMoving] = useState(false);

  const product = useAsync(() => productApi.get(id), [id]);
  const history = useAsync(() => stockApi.history({ productId: id, page, size: 10 }), [id, page]);

  const p = product.data;
  const back = (
    <Link to="/products" className="back-link">
      <ChevronLeft size={16} /> Products
    </Link>
  );

  if (product.error) return <>{back}<ErrorBanner message={product.error} onRetry={product.reload} /></>;
  if (!p) return <Loading label="Loading product" />;

  const margin = p.sellingPrice > 0 ? ((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100 : 0;

  return (
    <>
      <PageHeader
        back={back}
        title={p.name}
        subtitle={
          <>
            <span className="sku">{p.sku}</span> <StockBadge product={p} />
          </>
        }
        actions={
          <>
            {p.active && (
              <button className="btn" onClick={() => setMoving(true)}>
                <ArrowLeftRight size={16} /> Record stock movement
              </button>
            )}
            {canManage && (
              <button className="btn btn-primary" onClick={() => setEditing(true)}>
                <Pencil size={16} /> Edit product
              </button>
            )}
          </>
        }
      />

      <section className="panel kpis" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        <div className="kpi">
          <div className="label">On hand</div>
          <div className="value">{count(p.quantity)}</div>
          <div className="note">{p.unit}, reorder at {p.reorderLevel}</div>
        </div>
        <div className="kpi">
          <div className="label">Selling price</div>
          <div className="value">{money(p.sellingPrice)}</div>
          <div className="note">excl. VAT</div>
        </div>
        <div className="kpi">
          <div className="label">Cost price</div>
          <div className="value">{money(p.costPrice)}</div>
          <div className="note">{margin.toFixed(1)}% margin</div>
        </div>
        <div className="kpi">
          <div className="label">Stock value</div>
          <div className="value">{money(p.stockValue)}</div>
          <div className="note">at cost</div>
        </div>
      </section>

      <div className="grid-2-1">
        <Panel title="Stock history" subtitle="Every change to the quantity on hand" bodyClass="">
          <div style={{ marginTop: 12 }}>
            {history.loading && !history.data ? (
              <Loading />
            ) : history.data && history.data.content.length === 0 ? (
              <Empty title="No stock movements yet" />
            ) : (
              history.data && (
                <>
                  <div className="table-wrap">
                    <table className="data">
                      <thead>
                        <tr>
                          <th>When</th>
                          <th>Type</th>
                          <th className="num">Change</th>
                          <th className="num">After</th>
                          <th>Reason</th>
                          <th>By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.data.content.map((m) => (
                          <tr key={m.id}>
                            <td>{dateTime(m.createdAt)}</td>
                            <td><MovementBadge type={m.type} /></td>
                            <td className="num"><SignedQty value={m.quantityChange} /></td>
                            <td className="num">{count(m.newQuantity)}</td>
                            <td>
                              {m.reason}
                              {m.reference && <span className="sub">Ref {m.reference}</span>}
                            </td>
                            <td>{m.performedBy}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination page={history.data} onPage={setPage} />
                </>
              )
            )}
          </div>
        </Panel>

        <Panel title="Details">
          <dl className="info-list">
            <dt>Category</dt>
            <dd>{p.categoryName ?? "None"}</dd>
            <dt>Supplier</dt>
            <dd>{p.supplierName ?? "None"}</dd>
            <dt>Unit</dt>
            <dd>{p.unit}</dd>
            <dt>Status</dt>
            <dd>{p.active ? "Active" : "Archived"}</dd>
            <dt>Added</dt>
            <dd>{dateTime(p.createdAt)}</dd>
            <dt>Updated</dt>
            <dd>{dateTime(p.updatedAt)}</dd>
          </dl>
          {p.description && <p style={{ marginTop: 16, color: "var(--ink-2)" }}>{p.description}</p>}
        </Panel>
      </div>

      {editing && (
        <ProductForm
          product={p}
          onClose={() => setEditing(false)}
          onSaved={(saved) => {
            setEditing(false);
            product.setData(saved);
          }}
        />
      )}
      {moving && (
        <StockMovementForm
          product={p}
          onClose={() => setMoving(false)}
          onSaved={() => {
            setMoving(false);
            product.reload();
            history.reload();
          }}
        />
      )}
    </>
  );
}
