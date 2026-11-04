// File: src/services/order-service.ts
import { api } from './api';
import { Order, PaginatedResponse, OrderStatusCounts } from '../types/api';

export const orderService = {
  // ==================== GET ORDERS ====================
  async getOrders(params?: {
    page?: number;
    page_size?: number;
    status?: string;
    ordering?: string;
  }): Promise<PaginatedResponse<Order>> {
    const queryParams: Record<string, string> = {};
    
    if (params?.page) queryParams.page = params.page.toString();
    if (params?.page_size) queryParams.page_size = params.page_size.toString();
    if (params?.status) queryParams.status = params.status;
    if (params?.ordering) queryParams.ordering = params.ordering;
    
    try {
      const response = await api.get<PaginatedResponse<Order>>('/orders/', {
        params: queryParams,
      });
      // console.log('✅ Orders loaded:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to load orders:', error);
      throw error;
    }
  },

  // ==================== GET SINGLE ORDER ====================
  async getOrder(orderId: string): Promise<Order> {
    try {
      const response = await api.get<Order>(`/orders/${orderId}/`);
      // console.log('✅ Order loaded:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to load order:', error);
      throw error;
    }
  },

  // ==================== UPDATE ORDER STATUS ====================
  async updateOrderStatus(orderId: string, data: { status: string }): Promise<Order> {
    try {
      const response = await api.patch<Order>(`/orders/${orderId}/`, data);
      // console.log('✅ Order status updated:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to update order status:', error);
      throw error;
    }
  },

  // ==================== CONFIRM ORDER ====================
  async confirmOrder(orderId: string): Promise<{ status: string; message: string }> {
    try {
      const response = await api.post<{ status: string; message: string }>(
        `/orders/${orderId}/confirm/`,
        {}
      );
      // console.log('✅ Order confirmed:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to confirm order:', error);
      throw error;
    }
  },

  // ==================== GET STATUS COUNTS ====================
  async getStatusCounts(): Promise<OrderStatusCounts> {
    try {
      const response = await api.get<OrderStatusCounts>('/orders/status-counts/');
      // console.log('✅ Order status counts loaded:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to load order status counts:', error);
      throw error;
    }
  },

  // ==================== GET ORDERS BY STATUS ====================
  async getOrdersByStatus(status: 'pending' | 'confirmed' | 'picked' | 'delivered' | 'cancelled'): Promise<Order[]> {
    try {
      const response = await api.get<PaginatedResponse<Order>>('/orders/', {
        params: { status, page_size: '100' },
      });
      console.log(`✅ ${status} orders loaded:`, response.data);
      return response.data.results;
    } catch (error) {
      console.error(`❌ Failed to load ${status} orders:`, error);
      throw error;
    }
  },

  // ==================== BULK UPDATE STATUS ====================
  async bulkUpdateStatus(orderIds: string[], status: string): Promise<{ success: boolean; updated: number }> {
    try {
      const response = await api.post<{ success: boolean; updated: number }>(
        '/orders/bulk-update-status/',
        { order_ids: orderIds, status }
      );
      // console.log('✅ Bulk status update completed:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to bulk update status:', error);
      throw error;
    }
  },
};