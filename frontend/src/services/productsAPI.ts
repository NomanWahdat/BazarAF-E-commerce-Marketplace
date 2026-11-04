// File: frontend/src/services/productsAPI.ts

import { api } from './api';

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon: string;
  level: 'main' | 'sub' | 'production';
  color?: string;
  order?: number;
  product_count: number;
  is_active: boolean;
  parent_id?: string;
  parent_name?: string;
  subcategories?: Category[];
}

export interface ProductImage {
  id: string;
  image: string;
  image_url: string;
}

export interface Vendor {
  id: string;
  shop_name: string;
  user?: {
    phone: string;
  };
  is_verified: boolean;
}

export interface Product {
  id: string;
  slug: string;
  vendor: Vendor;
  vendor_name?: string;
  vendor_verified?: boolean;
  name: string;
  description: string;
  price: string;
  original_price: string | null;
  stock_quantity: number;
  category: string;
  category_name: string;
  status: 'pending' | 'approved' | 'rejected'; 
  images: ProductImage[];
  primary_image?: string;
  cod_available: boolean;
  in_stock: boolean;
  is_featured: boolean;
  created_at: string;
  average_rating: number;
  review_count: number;
  discount_percentage: number;
}

export interface ProductReview {
  id: string;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface ProductsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Product[];
}

export const productsAPI = {
  // Categories
  getCategories: async () => {
    const response = await api.get<Category[]>('/categories/');
    return response.data;
  },

  getCategoryProducts: async (categoryId: string, page: number = 1) => {
    const response = await api.get<ProductsResponse>(`/categories/${categoryId}/products/`, {
      params: { page },
    });
    return response.data;
  },

  // Products
  getProducts: async (params?: {
    page?: number;
    search?: string;
    category?: string;
    category_id?: string;
    min_price?: number;
    max_price?: number;
    vendor_id?: string;
    ordering?: string;
  }) => {
    const response = await api.get<ProductsResponse>('/products/', { params });
    return response.data;
  },

  getProduct: async (id: string) => {
    const response = await api.get<Product>(`/products/${id}/`);
    return response.data;
  },

  getProductsByCategory: async (category: string, page: number = 1) => {
    const response = await api.get<ProductsResponse>('/products/', {
      params: { category, page },
    });
    return response.data;
  },

  searchProducts: async (query: string, page: number = 1) => {
    const response = await api.get<ProductsResponse>('/products/', {
      params: { search: query, page },
    });
    return response.data;
  },

  getFeaturedProducts: async () => {
    const response = await api.get<ProductsResponse>('/products/', {
      params: { page: 1, ordering: '-created_at' },
    });
    return response.data;
  },

  // Product Reviews
  getProductReviews: async (productId: string) => {
    const response = await api.get<ProductReview[]>(`/products/${productId}/reviews/`);
    return response.data;
  },

  // User Reviews
  getMyReviews: async () => {
    const response = await api.get('/user/reviews/');
    return response.data;
  },

  createReview: async (data: {
    product_id: string;
    order_id: string;
    rating: number;
    comment: string;
  }) => {
    const response = await api.post('/user/reviews/', data);
    return response.data;
  },

  updateReview: async (reviewId: string, data: { rating: number; comment: string }) => {
    const response = await api.put(`/user/reviews/${reviewId}/`, data);
    return response.data;
  },

  deleteReview: async (reviewId: string) => {
    const response = await api.delete(`/user/reviews/${reviewId}/`);
    return response.data;
  },
  // Add to productsAPI
  createProduct: async (data: FormData) => {
  const response = await api.post('/products/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
},

};