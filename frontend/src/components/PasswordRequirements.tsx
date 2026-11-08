import { Check, Circle } from "lucide-react";

/**
 * The password policy, the same as PasswordRules.java on the backend:
 * at least 8 characters, an uppercase letter, a lowercase letter and a number.
 */
const RULES: { label: string; test: (p: string) => boolean }[] = [
    { label: "At least 8 characters", test: (p) => p.length >= 8 },
    { label: "An uppercase letter (A–Z)", test: (p) => /[A-Z]/.test(p) },
    { label: "A lowercase letter (a–z)", test: (p) => /[a-z]/.test(p) },
    { label: "A number (0–9)", test: (p) => /\d/.test(p) },
];

export function isStrongPassword(password: string) {
    return RULES.every((r) => r.test(password));
}

/** Live checklist under a password field: each rule turns green as it's met. */
export function PasswordRequirements({ password }: { password: string }) {
    return (
        <ul style={{ listStyle: "none", margin: "2px 0 0", padding: 0, display: "grid", gap: 2, fontSize: 13 }} aria-live="polite">
            {RULES.map((r) => {
                const met = r.test(password);
                return (
                    <li key={r.label} style={{ display: "flex", alignItems: "center", gap: 6, color: met ? "var(--ok)" : "var(--steel)" }}>
                        {met ? <Check size={14} aria-hidden="true" /> : <Circle size={10} aria-hidden="true" style={{ margin: "0 2px" }} />}
                        <span>
              {r.label}
                            <span className="sr-only">{met ? " (done)" : " (not yet)"}</span>
            </span>
                    </li>
                );
            })}
        </ul>
    );
}