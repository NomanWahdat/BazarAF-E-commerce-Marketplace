/**
 * Category System Type Definitions
 * Comprehensive types for the BazaarAF e-commerce platform category system
 */

// ============================================
// CATEGORY TYPES
// ============================================

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parent?: string;
  level: 'main' | 'sub' | 'production';
  image_url?: string;
  icon?: string;
  display_order: number;
  is_active: boolean;
  product_count: number;
  children?: Category[];
  full_path: string;
  commission_rate: number;
  requires_approval: boolean;
  min_price?: number;
  max_price?: number;
  meta_title?: string;
  meta_description?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// CATEGORY ATTRIBUTE TYPES
// ============================================

export interface AttributeValue {
  id: string;
  value: string;
  display_order: number;
}

export interface CategoryAttribute {
  id: string;
  name: string;
  attribute_type: 'text' | 'number' | 'select' | 'multi_select' | 'boolean';
  is_required: boolean;
  is_filterable: boolean;
  display_order: number;
  values?: AttributeValue[];
}

// ============================================
// PRODUCT TYPES
// ============================================

export interface ProductImage {
  id: string;
  image_url: string;
  is_primary: boolean;
  display_order: number;
}

export interface ProductAttribute {
  id: string;
  attribute: string;
  attribute_name: string;
  attribute_type: string;
  value: string;
}

export interface Vendor {
  id: string;
  shop_name: string;
  primary_color?: string;
  logo?: string;
  banner?: string;
  favicon?: string;
  featured_products?: string[];
  user: {
    phone: string;
    full_name: string;
  };
  status: 'pending' | 'approved' | 'suspended';
  is_verified?: boolean;
  commission_rate: number;
}

export interface Product {
  sales_count?: number;
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  original_price?: number;
  discount_percentage: number;
  category_name?: string;
  vendor?: Vendor;
  vendor_name?: string;
  vendor_verified?: boolean;
  primary_image?: string;
  average_rating: number;
  review_count: number;
  cod_available: boolean;
  in_stock: boolean;
  is_featured: boolean;
  created_at: string;
  images?: ProductImage[];
}

export interface ProductDetail extends Product {
  category: Category;
  vendor: Vendor;
  vendor_id: string;
  images: ProductImage[];
  product_attributes: ProductAttribute[];
  stock_quantity: number;
  is_low_stock: boolean;
  views_count: number;
  sales_count: number;
  approval_status: 'pending' | 'approved' | 'rejected';
  meta_title?: string;
  meta_description?: string;
  cod_available: boolean;
  low_stock_threshold: number;
}

// ============================================
// FILTER & SEARCH TYPES
// ============================================

export interface ProductFilters {
  category_slug?: string;
  min_price?: number;
  max_price?: number;
  search?: string;
  ordering?: string;
  page?: number;
  [key: string]: any;
}

export interface SearchResult {
  results: Product[];
  categories: Category[];
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ============================================
// FORM DATA TYPES
// ============================================

export interface CreateProductFormData {
  name: string;
  description: string;
  category_id: string;
  price: number;
  original_price?: number;
  stock_quantity: number;
  cod_available: boolean;
  attributes: Record<string, string>;
  images: File[];
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  error?: string;
}
