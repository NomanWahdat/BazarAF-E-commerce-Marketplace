/**
 * Category and Product API Service
 * Comprehensive API integration for BazaarAF e-commerce platform
 */

import { api } from './api';
import {
  Category,
  CategoryAttribute,
  Product,
  ProductDetail,
  ProductFilters,
  SearchResult,
  PaginatedResponse,
} from '@/types/category';

// ============================================
// CATEGORY API
// ============================================

export const categoryAPI = {
  /**
   * Get complete category tree for navigation
   */
  getCategoryTree: async (): Promise<Category[]> => {
    try {
      const response = await api.get<Category[]>('/categories/tree/');
      return response.data;
    } catch (error) {
      console.error('Error fetching category tree:', error);
      return [];
    }
  },

  /**
   * Get main categories only (for homepage)
   */
  getMainCategories: async (): Promise<Category[]> => {
    try {
      const response = await api.get<Category[]>('/categories/main_categories/');
      return response.data;
    } catch (error) {
      console.error('Error fetching main categories:', error);
      return [];
    }
  },

  /**
   * Get single category by slug
   */
  getCategory: async (slug: string): Promise<Category | null> => {
    try {
      const response = await api.get<Category>(`/categories/${slug}/`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching category ${slug}:`, error);
      return null;
    }
  },

  /**
   * Get category attributes
   */
  getCategoryAttributes: async (slug: string): Promise<CategoryAttribute[]> => {
    try {
      const response = await api.get<CategoryAttribute[]>(
        `/categories/${slug}/attributes/`
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching attributes for ${slug}:`, error);
      return [];
    }
  },

  /**
   * Get products in a category (admin)
   */
  getCategoryProducts: async (
    slug: string,
    page: number = 1
  ): Promise<PaginatedResponse<Product>> => {
    try {
      const response = await api.get<PaginatedResponse<Product>>(
        `/categories/${slug}/products/?page=${page}`
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching products for category ${slug}:`, error);
      return { count: 0, next: null, previous: null, results: [] };
    }
  },

  /**
   * Create category (admin only)
   */
  createCategory: async (data: Partial<Category>): Promise<Category | null> => {
    try {
      const response = await api.post<Category>('/categories/', data);
      return response.data;
    } catch (error) {
      console.error('Error creating category:', error);
      return null;
    }
  },

  /**
   * Update category (admin only)
   */
  updateCategory: async (
    identifier: string,
    data: Partial<Category>
  ): Promise<Category | null> => {
    try {
      const response = await api.patch<Category>(`/categories/${identifier}/`, data);
      return response.data;
    } catch (error) {
      console.error(`Error updating category ${identifier}:`, error);
      return null;
    }
  },

  /**
   * Delete category (admin only)
   */
  deleteCategory: async (identifier: string): Promise<boolean> => {
    try {
      await api.delete(`/categories/${identifier}/`);
      return true;
    } catch (error) {
      console.error(`Error deleting category ${identifier}:`, error);
      return false;
    }
  },
};

// ============================================
// PRODUCT API
// ============================================

export const productAPI = {
  /**
   * Get products with filtering and pagination
   */
  getProducts: async (
    filters?: ProductFilters,
    page: number = 1
  ): Promise<PaginatedResponse<Product>> => {
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, String(value));
          }
        });
      }

      const response = await api.get<PaginatedResponse<Product>>(
        `/products/?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching products:', error);
      return { count: 0, next: null, previous: null, results: [] };
    }
  },

  /**
   * Get single product by ID
   */
  getProduct: async (id: string): Promise<ProductDetail | null> => {
    try {
      // Increment views first
      await productAPI.incrementViews(id);
      // Then fetch the updated product data with new views_count
      const updatedResponse = await api.get<ProductDetail>(`/products/${id}/`);
      return updatedResponse.data;
    } catch (error) {
      console.error(`Error fetching product ${id}:`, error);
      return null;
    }
  },

  /**
   * Search products and categories
   */
  search: async (query: string): Promise<SearchResult> => {
    try {
      if (!query || query.trim().length < 2) {
        return { results: [], categories: [] };
      }
      const response = await api.get<SearchResult>(
        `/products/search/?q=${encodeURIComponent(query)}`
      );
      return response.data;
    } catch (error) {
      console.error('Error searching:', error);
      return { results: [], categories: [] };
    }
  },

  /**
   * Get featured products for homepage
   */
  getFeaturedProducts: async (limit: number = 8): Promise<Product[]> => {
    try {
      const response = await api.get<Product[]>(
        `/products/featured/?limit=${limit}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching featured products:', error);
      return [];
    }
  },

  /**
   * Create product (vendor)
   */
  createProduct: async (data: { name: string; description: string; category: string; price: number; stock_quantity: number; cod_available: boolean; attributes?: { attribute: string; value: string }[] }): Promise<ProductDetail> => {
    const response = await api.post<ProductDetail>('/products/', data);
    return response.data;
  },

  /**
   * Update product (vendor/admin)
   */
  updateProduct: async (
    id: string,
    data: Partial<ProductDetail>
  ): Promise<ProductDetail | null> => {
    try {
      const response = await api.patch<ProductDetail>(`/products/${id}/`, data);
      return response.data;
    } catch (error) {
      console.error(`Error updating product ${id}:`, error);
      return null;
    }
  },

  /**
   * Delete product (vendor/admin)
   */
  deleteProduct: async (id: string): Promise<boolean> => {
    try {
      await api.delete(`/products/${id}/`);
      return true;
    } catch (error) {
      console.error(`Error deleting product ${id}:`, error);
      return false;
    }
  },

  /**
   * Upload product images
   */
  uploadImages: async (
    productId: string,
    files: File[]
  ): Promise<{ id: string; url: string }[] | null> => {
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('images', file));

      const response = await api.post<{
        images: { id: string; url: string }[];
      }>(`/products/${productId}/upload_images/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data.images;
    } catch (error) {
      console.error(`Error uploading images for product ${productId}:`, error);
      return null;
    }
  },

  /**
   * Increment product view count
   */
  incrementViews: async (productId: string): Promise<number> => {
    try {
      const response = await api.post<{ views_count: number }>(
        `/products/${productId}/increment_views/`
      );
      return response.data.views_count;
    } catch (error) {
      console.error(`Error incrementing views for ${productId}:`, error);
      return 0;
    }
  },

  /**
   * Get product reviews
   */
  getReviews: async (productId: string): Promise<any[]> => {
    try {
      const response = await api.get<any[]>(`/products/${productId}/reviews/`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching reviews for ${productId}:`, error);
      return [];
    }
  },

  /**
   * Admin: Approve pending product
   */
  approveProduct: async (productId: string): Promise<ProductDetail | null> => {
    try {
      const response = await api.post<ProductDetail>(
        `/products/${productId}/approve/`
      );
      return response.data;
    } catch (error) {
      console.error(`Error approving product ${productId}:`, error);
      return null;
    }
  },

  /**
   * Admin: Reject pending product
   */
  rejectProduct: async (
    productId: string,
    reason: string
  ): Promise<ProductDetail | null> => {
    try {
      const response = await api.post<ProductDetail>(
        `/products/${productId}/reject/`,
        { reason }
      );
      return response.data;
    } catch (error) {
      console.error(`Error rejecting product ${productId}:`, error);
      return null;
    }
  },

  /**
   * Toggle product featured status
   */
  toggleFeatured: async (productId: string): Promise<boolean> => {
    try {
      const response = await api.post<{ is_featured: boolean }>(
        `/products/${productId}/toggle_featured/`
      );
      return response.data.is_featured;
    } catch (error) {
      console.error(`Error toggling featured for ${productId}:`, error);
      return false;
    }
  },
};

export default {
  categories: categoryAPI,
  products: productAPI,
};
