import { api } from './api';
import { Vendor, PaginatedResponse } from '../types/api';

export const vendorService = {
  async getVendors(params?: {
    page?: number;
    page_size?: number;
    status?: string;
    search?: string;
  }): Promise<PaginatedResponse<Vendor>> {
    const queryParams: Record<string, string> = {};
    
    if (params?.page) queryParams.page = params.page.toString();
    if (params?.page_size) queryParams.page_size = params.page_size.toString();
    if (params?.status) queryParams.status = params.status;
    if (params?.search) queryParams.search = params.search;
    
    const response = await api.get<PaginatedResponse<Vendor>>('/vendors/', {
      params: queryParams,
    });
    return response.data;
  },

  async getVendor(vendorId: string): Promise<Vendor> {
    const response = await api.get<Vendor>(`/vendors/${vendorId}/`);
    return response.data;
  },

  async approveVendor(vendorId: string): Promise<{ status: string; message: string }> {
    const response = await api.post<{ status: string; message: string }>(
      `/vendors/${vendorId}/approve/`,
      {}
    );
    return response.data;
  },

  async rejectVendor(vendorId: string, reason: string = ''): Promise<{ status: string; message: string }> {
    const response = await api.post<{ status: string; message: string }>(
      `/vendors/${vendorId}/reject/`,
      { reason }
    );
    return response.data;
  },

  async suspendVendor(vendorId: string): Promise<{ status: string; message: string }> {
    const response = await api.post<{ status: string; message: string }>(
      `/vendors/${vendorId}/suspend/`,
      {}
    );
    return response.data;
  },

  async getVendorStats(vendorId: string): Promise<any> {
    const response = await api.get(`/vendors/${vendorId}/stats/`);
    return response.data;
  },
};