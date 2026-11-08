import { useState, type FormEvent } from "react";
import { authApi } from "../api/endpoints";
import { errorMessage } from "../api/client";
import { Field, Modal } from "./ui";
import { useToast } from "./Toast";
import { PasswordRequirements, isStrongPassword } from "./PasswordRequirements";

export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const notify = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!isStrongPassword(next)) return setError("The new password doesn't meet all the requirements yet.");
    if (next !== confirm) return setError("The new passwords don't match.");
    setBusy(true);
    try {
      await authApi.changePassword(current, next);
      notify("Password changed");
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
      <Modal
          title="Change password"
          onClose={onClose}
          footer={
            <>
              <button className="btn" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" type="submit" form="pw-form" disabled={busy}>
                {busy ? <span className="spinner" /> : "Change password"}
              </button>
            </>
          }
      >
        <form id="pw-form" onSubmit={submit} style={{ display: "grid", gap: 14 }}>
          {error && <div className="banner banner-error" style={{ margin: 0 }}>{error}</div>}
          <Field label="Current password">
            <input className="input" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
          </Field>
          <div>
            <Field label="New password">
              <input className="input" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required />
            </Field>
            <PasswordRequirements password={next} />
          </div>
          <Field label="Repeat new password" error={confirm && next !== confirm ? "Doesn't match the new password yet" : undefined}>
            <input className="input" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </Field>
        </form>
      </Modal>
  );
}