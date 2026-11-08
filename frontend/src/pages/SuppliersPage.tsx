import { useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { supplierApi } from "../api/endpoints";
import { errorMessage } from "../api/client";
import type { Supplier } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { useAsync, useDebounce } from "../lib/hooks";
import { ConfirmDialog, Empty, ErrorBanner, Loading, PageHeader } from "../components/ui";
import { useToast } from "../components/Toast";
import { ContactForm } from "./CustomersPage";

export function SuppliersPage() {
  const { canManage } = useAuth();
  const notify = useToast();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Supplier | "new" | null>(null);
  const [deleting, setDeleting] = useState<Supplier | null>(null);
  const [busy, setBusy] = useState(false);
  const search = useDebounce(q);
  const { data, error, loading, reload } = useAsync(() => supplierApi.list(search), [search]);

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await supplierApi.remove(deleting.id);
      notify(`${deleting.name} deleted`);
      reload();
    } catch (e) {
      notify(errorMessage(e), "error");
    } finally {
      setDeleting(null);
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Suppliers"
        subtitle="Who you buy stock from. Low-stock reports include their contact details."
        actions={
          canManage && (
            <button className="btn btn-primary" onClick={() => setEditing("new")}>
              <Plus size={16} /> Add supplier
            </button>
          )
        }
      />
      <div className="toolbar">
        <div className="search">
          <Search size={16} />
          <input className="input" placeholder="Search suppliers" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search suppliers" />
        </div>
      </div>
      {error && <ErrorBanner message={error} onRetry={reload} />}
      <section className="panel">
        {loading && !data ? (
          <Loading />
        ) : data && data.length === 0 ? (
          <Empty title={search ? "No suppliers match" : "No suppliers yet"}>
            {search ? "Try another name." : "Add the companies you order stock from."}
          </Empty>
        ) : (
          data && (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Supplier</th>
                    <th>Contact</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th className="num">Products</th>
                    {canManage && <th><span className="sr-only">Actions</span></th>}
                  </tr>
                </thead>
                <tbody>
                  {data.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.name}</strong>
                        {s.address && <span className="sub">{s.address}</span>}
                      </td>
                      <td>{s.contactPerson ?? "–"}</td>
                      <td>{s.email ? <a href={`mailto:${s.email}`}>{s.email}</a> : "–"}</td>
                      <td>{s.phone ?? "–"}</td>
                      <td className="num">{s.productCount}</td>
                      {canManage && (
                        <td className="actions">
                          <button className="icon-btn" aria-label={`Edit ${s.name}`} title="Edit" onClick={() => setEditing(s)}>
                            <Pencil size={16} />
                          </button>
                          <button className="icon-btn danger" aria-label={`Delete ${s.name}`} title="Delete" onClick={() => setDeleting(s)}>
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </section>
      <p style={{ color: "var(--steel)", fontSize: 14 }}>
        Need to restock? The <Link to="/products?stock=reorder">reorder list</Link> shows what to order from each supplier.
      </p>

      {editing && (
        <ContactForm
          kind="supplier"
          initial={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSubmit={async (body) => {
            if (editing === "new") await supplierApi.create(body);
            else await supplierApi.update(editing.id, body);
            notify(editing === "new" ? "Supplier added" : "Supplier saved");
            setEditing(null);
            reload();
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting.name}?`}
          message={deleting.productCount > 0 ? `${deleting.name} supplies ${deleting.productCount} products. Reassign them before deleting.` : "This supplier will be removed."}
          confirmLabel="Delete supplier"
          busy={busy}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}
