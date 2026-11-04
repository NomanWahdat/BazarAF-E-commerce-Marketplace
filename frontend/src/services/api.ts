// File: frontend/src/services/api.ts

import axios from 'axios';
import i18n from '../i18n';

// Base URL for your Django backend
const DEFAULT_API_BASE_URL = import.meta.env.PROD
  ? 'https://bazaraf-production.up.railway.app/api'
  : 'http://localhost:8000/api';
const API_BASE_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, '');

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    config.headers['Accept-Language'] = i18n.resolvedLanguage || 'en';
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// One refresh in flight prevents concurrent requests from replaying rotated tokens.
let refreshInFlight: Promise<string> | null = null;
api.interceptors.response.use(
  response => response,
  async error => {
    const original = error.config;
    const authenticationRequest = /\/auth\//.test(original?.url || '');
    const refresh = localStorage.getItem('refresh_token');
    if (error.response?.status !== 401 || !original || original._retry || authenticationRequest || !refresh) {
      return Promise.reject(error);
    }
    original._retry = true;
    try {
      if (!refreshInFlight) {
        refreshInFlight = axios.post(`${API_BASE_URL}/auth/token/refresh/`, { refresh }, { timeout: 15000 })
          .then(({ data }) => {
            localStorage.setItem('access_token', data.access);
            if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
            return data.access as string;
          }).finally(() => { refreshInFlight = null; });
      }
      original.headers.Authorization = `Bearer ${await refreshInFlight}`;
      return api(original);
    } catch (refreshError) {
      if (axios.isAxiosError(refreshError) && [400, 401, 403].includes(refreshError.response?.status || 0)) {
        ['access_token', 'refresh_token', 'user'].forEach(key => localStorage.removeItem(key));
        window.dispatchEvent(new Event('authExpired'));
      }
      return Promise.reject(error);
    }
  }
);

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback;
  if (!error.response) return i18n.t('network_error');
  const data = error.response.data;
  if (typeof data?.message === 'string') return data.message;
  if (typeof data?.detail === 'string') return data.detail;
  const values = Object.values(data?.errors || data || {}).flat();
  return values.filter(value => typeof value === 'string').join(' ') || fallback;
}

// Authentication API calls
export const authAPI = {
  login: async (identifier: string, password: string) => {
    const response = await api.post('/auth/login/', { identifier, password });
    return response.data;
  },

  verifyTwoFactor: async (challengeToken: string, code: string) => {
    const response = await api.post('/auth/2fa/verify/', {
      challenge_token: challengeToken,
      code,
    });
    return response.data;
  },

  register: async (userData: {
    full_name: string;
    phone: string;
    email: string;
    password: string;
    password_confirm: string;
    role: string;
    frontend_url?: string;
  }) => {
    const response = await api.post('/auth/register/', userData);
    return response.data;
  },

  logout: async (refreshToken: string) => {
    const response = await api.post('/auth/logout/', { refresh: refreshToken });
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/user/');
    return response.data;
  },
  
  googleAuth: async (credential: string) => {
    const response = await api.post('/auth/google/', { credential });
    return response.data;
  },

  resendVerificationEmail: async (email: string) => {
    const response = await api.post('/auth/resend-verification/', { email });
    return response.data;
  },

  verifyEmail: async (email: string, otp: string) => {
    const response = await api.post('/auth/verify-email/', { email, otp });
    return response.data;
  },
};
// frontend/src/services/api.ts
export const createOrder = async (orderData: any) => {
  const response = await api.post('/orders/checkout/', orderData); // ✅ Correct URL
  return response.data;
};


// Product API calls
export const getProducts = async (params?: { page?: number; page_size?: number; category?: string }) => {
  const response = await api.get('/products/', { params });
  return response.data;
};

export const getCategories = async () => {
  const response = await api.get('/products/', { params: { page_size: 1000 } });
  const products = response.data.results;

  const categoryCount: Record<string, number> = {};
  products.forEach((product: any) => {
    categoryCount[product.category] = (categoryCount[product.category] || 0) + 1;
  });

  return Object.entries(categoryCount).map(([name, count]) => ({
    name,
    productCount: count,
  }));
};

// Notification API calls
export const notificationAPI = {
  // Get all notifications
  getNotifications: async () => {
    const response = await api.get('/notifications/');
    const payload = response.data;
    return Array.isArray(payload)
      ? payload
      : payload.results ?? payload;
  },

  // Get unread count
  getUnreadCount: async () => {
    const response = await api.get('/notifications/unread_count/');
    return response.data.count;
  },

  // Mark as read
  markAsRead: async (notificationId: string) => {
    const response = await api.post(`/notifications/${notificationId}/mark_as_read/`);
    return response.data;
  },

  // Mark all as read
  markAllAsRead: async () => {
    const response = await api.post('/notifications/mark_all_read/');
    return response.data;
  },
};

export default api;