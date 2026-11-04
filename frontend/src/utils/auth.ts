// File: frontend/src/utils/auth.ts

import { authAPI } from '../services/api';

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem('access_token');
  return !!token;
};

// Get current user from localStorage
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

// Logout function with confirmation
export const logout = async (navigate: (path: string) => void, showConfirm: boolean = true) => {
  // Show confirmation dialog
  if (showConfirm) {
    const confirmed = window.confirm('Are you sure you want to logout?');
    if (!confirmed) return;
  }

  try {
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (refreshToken) {
      // Call backend to blacklist token
      await authAPI.logout(refreshToken);
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Clear localStorage regardless of API call success
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    
    // Show success message
    alert('Logged out successfully!');
    
    // Navigate to login
    navigate('/login');
  }
};

// Get user role
export const getUserRole = (): string | null => {
  const user = getCurrentUser();
  return user?.role || null;
};

// Check if user has specific role
export const hasRole = (role: string): boolean => {
  const userRole = getUserRole();
  return userRole === role;
};

// Get user full name
export const getUserName = (): string => {
  const user = getCurrentUser();
  return user?.full_name || 'User';
};