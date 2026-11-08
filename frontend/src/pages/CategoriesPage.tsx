import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { categoryApi } from "../api/endpoints";
import { errorMessage } from "../api/client";
import type { Category } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { useAsync } from "../lib/hooks";
import { ConfirmDialog, Empty, ErrorBanner, Field, Loading, Modal, PageHeader } from "../components/ui";
import { useToast } from "../components/Toast";

export function CategoriesPage() {
  const { canManage } = useAuth();
  const notify = useToast();
  const { data, error, loading, reload } = useAsync(categoryApi.list, []);
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await categoryApi.remove(deleting.id);
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
        title="Categories"
        subtitle="Group products so they're easier to find and report on."
        actions={
          canManage && (
            <button className="btn btn-primary" onClick={() => setEditing("new")}>
              <Plus size={16} /> Add category
            </button>
          )
        }
      />
      {error && <ErrorBanner message={error} onRetry={reload} />}
      <section className="panel">
        {loading && !data ? (
          <Loading />
        ) : data && data.length === 0 ? (
          <Empty title="No categories yet">Create categories like "Plumbing" or "Paint" to organise your catalogue.</Empty>
        ) : (
          data && (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Description</th>
                    <th className="num">Products</th>
                    {canManage && <th><span className="sr-only">Actions</span></th>}
                  </tr>
                </thead>
                <tbody>
                  {data.map((c) => (
                    <tr key={c.id}>
                      <td><strong>{c.name}</strong></td>
                      <td>{c.description ?? "–"}</td>
                      <td className="num">{c.productCount}</td>
                      {canManage && (
                        <td className="actions">
                          <button className="icon-btn" aria-label={`Edit ${c.name}`} title="Edit" onClick={() => setEditing(c)}>
                            <Pencil size={16} />
                          </button>
                          <button className="icon-btn danger" aria-label={`Delete ${c.name}`} title="Delete" onClick={() => setDeleting(c)}>
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

      {editing && (
        <CategoryForm
          category={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            notify(editing === "new" ? "Category added" : "Category saved");
            setEditing(null);
            reload();
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting.name}?`}
          message={
            deleting.productCount > 0 ? (
              <>
                {deleting.name} still has {deleting.productCount} products. Move them to another category from the{" "}
                <Link to="/products">products page</Link> first.
              </>
            ) : (
              "This category will be removed."
            )
          }
          confirmLabel="Delete category"
          busy={busy}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}

function CategoryForm({ category, onClose, onSaved }: { category?: Category; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (category) await categoryApi.update(category.id, { name, description });
      else await categoryApi.create({ name, description });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Modal
      title={category ? `Edit ${category.name}` : "Add category"}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" type="submit" form="category-form" disabled={busy}>
            {busy ? <span className="spinner" /> : category ? "Save category" : "Add category"}
          </button>
        </>
      }
    >
      {error && <div className="banner banner-error">{error}</div>}
      <form id="category-form" onSubmit={submit} style={{ display: "grid", gap: 14 }}>
        <Field label="Name">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
        </Field>
        <Field label="Description" hint="Optional">
          <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={255} />
        </Field>
      </form>
    </Modal>
  );
}
