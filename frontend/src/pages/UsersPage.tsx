
import { useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { userApi } from "../api/endpoints";
import { errorMessage, fieldErrors } from "../api/client";
import type { Role, User } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { date, roleLabel } from "../lib/format";
import { useAsync } from "../lib/hooks";
import { ConfirmDialog, ErrorBanner, Field, Loading, Modal, PageHeader } from "../components/ui";
import { useToast } from "../components/Toast";
import { PasswordRequirements, isStrongPassword } from "../components/PasswordRequirements";

const ROLE_HELP: Record<Role, string> = {
  ADMIN: "Everything, including users and editing or deleting customers",
  MANAGER: "Catalogue, suppliers, confirming orders and reports",
  STAFF: "Captures orders, adds customers and records stock movements",
};

export function UsersPage() {
  const { user: me } = useAuth();
  const notify = useToast();
  const { data, error, loading, reload } = useAsync(userApi.list, []);
  const [editing, setEditing] = useState<User | "new" | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await userApi.remove(deleting.id);
      notify(`${deleting.fullName} removed`);
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
            title="Users"
            subtitle="Who can log in, and what they're allowed to do."
            actions={
              <button className="btn btn-primary" onClick={() => setEditing("new")}>
                <Plus size={16} /> Add user
              </button>
            }
        />
        {error && <ErrorBanner message={error} onRetry={reload} />}
        <section className="panel">
          {loading && !data ? (
              <Loading />
          ) : (
              data && (
                  <div className="table-wrap">
                    <table className="data">
                      <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Added</th>
                        <th><span className="sr-only">Actions</span></th>
                      </tr>
                      </thead>
                      <tbody>
                      {data.map((u) => (
                          <tr key={u.id} className={u.active ? "" : "archived"}>
                            <td>
                              <strong>{u.fullName}</strong>
                              {u.id === me?.id && <span className="sub">You</span>}
                            </td>
                            <td>{u.email}</td>
                            <td>
                              {roleLabel[u.role]}
                              <span className="sub">{ROLE_HELP[u.role]}</span>
                            </td>
                            <td>{u.active ? <span className="badge badge-ok">Active</span> : <span className="badge badge-neutral">Deactivated</span>}</td>
                            <td>{date(u.createdAt)}</td>
                            <td className="actions">
                              <button className="icon-btn" aria-label={`Edit ${u.fullName}`} title="Edit" onClick={() => setEditing(u)}>
                                <Pencil size={16} />
                              </button>
                              {u.id !== me?.id && (
                                  <button className="icon-btn danger" aria-label={`Remove ${u.fullName}`} title="Remove" onClick={() => setDeleting(u)}>
                                    <Trash2 size={16} />
                                  </button>
                              )}
                            </td>
                          </tr>
                      ))}
                      </tbody>
                    </table>
                  </div>
              )
          )}
        </section>

        {editing && (
            <UserForm
                user={editing === "new" ? undefined : editing}
                isSelf={editing !== "new" && editing.id === me?.id}
                onClose={() => setEditing(null)}
                onSaved={() => {
                  notify(editing === "new" ? "User added" : "User saved");
                  setEditing(null);
                  reload();
                }}
            />
        )}
        {deleting && (
            <ConfirmDialog
                title={`Remove ${deleting.fullName}?`}
                message="They won't be able to log in any more. To keep their account for later, deactivate it instead."
                confirmLabel="Remove user"
                busy={busy}
                onConfirm={confirmDelete}
                onCancel={() => setDeleting(null)}
            />
        )}
      </>
  );
}

function UserForm({ user, isSelf, onClose, onSaved }: { user?: User; isSelf: boolean; onClose: () => void; onSaved: () => void }) {
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState<Role>(user?.role ?? "STAFF");
  const [active, setActive] = useState(user?.active ?? true);
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    // A password is required for a new user; when editing, it's only checked if one was typed.
    if ((!user || password) && !isStrongPassword(password)) {
      setError("The password doesn't meet all the requirements yet.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (user) await userApi.update(user.id, { fullName, email, role, active, password: password || undefined });
      else await userApi.create({ fullName, email, role, password });
      onSaved();
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
      <Modal
          title={user ? `Edit ${user.fullName}` : "Add user"}
          onClose={onClose}
          footer={
            <>
              <button className="btn" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" type="submit" form="user-form" disabled={busy}>
                {busy ? <span className="spinner" /> : user ? "Save user" : "Add user"}
              </button>
            </>
          }
      >
        {error && <div className="banner banner-error">{error}</div>}
        <form id="user-form" className="form-grid" onSubmit={submit}>
          <Field label="Full name" error={errors.fullName} className="span-2">
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={100} />
          </Field>
          <Field label="Email" error={errors.email} className="span-2">
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={150} />
          </Field>
          <Field label="Role" error={errors.role} hint={isSelf ? "You can't change your own role" : ROLE_HELP[role]}>
            <select className="select" value={role} onChange={(e) => setRole(e.target.value as Role)} disabled={isSelf}>
              {(Object.keys(roleLabel) as Role[]).map((r) => (
                  <option key={r} value={r}>{roleLabel[r]}</option>
              ))}
            </select>
          </Field>
          <div>
            <Field
                label={user ? "New password" : "Password"}
                error={errors.password}
                hint={user && !password ? "Leave blank to keep the current password" : undefined}
            >
              <input className="input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required={!user} />
            </Field>
            {(!user || password) && <PasswordRequirements password={password} />}
          </div>
          {user && !isSelf && (
              <label className="check span-2">
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                Account is active (deactivated users can't log in)
              </label>
          )}
        </form>
      </Modal>
  );
}