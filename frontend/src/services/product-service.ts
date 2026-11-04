// File: src/services/product-service.ts
import { api } from './api';
import { Product, PaginatedResponse } from '../types/api';

export const productService = {
  // ==================== GET PRODUCTS ====================
  async getProducts(params?: {
    page?: number;
    page_size?: number;
    category?: string;
    vendor_id?: string;
    status?: string; // Changed from is_active to status
  }): Promise<PaginatedResponse<Product>> {
    const queryParams: Record<string, string> = {};
    
    if (params?.page) queryParams.page = params.page.toString();
    if (params?.page_size) queryParams.page_size = params.page_size.toString();
    if (params?.category) queryParams.category = params.category;
    if (params?.vendor_id) queryParams.vendor_id = params.vendor_id;
    if (params?.status) queryParams.status = params.status; // Using status field
    
    try {
      const response = await api.get<PaginatedResponse<Product>>('/products/', {
        params: queryParams,
      });
      return response.data;
    } catch (error) {
      console.error('❌ Failed to load products:', error);
      throw error;
    }
  },

  // ==================== GET SINGLE PRODUCT ====================
  async getProduct(productId: string): Promise<Product> {
    try {
      const response = await api.get<Product>(`/products/${productId}/`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to load product:', error);
      throw error;
    }
  },

  // ==================== DELETE PRODUCT ====================
  async deleteProduct(productId: string): Promise<void> {
    try {
      await api.delete(`/products/${productId}/`);
    } catch (error) {
      console.error('❌ Failed to delete product:', error);
      throw error;
    }
  },

  // ==================== GET APPROVED PRODUCTS ====================
  async getApprovedProducts(params?: { 
    page_size?: number;
    category?: string; 
  }): Promise<Product[]> {
    try {
      const response = await api.get<PaginatedResponse<Product>>('/products/', {
        params: {
          status: 'approved',
          page_size: String(params?.page_size || 100),
          ...(params?.category ? { category: params.category } : {}),
        },
      });
      return response.data.results;
    } catch (error) {
      console.error('❌ Failed to load approved products:', error);
      throw error;
    }
  },

  // ==================== GET PENDING PRODUCTS ====================
  async getPendingProducts(): Promise<Product[]> {
    try {
      const response = await api.get<PaginatedResponse<Product>>('/products/', {
        params: { status: 'pending', page_size: '100' },
      });
      return response.data.results;
    } catch (error) {
      console.error('❌ Failed to load pending products:', error);
      throw error;
    }
  },

  // ==================== GET INACTIVE PRODUCTS ====================
  async getInactiveProducts(): Promise<Product[]> {
    try {
      const response = await api.get<PaginatedResponse<Product>>('/products/', {
        params: { status: 'inactive', page_size: '100' },
      });
      return response.data.results;
    } catch (error) {
      console.error('❌ Failed to load inactive products:', error);
      throw error;
    }
  },

  // ==================== GET REJECTED PRODUCTS ====================
  async getRejectedProducts(): Promise<Product[]> {
    try {
      const response = await api.get<PaginatedResponse<Product>>('/products/', {
        params: { status: 'rejected', page_size: '100' },
      });
      return response.data.results;
    } catch (error) {
      console.error('❌ Failed to load rejected products:', error);
      throw error;
    }
  },

  // ==================== GET VENDOR PRODUCTS ====================
  async getVendorProducts(vendorId: string): Promise<Product[]> {
    try {
      const response = await api.get<PaginatedResponse<Product>>('/products/', {
        params: { vendor_id: vendorId, page_size: '100' },
      });
      return response.data.results;
    } catch (error) {
      console.error(`❌ Failed to load vendor ${vendorId} products:`, error);
      throw error;
    }
  },

  // ==================== ADMIN APPROVAL FUNCTIONS ====================
  async approveProduct(productId: string): Promise<Product> {
    try {
      const response = await api.post<Product>(`/products/${productId}/approve/`, {});
      return response.data;
    } catch (error) {
      console.error('❌ Failed to approve product:', error);
      throw error;
    }
  },

  async rejectProduct(productId: string, reason?: string): Promise<Product> {
    try {
      const response = await api.post<Product>(`/products/${productId}/reject/`, {
        reason: reason || 'Product does not meet our standards'
      });
      return response.data;
    } catch (error) {
      console.error('❌ Failed to reject product:', error);
      throw error;
    }
  },

  async rejectProductWithReason(productId: string, reason: string): Promise<Product> {
    return this.rejectProduct(productId, reason);
  },

  async deactivateProduct(productId: string): Promise<Product> {
    try {
      const response = await api.post<Product>(`/products/${productId}/toggle_active/`, {});
      return response.data;
    } catch (error) {
      console.error('❌ Failed to deactivate product:', error);
      throw error;
    }
  },
};