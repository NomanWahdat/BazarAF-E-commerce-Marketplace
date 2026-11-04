import { lazy } from 'react';
/**
 * Admin Routes Configuration
 * All admin pages require authentication and admin role
 */
import { Route } from 'react-router-dom';
import ProtectedRoute from '@/utils/ProtectedRoute';
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const AdminSellerApplications = lazy(() => import('@/pages/AdminSellerApplications'));
const AdminProductModeration = lazy(() => import('@/pages/AdminProductModeration'));
const AdminOrderOperations = lazy(() => import('@/pages/AdminOrderOperations'));
const AdminCommissionManagement = lazy(() => import('@/pages/AdminCommissionManagement'));
const AdminReviewModeration = lazy(() => import('@/pages/AdminReviewModeration'));
const AdminVendorPerformance = lazy(() => import('@/pages/AdminVendorPerformance'));

/**
 * All admin routes are configured here with role-based protection
 * Each route requires admin role authentication
 * Backend additionally enforces IsAdminUser permission on all API endpoints
 */
export const adminRoutes = [
  // Dashboard & Home
  <Route 
    key="admin-dashboard" 
    path="/admin" 
    element={
      <ProtectedRoute role="admin">
        <AdminDashboard />
      </ProtectedRoute>
    } 
  />,
  <Route 
    key="admin-home" 
    path="/admin/" 
    element={
      <ProtectedRoute role="admin">
        <AdminDashboard />
      </ProtectedRoute>
    } 
  />,
  
  // Seller Application Review
  <Route
    key="admin-seller-apps"
    path="/admin/seller-applications"
    element={
      <ProtectedRoute role="admin">
        <AdminSellerApplications />
      </ProtectedRoute>
    }
  />,
  
  // Product Moderation
  <Route
    key="admin-products"
    path="/admin/product-moderation"
    element={
      <ProtectedRoute role="admin">
        <AdminProductModeration />
      </ProtectedRoute>
    }
  />,
  
  // Order Operations
  <Route
    key="admin-orders"
    path="/admin/order-operations"
    element={
      <ProtectedRoute role="admin">
        <AdminOrderOperations />
      </ProtectedRoute>
    }
  />,
  
  // Commission Management
  <Route
    key="admin-commissions"
    path="/admin/commission-management"
    element={
      <ProtectedRoute role="admin">
        <AdminCommissionManagement />
      </ProtectedRoute>
    }
  />,
  
  // Review Moderation
  <Route
    key="admin-reviews"
    path="/admin/review-moderation"
    element={
      <ProtectedRoute role="admin">
        <AdminReviewModeration />
      </ProtectedRoute>
    }
  />,
  
  // Vendor Performance Tracking
  <Route
    key="admin-performance"
    path="/admin/vendor-performance"
    element={
      <ProtectedRoute role="admin">
        <AdminVendorPerformance />
      </ProtectedRoute>
    }
  />,
];

export default adminRoutes;
