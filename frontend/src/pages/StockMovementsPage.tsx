import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { stockApi } from "../api/endpoints";
import type { MovementType } from "../api/types";
import { count, dateTime } from "../lib/format";
import { useAsync } from "../lib/hooks";
import { Empty, ErrorBanner, Loading, MovementBadge, PageHeader, Pagination, SignedQty } from "../components/ui";
import { StockMovementForm } from "../components/StockMovementForm";

const FILTERS: { value: "" | MovementType; label: string }[] = [
  { value: "", label: "All" },
  { value: "IN", label: "Stock in" },
  { value: "OUT", label: "Stock out" },
  { value: "ADJUSTMENT", label: "Stock takes" },
];

export function StockMovementsPage() {
  const [type, setType] = useState<"" | MovementType>("");
  const [page, setPage] = useState(0);
  const [recording, setRecording] = useState(false);
  const { data, error, loading, reload } = useAsync(() => stockApi.history({ type: type || undefined, page, size: 20 }), [type, page]);

  return (
    <>
      <PageHeader
        title="Stock movements"
        subtitle="The audit trail behind every quantity: deliveries, sales, write-offs and stock takes."
        actions={
          <button className="btn btn-primary" onClick={() => setRecording(true)}>
            <Plus size={16} /> Record movement
          </button>
        }
      />
      <div className="toolbar">
        <div className="segmented" role="group" aria-label="Filter by type">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              aria-pressed={type === f.value}
              onClick={() => {
                setType(f.value);
                setPage(0);
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      {error && <ErrorBanner message={error} onRetry={reload} />}
      <section className="panel">
        {loading && !data ? (
          <Loading />
        ) : data && data.content.length === 0 ? (
          <Empty title="No movements recorded">Deliveries, sales and stock takes will appear here.</Empty>
        ) : (
          data && (
            <>
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Product</th>
                      <th>Type</th>
                      <th className="num">Change</th>
                      <th className="num">Before</th>
                      <th className="num">After</th>
                      <th>Reason</th>
                      <th>By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.content.map((m) => (
                      <tr key={m.id}>
                        <td style={{ whiteSpace: "nowrap" }}>{dateTime(m.createdAt)}</td>
                        <td>
                          <Link to={`/products/${m.productId}`}>{m.productName}</Link>
                          <span className="sub sku">{m.productSku}</span>
                        </td>
                        <td><MovementBadge type={m.type} /></td>
                        <td className="num"><SignedQty value={m.quantityChange} /></td>
                        <td className="num">{count(m.previousQuantity)}</td>
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
              <Pagination page={data} onPage={setPage} />
            </>
          )
        )}
      </section>
      {recording && (
        <StockMovementForm
          onClose={() => setRecording(false)}
          onSaved={() => {
            setRecording(false);
            reload();
          }}
        />
      )}
    </>
  );
}
