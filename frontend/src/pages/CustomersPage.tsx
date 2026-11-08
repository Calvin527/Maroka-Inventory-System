import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { customerApi, type CustomerInput } from "../api/endpoints";
import { errorMessage, fieldErrors } from "../api/client";
import type { Customer } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { count, date } from "../lib/format";
import { useAsync, useDebounce } from "../lib/hooks";
import { ConfirmDialog, Empty, ErrorBanner, Field, Loading, Modal, PageHeader, Pagination } from "../components/ui";
import { useToast } from "../components/Toast";

/**
 * Who can do what (mirrors CustomerController on the backend):
 * staff add customers; only the admin edits or deletes them; everyone can view.
 */
export function CustomersPage() {
  const { user, isAdmin, canManage } = useAuth();
  const isStaff = user?.role === "STAFF";
  // Admins and managers can see who added each customer (accountability).
  const showAddedBy = canManage;
  const notify = useToast();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Customer | "new" | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const [busy, setBusy] = useState(false);
  const search = useDebounce(q);
  useEffect(() => setPage(0), [search]);

  const { data, error, loading, reload } = useAsync(() => customerApi.search({ q: search, page, size: 20 }), [search, page]);

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await customerApi.remove(deleting.id);
      notify(`${deleting.name} deleted`);
      setDeleting(null);
      reload();
    } catch (e) {
      notify(errorMessage(e), "error");
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  }

  return (
      <>
        <PageHeader
            title="Customers"
            subtitle={
              <>
                {data && `${count(data.totalElements)} customers. `}
                {isStaff && "To change or remove a customer's details, email the admin."}
                {!isStaff && !isAdmin && "Customers are added by staff and maintained by the admin."}
              </>
            }
            actions={
                isStaff && (
                    <button className="btn btn-primary" onClick={() => setEditing("new")}>
                      <Plus size={16} /> Add customer
                    </button>
                )
            }
        />
        <div className="toolbar">
          <div className="search">
            <Search size={16} />
            <input className="input" placeholder="Search name, email or phone" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search customers" />
          </div>
        </div>
        {error && <ErrorBanner message={error} onRetry={reload} />}
        <section className="panel">
          {loading && !data ? (
              <Loading />
          ) : data && data.content.length === 0 ? (
              <Empty title={search ? "No customers match" : "No customers yet"} action={!search && isStaff && <button className="btn btn-primary" onClick={() => setEditing("new")}><Plus size={16} /> Add customer</button>}>
                {search ? "Try another name, email or number." : isStaff ? "Add the people and businesses you sell to." : "Staff add customers when they capture orders."}
              </Empty>
          ) : (
              data && (
                  <>
                    <div className="table-wrap">
                      <table className="data">
                        <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Phone</th>
                          <th>Area</th>
                          <th className="num">Orders</th>
                          {showAddedBy && <th>Added</th>}
                          {isAdmin && <th><span className="sr-only">Actions</span></th>}
                        </tr>
                        </thead>
                        <tbody>
                        {data.content.map((c) => (
                            <tr key={c.id}>
                              <td><strong>{c.name}</strong></td>
                              <td>{c.email ? <a href={`mailto:${c.email}`}>{c.email}</a> : "–"}</td>
                              <td>{c.phone ?? "–"}</td>
                              <td>{c.address ?? "–"}</td>
                              <td className="num">
                                {c.orderCount > 0 ? (
                                    <Link to={`/orders?customerId=${c.id}&customer=${encodeURIComponent(c.name)}`}>{c.orderCount}</Link>
                                ) : (
                                    0
                                )}
                              </td>
                              {showAddedBy && (
                                  <td>
                                    {date(c.createdAt)}
                                    <span className="sub">{c.createdBy ? `by ${c.createdBy}` : "System (demo data)"}</span>
                                  </td>
                              )}
                              {isAdmin && (
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
                    <Pagination page={data} onPage={setPage} />
                  </>
              )
          )}
        </section>

        {editing && (
            <ContactForm
                kind="customer"
                initial={editing === "new" ? undefined : editing}
                onClose={() => setEditing(null)}
                onSubmit={async (body) => {
                  if (editing === "new") await customerApi.create(body);
                  else await customerApi.update(editing.id, body);
                  notify(editing === "new" ? "Customer added" : "Customer saved");
                  setEditing(null);
                  reload();
                }}
            />
        )}
        {deleting && (
            <ConfirmDialog
                title={`Delete ${deleting.name}?`}
                message="Customers with orders can't be deleted, because their orders are part of your sales records."
                confirmLabel="Delete customer"
                busy={busy}
                onConfirm={confirmDelete}
                onCancel={() => setDeleting(null)}
            />
        )}
      </>
  );
}

/** Shared form for customers and suppliers (suppliers also have a contact person). */
export function ContactForm({ kind, initial, onClose, onSubmit }: {
  kind: "customer" | "supplier";
  initial?: Partial<CustomerInput & { contactPerson: string | null }>;
  onClose: () => void;
  onSubmit: (body: CustomerInput & { contactPerson: string | null }) => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    contactPerson: initial?.contactPerson ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    address: initial?.address ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const noun = kind === "customer" ? "customer" : "supplier";
  // Customers must have full contact details; for suppliers they're optional.
  const contactRequired = kind === "customer";

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        name: form.name,
        contactPerson: form.contactPerson || null,
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
      });
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
      <Modal
          title={initial ? `Edit ${initial.name}` : `Add ${noun}`}
          onClose={onClose}
          footer={
            <>
              <button className="btn" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" type="submit" form="contact-form" disabled={busy}>
                {busy ? <span className="spinner" /> : initial ? `Save ${noun}` : `Add ${noun}`}
              </button>
            </>
          }
      >
        {error && <div className="banner banner-error">{error}</div>}
        <form id="contact-form" className="form-grid" onSubmit={submit}>
          <Field label={kind === "customer" ? "Name or business" : "Company name"} error={errors.name} className="span-2">
            <input className="input" value={form.name} onChange={set("name")} required maxLength={120} />
          </Field>
          {kind === "supplier" && (
              <Field label="Contact person" error={errors.contactPerson} className="span-2">
                <input className="input" value={form.contactPerson} onChange={set("contactPerson")} maxLength={100} />
              </Field>
          )}
          <Field label="Email" error={errors.email}>
            <input className="input" type="email" value={form.email} onChange={set("email")} required={contactRequired} maxLength={150} />
          </Field>
          <Field label="Phone" error={errors.phone} hint={contactRequired ? "e.g. 072 555 0110" : undefined}>
            <input className="input" type="tel" value={form.phone} onChange={set("phone")} required={contactRequired} maxLength={20} />
          </Field>
          <Field label="Address" error={errors.address} className="span-2">
            <input className="input" value={form.address} onChange={set("address")} required={contactRequired} maxLength={255} />
          </Field>
        </form>
      </Modal>
  );
}