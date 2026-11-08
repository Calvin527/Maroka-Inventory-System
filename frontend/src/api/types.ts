// Mirrors the Spring Boot DTOs. Money arrives as JSON numbers (BigDecimal), dates as ISO strings.

export type Role = "ADMIN" | "MANAGER" | "STAFF";
export type OrderStatus = "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
export type MovementType = "IN" | "OUT" | "ADJUSTMENT";
export type StockStatus = "IN_STOCK" | "LOW" | "OUT" | "REORDER";

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ApiError {
  status: number;
  error: string;
  message: string;
  fieldErrors?: Record<string, string>;
}

export interface User {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

/** From GET /api/auth/demo. In the real system: enabled=false and no accounts. */
export interface DemoInfo {
  enabled: boolean;
  resetTime: string | null;
  accounts: { role: Role; fullName: string; email: string; password: string }[];
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  expiresInMs: number;
  user: User;
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
  productCount: number;
}

export interface Supplier {
  id: number;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  productCount: number;
  createdAt: string;
}

export interface Customer {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  orderCount: number;
  /** Email of the staff member who added the customer (null for old demo data). */
  createdBy: string | null;
  createdAt: string;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  categoryId: number | null;
  categoryName: string | null;
  supplierId: number | null;
  supplierName: string | null;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  reorderLevel: number;
  unit: string;
  active: boolean;
  lowStock: boolean;
  outOfStock: boolean;
  stockValue: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  sku: string;
  name: string;
  description: string;
  categoryId: number | null;
  supplierId: number | null;
  costPrice: number;
  sellingPrice: number;
  openingQuantity?: number;
  reorderLevel: number;
  unit: string;
  active: boolean;
}

export interface StockMovement {
  id: number;
  productId: number;
  productName: string;
  productSku: string;
  type: MovementType;
  quantityChange: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string | null;
  reference: string | null;
  performedBy: string | null;
  createdAt: string;
}

export interface OrderItem {
  id: number;
  productId: number;
  productSku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Order {
  id: number;
  orderNumber: string;
  customerId: number;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderSummary {
  id: number;
  orderNumber: string;
  customerId: number;
  customerName: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
}

export interface TopProduct {
  productId: number;
  productName: string;
  quantitySold: number;
  revenue: number;
}

export interface Dashboard {
  totalProducts: number;
  totalStockValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalCustomers: number;
  totalSuppliers: number;
  pendingOrders: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  ordersThisMonth: number;
  monthlySales: { month: string; label: string; revenue: number; orders: number }[];
  ordersByStatus: Record<OrderStatus, number>;
  topProducts: TopProduct[];
  lowStockProducts: Product[];
  recentOrders: OrderSummary[];
}

export interface SalesSummary {
  from: string;
  to: string;
  orderCount: number;
  revenue: number;
  taxCollected: number;
  grossTotal: number;
  averageOrderValue: number;
  daily: { date: string; orders: number; revenue: number }[];
  topProducts: TopProduct[];
  topCustomers: { customerId: number; customerName: string; orders: number; revenue: number }[];
}