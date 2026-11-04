/**
 * Admin Dashboard Service
 * Handles all API calls for admin operations
 */
import api from './api';

export const adminService = {
  // Dashboard Summary
  getDashboardSummary: async () => {
    const response = await api.get('/admin/dashboard/summary/');
    return response.data;
  },

  getOrderTrends: async () => {
    const response = await api.get('/admin/dashboard/order_trends/');
    return response.data;
  },

  // Seller Applications
  getSellerApplications: async (params = {}) => {
    const response = await api.get('/admin/seller-applications/', { params });
    return response.data;
  },

  approveApplication: async (applicationId: string, data = {}) => {
    const response = await api.post(
      `/admin/seller-applications/${applicationId}/approve/`,
      data
    );
    return response.data;
  },

  rejectApplication: async (applicationId: string, data: Record<string, unknown>) => {
    const response = await api.post(
      `/admin/seller-applications/${applicationId}/reject/`,
      data
    );
    return response.data;
  },

  // Product Moderation
  getProductsForModeration: async (params = {}) => {
    const response = await api.get('/admin/product-moderation/', { params });
    return response.data;
  },

  approveProduct: async (productId: string) => {
    const response = await api.post(
      `/admin/product-moderation/${productId}/approve/`
    );
    return response.data;
  },

  rejectProduct: async (productId: string, data: Record<string, unknown>) => {
    const response = await api.post(
      `/admin/product-moderation/${productId}/reject/`,
      data
    );
    return response.data;
  },

  bulkApproveProducts: async (data: Record<string, unknown>) => {
    const response = await api.post(
      '/admin/product-moderation/bulk_approve/',
      data
    );
    return response.data;
  },

  bulkRejectProducts: async (data: Record<string, unknown>) => {
    const response = await api.post(
      '/admin/product-moderation/bulk_reject/',
      data
    );
    return response.data;
  },

  // Order Operations
  getOrdersForOperations: async (params = {}) => {
    const response = await api.get('/admin/order-operations/', { params });
    return response.data;
  },

  getOrderDetails: async (orderId: string) => {
    const response = await api.get(`/admin/order-operations/${orderId}/`);
    return response.data;
  },

  assignRider: async (orderId: string, data: Record<string, unknown>) => {
    const response = await api.post(
      `/admin/order-operations/${orderId}/assign_rider/`,
      data
    );
    return response.data;
  },

  updateOrderStatus: async (orderId: string, data: Record<string, unknown>) => {
    const response = await api.post(
      `/admin/order-operations/${orderId}/update_status/`,
      data
    );
    return response.data;
  },

  batchUpdateOrderStatus: async (data: Record<string, unknown>) => {
    const response = await api.post(
      '/admin/order-operations/batch_update_status/',
      data
    );
    return response.data;
  },

  // Commission Management
  getVendorsForCommission: async (params = {}) => {
    const response = await api.get('/admin/commission-management/', { params });
    return response.data;
  },

  updateCommissionRate: async (vendorId: string, data: Record<string, unknown>) => {
    const response = await api.post(
      `/admin/commission-management/${vendorId}/update_commission/`,
      data
    );
    return response.data;
  },

  getCommissionHistory: async (vendorId: string) => {
    const response = await api.get(
      `/admin/commission-management/${vendorId}/commission_history/`
    );
    return response.data;
  },

  previewPayoutImpact: async (vendorId: string, data: Record<string, unknown>) => {
    const response = await api.post(
      `/admin/commission-management/${vendorId}/preview_payout_impact/`,
      data
    );
    return response.data;
  },

  // Review Moderation
  getReviewsForModeration: async (params = {}) => {
    const response = await api.get('/admin/review-moderation/', { params });
    return response.data;
  },

  flagReview: async (reviewId: string, data: Record<string, unknown>) => {
    const response = await api.post(
      `/admin/review-moderation/${reviewId}/flag_review/`,
      data
    );
    return response.data;
  },

  unflagReview: async (moderationId: string) => {
    const response = await api.post(
      `/admin/review-moderation/${moderationId}/unflag_review/`
    );
    return response.data;
  },

  deleteReview: async (moderationId: string, data: Record<string, unknown>) => {
    const response = await api.post(
      `/admin/review-moderation/${moderationId}/delete_review/`,
      data
    );
    return response.data;
  },

  // Vendor Performance
  getVendorsPerformance: async (params = {}) => {
    const response = await api.get('/admin/vendor-performance/', { params });
    return response.data;
  },

  getVendorMetrics: async (vendorId: string) => {
    const response = await api.get(
      `/admin/vendor-performance/${vendorId}/performance_metrics/`
    );
    return response.data;
  },
};

export default adminService;
