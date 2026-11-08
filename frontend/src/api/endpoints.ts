import { http } from "./client";
import type {
  AuthResponse,
  Category,
  DemoInfo,
  Customer,
  Dashboard,
  MovementType,
  Order,
  OrderStatus,
  OrderSummary,
  Page,
  Product,
  ProductInput,
  Role,
  SalesSummary,
  StockMovement,
  StockStatus,
  Supplier,
  User,
} from "./types";

type Params = Record<string, string | number | boolean | undefined | null>;

/** Drops empty values so the backend sees only the filters that are set. */
function clean(params: Params) {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""));
}

const data = <T,>(p: Promise<{ data: T }>) => p.then((r) => r.data);

export const authApi = {
  login: (email: string, password: string) => data<AuthResponse>(http.post("/auth/login", { email, password })),
  me: () => data<User>(http.get("/auth/me")),
  demo: () => data<DemoInfo>(http.get("/auth/demo")),
  changePassword: (currentPassword: string, newPassword: string) =>
      http.post("/auth/change-password", { currentPassword, newPassword }),
};

export const dashboardApi = {
  get: () => data<Dashboard>(http.get("/dashboard")),
};

export const productApi = {
  search: (p: { q?: string; categoryId?: number; supplierId?: number; stockStatus?: StockStatus; active?: boolean; page?: number; size?: number; sort?: string }) =>
      data<Page<Product>>(http.get("/products", { params: clean(p) })),
  lowStock: () => data<Product[]>(http.get("/products/low-stock")),
  get: (id: number) => data<Product>(http.get(`/products/${id}`)),
  create: (body: ProductInput) => data<Product>(http.post("/products", body)),
  update: (id: number, body: ProductInput) => data<Product>(http.put(`/products/${id}`, body)),
  remove: (id: number) => data<{ archived: boolean }>(http.delete(`/products/${id}`)),
};

export const categoryApi = {
  list: () => data<Category[]>(http.get("/categories")),
  create: (body: { name: string; description: string }) => data<Category>(http.post("/categories", body)),
  update: (id: number, body: { name: string; description: string }) => data<Category>(http.put(`/categories/${id}`, body)),
  remove: (id: number) => http.delete(`/categories/${id}`),
};

export type SupplierInput = Pick<Supplier, "name" | "contactPerson" | "email" | "phone" | "address">;
export const supplierApi = {
  list: (q?: string) => data<Supplier[]>(http.get("/suppliers", { params: clean({ q }) })),
  create: (body: SupplierInput) => data<Supplier>(http.post("/suppliers", body)),
  update: (id: number, body: SupplierInput) => data<Supplier>(http.put(`/suppliers/${id}`, body)),
  remove: (id: number) => http.delete(`/suppliers/${id}`),
};

export type CustomerInput = Pick<Customer, "name" | "email" | "phone" | "address">;
export const customerApi = {
  search: (p: { q?: string; page?: number; size?: number; sort?: string }) =>
      data<Page<Customer>>(http.get("/customers", { params: clean(p) })),
  create: (body: CustomerInput) => data<Customer>(http.post("/customers", body)),
  update: (id: number, body: CustomerInput) => data<Customer>(http.put(`/customers/${id}`, body)),
  remove: (id: number) => http.delete(`/customers/${id}`),
};

export const stockApi = {
  history: (p: { productId?: number; type?: MovementType; page?: number; size?: number }) =>
      data<Page<StockMovement>>(http.get("/stock-movements", { params: clean(p) })),
  record: (body: { productId: number; type: MovementType; quantity: number; reason?: string; reference?: string }) =>
      data<StockMovement>(http.post("/stock-movements", body)),
};

export const orderApi = {
  search: (p: { status?: OrderStatus; customerId?: number; q?: string; page?: number; size?: number }) =>
      data<Page<OrderSummary>>(http.get("/orders", { params: clean(p) })),
  get: (id: number) => data<Order>(http.get(`/orders/${id}`)),
  create: (body: { customerId: number; items: { productId: number; quantity: number }[]; notes?: string }) =>
      data<Order>(http.post("/orders", body)),
  setStatus: (id: number, status: OrderStatus) => data<Order>(http.patch(`/orders/${id}/status`, { status })),
  remove: (id: number) => http.delete(`/orders/${id}`),
};

export const reportApi = {
  salesSummary: (from: string, to: string) => data<SalesSummary>(http.get("/reports/sales-summary", { params: { from, to } })),
};

export const userApi = {
  list: () => data<User[]>(http.get("/users")),
  create: (body: { fullName: string; email: string; password: string; role: Role }) => data<User>(http.post("/users", body)),
  update: (id: number, body: { fullName: string; email: string; role: Role; active: boolean; password?: string }) =>
      data<User>(http.put(`/users/${id}`, body)),
  remove: (id: number) => http.delete(`/users/${id}`),
};