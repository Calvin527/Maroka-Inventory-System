import { cloneElement, isValidElement, useEffect, useId, useRef, type ReactElement, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, X } from "lucide-react";
import type { MovementType, OrderStatus, Page, Product } from "../api/types";
import { count, statusLabel } from "../lib/format";

export function PageHeader({ title, subtitle, actions, back }: { title: string; subtitle?: ReactNode; actions?: ReactNode; back?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        {back}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="actions no-print">{actions}</div>}
    </header>
  );
}

export function Panel({ title, subtitle, action, children, className = "", bodyClass = "panel-body" }: {
  title?: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClass?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {(title || action) && (
        <div className="panel-head">
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

export function Modal({ title, onClose, children, footer, wide }: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Runs once on open: focus the first control, close on Escape, return focus afterwards.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    document.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>("input, select, textarea, .modal-foot button")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
  }, []);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref}>
        <div className="modal-head">
          <h2 id={titleId}>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel, busy, danger = true }: {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  danger?: boolean;
}) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button className="btn" onClick={onCancel}>Keep it</button>
          <button className={`btn ${danger ? "btn-danger-solid" : "btn-primary"}`} onClick={onConfirm} disabled={busy}>
            {busy ? <span className="spinner" /> : confirmLabel}
          </button>
        </>
      }
    >
      <div style={{ color: "var(--ink-2)" }}>{message}</div>
    </Modal>
  );
}

/** Label + control + hint/error. The single child control gets an id so the label is linked to it. */
export function Field({ label, error, hint, children, className = "" }: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactElement<{ id?: string; "aria-invalid"?: boolean; "aria-describedby"?: string }>;
  className?: string;
}) {
  const id = useId();
  const noteId = `${id}-note`;
  const control = isValidElement(children)
    ? cloneElement(children, {
        id: children.props.id ?? id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error || hint ? noteId : undefined,
      })
    : children;
  return (
    <div className={`field ${className}`}>
      <label htmlFor={children.props.id ?? id}>{label}</label>
      {control}
      {error ? (
        <span className="err" id={noteId}>{error}</span>
      ) : (
        hint && <span className="hint" id={noteId}>{hint}</span>
      )}
    </div>
  );
}

export function Pagination<T>({ page, onPage }: { page: Page<T>; onPage: (p: number) => void }) {
  if (page.totalElements === 0) return null;
  const start = page.page * page.size + 1;
  const end = Math.min(start + page.content.length - 1, page.totalElements);
  return (
    <div className="pagination">
      <span>
        Showing {count(start)}–{count(end)} of {count(page.totalElements)}
      </span>
      <div className="pager">
        <button className="btn btn-sm" disabled={page.page === 0} onClick={() => onPage(page.page - 1)} aria-label="Previous page">
          <ChevronLeft size={16} /> Previous
        </button>
        <button className="btn btn-sm" disabled={page.page + 1 >= page.totalPages} onClick={() => onPage(page.page + 1)} aria-label="Next page">
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`badge badge-${status.toLowerCase()}`}>{statusLabel[status]}</span>;
}

export function StockBadge({ product }: { product: Pick<Product, "outOfStock" | "lowStock" | "active"> }) {
  if (!product.active) return <span className="badge badge-neutral">Archived</span>;
  if (product.outOfStock) return <span className="badge badge-out">Out of stock</span>;
  if (product.lowStock) return <span className="badge badge-low">Reorder</span>;
  return <span className="badge badge-ok">In stock</span>;
}

export function MovementBadge({ type }: { type: MovementType }) {
  const map = { IN: ["badge-in", "Stock in"], OUT: ["badge-out", "Stock out"], ADJUSTMENT: ["badge-adj", "Adjustment"] } as const;
  const [cls, label] = map[type];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function SignedQty({ value }: { value: number }) {
  return (
    <span className={value >= 0 ? "delta-pos" : "delta-neg"} style={{ fontWeight: 600 }}>
      {value > 0 ? "+" : ""}
      {count(value)}
    </span>
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children}
      {action && <div>{action}</div>}
    </div>
  );
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="loading">
      <span className="spinner" /> <span style={{ marginLeft: 8 }}>{label}…</span>
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="banner banner-error" role="alert">
      {message}{" "}
      {onRetry && (
        <button className="btn btn-sm" style={{ marginLeft: 8 }} onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

/** Column header that toggles Spring's "field,asc|desc" sort param. */
export function SortHeader({ label, field, sort, onSort, align }: {
  label: string;
  field: string;
  sort: string;
  onSort: (s: string) => void;
  align?: "num";
}) {
  const [f, dir] = sort.split(",");
  const active = f === field;
  const next = active && dir === "asc" ? `${field},desc` : `${field},asc`;
  return (
    <th className={align} aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <button className="sort-btn" onClick={() => onSort(next)}>
        {label}
        {active && (dir === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />)}
      </button>
    </th>
  );
}
