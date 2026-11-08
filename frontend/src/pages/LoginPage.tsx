import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { errorMessage } from "../api/client";
import { authApi } from "../api/endpoints";
import type { DemoInfo } from "../api/types";
import { roleLabel } from "../lib/format";
import { Field } from "../components/ui";
import { Logo } from "../components/Layout";

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [demo, setDemo] = useState<DemoInfo | null>(null);

  // Ask the backend whether this is the demo version. The real system answers "no", so nothing shows.
  useEffect(() => {
    authApi.demo().then(setDemo).catch(() => setDemo(null));
  }, []);

  const from = (location.state as { from?: string } | null)?.from ?? "/";
  if (user) return <Navigate to={from} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
      <div className="login">
        <section className="login-art">
          <div className="brand" style={{ padding: 0 }}>
            <Logo size={32} /> <span>Maroka Smart Inventory</span>
          </div>
          <div>
            <h1>Know what's on the shelf</h1>
            <p>
              Stock levels, reorder alerts, customer orders and sales reports for your business, kept in one place and
              always up to date.
            </p>
          </div>
          {/* Keeps the headline vertically centred now that the footer text is gone. */}
          <div aria-hidden="true" />
        </section>

        <section className="login-form-wrap">
          <form className="login-form" onSubmit={submit}>
            <div>
              <h2>Log in</h2>
              <p style={{ margin: "4px 0 0", color: "var(--steel)" }}>Use your work email and password.</p>
            </div>
            {error && <div className="banner banner-error" role="alert" style={{ margin: 0 }}>{error}</div>}
            <Field label="Email">
              <input className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            <Field label="Password">
              <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </Field>
            <button className="btn btn-primary" type="submit" disabled={busy} style={{ height: 42 }}>
              {busy ? <span className="spinner" /> : "Log in"}
            </button>
            {!demo?.enabled && (
                <p style={{ margin: 0, fontSize: 14, color: "var(--steel)" }}>
                  Forgotten your password? Ask your admin to reset it.
                </p>
            )}

            {demo?.enabled && demo.accounts.length > 0 && (
                <div className="demo-accounts">
                  <strong style={{ color: "var(--ink)" }}>This is a demo with sample data.</strong> Pick a role to log in as.
                  Everything resets every night{demo.resetTime ? ` at ${demo.resetTime}` : ""}, so feel free to try things.
                  <div className="row">
                    {demo.accounts.map((a) => (
                        <button
                            key={a.email}
                            type="button"
                            className="btn btn-sm"
                            title={`${a.fullName} (${a.email})`}
                            onClick={() => {
                              setEmail(a.email);
                              setPassword(a.password);
                            }}
                        >
                          {roleLabel[a.role]}
                        </button>
                    ))}
                  </div>
                </div>
            )}
          </form>
        </section>
      </div>
  );
}