import type { OrderStatus, Role } from "../api/types";

const zar = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" });
const zarCompact = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  notation: "compact",
  maximumFractionDigits: 1,
});
const num = new Intl.NumberFormat("en-ZA");

export const money = (v: number | null | undefined) => zar.format(v ?? 0);
export const moneyCompact = (v: number) => zarCompact.format(v);
export const count = (v: number) => num.format(v);

export const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/** yyyy-MM-dd in local time, for <input type="date"> and report params. */
export const isoDate = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const statusLabel: Record<OrderStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const roleLabel: Record<Role, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  STAFF: "Staff",
};
