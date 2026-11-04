// File: src/types/api.ts

// User Types
export interface User {
  id: string;
  phone: string;
  full_name: string;
  email: string | null;
  role: 'customer' | 'vendor' | 'admin' | 'rider';
  is_active: boolean;
  is_staff: boolean;
  created_at: string;
}

// Vendor Types
export interface Vendor {
  id: string;
  user: User;
  shop_name: string;
  address: string;
  city: string;
  identity_document: string | null;
  business_document: string | null;
  status: 'pending' | 'approved' | 'suspended';
  commission_rate: string;
  created_at: string;
  
  // For display in frontend
  name?: string;
  email?: string;
  phone?: string;
  businessName?: string;
  joinDate?: string;
  totalProducts?: number;
  totalOrders?: number;
  earnings?: number;
  verified?: boolean;
}

// Product Types - FIXED: Added status field to match Django backend
export interface Product {
  id: string;
  vendor: Vendor;
  name: string;
  description: string;
  category: string;
  price: string;
  stock_quantity: number;
  images: string[];
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'inactive';  // ✅ ADDED THIS
  is_active: boolean;  // Keep for backwards compatibility
  created_at: string;
  updated_at: string;
}

// Order Types - FIXED: Match Django backend status values
export interface Order {
  id: string;
  customer: User | null;  // ✅ Can be null for guest orders
  customer_name?: string;  // For guest orders
  customer_phone?: string; // For guest orders
  total_amount: string;
  payment_method: string;
  status: 'pending' | 'confirmed' | 'picked' | 'delivered' | 'cancelled';
  delivery_address: string;
  city: string;
  created_at: string;
  items: OrderItem[];
  
  // For display
  customerName?: string;
  vendorName?: string;
  orderDate?: string;
  total?: number;
}

export interface OrderItem {
  id: string;
  product: Product;
  vendor: Vendor;
  quantity: number;
  price_at_order: string;
}

// Dashboard Stats
export interface DashboardStats {
  total_users: number;
  total_vendors: number;
  total_products: number;
  total_orders: number;
  total_revenue: number;
  active_orders: number;
  pending_vendors: number;
  in_transit: number;
}

export interface DashboardResponse {
  stats: DashboardStats;
  recent_orders: Order[];
}

// Logistics Types
export interface LogisticsStats {
  packages_in_transit: number;
  delivered_today: number;
  active_drivers: number;
  delivery_by_province: ProvinceDelivery[];
}

export interface ProvinceDelivery {
  province: string;
  active: number;
  completed: number;
}

// Payout Types
export interface Payout {
  id: string;
  vendor: Vendor;
  amount: string;
  period_start: string;
  period_end: string;
  status: 'pending' | 'paid';
  paid_at: string | null;
}

export interface PayoutSummary {
  pending_amount: number;
  pending_count: number;
  processed_amount: number;
  processed_count: number;
  next_payout_date: string;
}

// Order Status Counts - FIXED: Match Django backend
export interface OrderStatusCounts {
  pending: number;
  confirmed: number;  // This matches Django 'confirmed' (shows as "Processing" in UI)
  picked: number;     // This matches Django 'picked' (shows as "Shipped" in UI)
  delivered: number;
}

// Pagination Response
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}