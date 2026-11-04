/**
 * Admin Dashboard - Main Page
 * Implements 8 core admin modules for marketplace management
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import {
  AlertCircle,
  Users,
  Package,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  MessageSquare,
  BarChart3,
  ArrowRight,
} from 'lucide-react';
import adminService from '@/services/adminService';
import Layout from '@/app/components/layout/Layout';

interface DashboardStats {
  pending_sellers: number;
  pending_products: number;
  pending_orders: number;
  active_orders: number;
  pending_reviews: number;
  flagged_reviews: number;
  total_vendors: number;
  total_sales: number;
  timestamp: string;
}

interface OrderTrend {
  date: string;
  count: number;
}

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trends, setTrends] = useState<OrderTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [dashboardStats, orderTrends] = await Promise.all([
        adminService.getDashboardSummary(),
        adminService.getOrderTrends(),
      ]);
      setStats(dashboardStats);
      setTrends(orderTrends);
      setError(null);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout variant="admin" showFooter={false}>
        <div className="flex items-center justify-center h-screen">
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout variant="admin" showFooter={false}>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout variant="admin" showFooter={false}>
      <div className="space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Pending Seller Applications */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Pending Applications
                  </p>
                  <p className="text-3xl font-bold text-blue-600">
                    {stats?.pending_sellers || 0}
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-400" />
              </div>
              <Button
                variant="link"
                size="sm"
                className="mt-4 p-0"
                onClick={() => navigate('/admin/seller-applications')}
              >
                Review Now <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Pending Product Approvals */}
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Pending Products
                  </p>
                  <p className="text-3xl font-bold text-amber-600">
                    {stats?.pending_products || 0}
                  </p>
                </div>
                <Package className="h-8 w-8 text-amber-400" />
              </div>
              <Button
                variant="link"
                size="sm"
                className="mt-4 p-0"
                onClick={() => navigate('/admin/product-moderation')}
              >
                Moderate Now <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Active Orders */}
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground">Active Orders</p>
                  <p className="text-3xl font-bold text-green-600">
                    {stats?.active_orders || 0}
                  </p>
                </div>
                <ShoppingCart className="h-8 w-8 text-green-400" />
              </div>
              <Button
                variant="link"
                size="sm"
                className="mt-4 p-0"
                onClick={() => navigate('/admin/order-operations')}
              >
                Manage Orders <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* New Reviews */}
          <Card className="border-indigo-200 bg-indigo-50">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground">New Reviews</p>
                  <p className="text-3xl font-bold text-indigo-600">
                    {stats?.pending_reviews || 0}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-indigo-400" />
              </div>
              <Button
                variant="link"
                size="sm"
                className="mt-4 p-0"
                onClick={() => navigate('/admin/review-moderation')}
              >
                Moderate Reviews <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Flagged Reviews */}
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Flagged Reviews
                  </p>
                  <p className="text-3xl font-bold text-red-600">
                    {stats?.flagged_reviews || 0}
                  </p>
                </div>
                <MessageSquare className="h-8 w-8 text-red-400" />
              </div>
              <Button
                variant="link"
                size="sm"
                className="mt-4 p-0"
                onClick={() => navigate('/admin/review-moderation')}
              >
                Review Flagged <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Active Vendors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats?.total_vendors || 0}</p>
              <Button
                variant="link"
                size="sm"
                className="mt-4 p-0"
                onClick={() => navigate('/admin/vendor-performance')}
              >
                View Performance <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Total Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                AFN {(stats?.total_sales || 0).toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                All-time marketplace revenue
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Commission Mgmt
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Manage vendor commission rates and view payout impacts
              </p>
              <Button
                variant="link"
                size="sm"
                className="p-0"
                onClick={() => navigate('/admin/commission-management')}
              >
                Manage Commissions <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Admin Modules Quick Navigation */}
        <Card>
          <CardHeader>
            <CardTitle>Admin Modules</CardTitle>
            <CardDescription>
              Access all admin features from here
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {modules.map((module) => (
                <button
                  key={module.id}
                  onClick={() => navigate(module.path)}
                  className="p-4 border rounded-lg hover:bg-accent transition-colors text-left"
                >
                  <div className="flex items-center gap-3 mb-2">
                    {module.icon}
                    <span className="font-semibold text-sm">{module.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {module.description}
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Order Trends (Simple List) */}
        {trends.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Order Trends (7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {trends.map((trend, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-2 border-b last:border-b-0"
                  >
                    <span className="text-sm">
                      {new Date(trend.date).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-secondary rounded h-2">
                        <div
                          className="bg-primary h-full rounded"
                          style={{
                            width: `${Math.min((trend.count / 100) * 100, 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8 text-right">
                        {trend.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

const modules = [
  {
    id: 'seller-applications',
    name: 'Seller Applications',
    description: 'Review and approve/reject vendor applications',
    icon: <Users className="h-5 w-5 text-blue-600" />,
    path: '/admin/seller-applications',
  },
  {
    id: 'product-moderation',
    name: 'Product Moderation',
    description: 'Approve or reject product listings',
    icon: <Package className="h-5 w-5 text-amber-600" />,
    path: '/admin/product-moderation',
  },
  {
    id: 'order-operations',
    name: 'Order Operations',
    description: 'Manage orders, assign riders, update status',
    icon: <ShoppingCart className="h-5 w-5 text-green-600" />,
    path: '/admin/order-operations',
  },
  {
    id: 'commission-management',
    name: 'Commission Management',
    description: 'Update vendor commission rates and view history',
    icon: <DollarSign className="h-5 w-5 text-purple-600" />,
    path: '/admin/commission-management',
  },
  {
    id: 'review-moderation',
    name: 'Review Moderation',
    description: 'Flag and manage customer reviews',
    icon: <MessageSquare className="h-5 w-5 text-red-600" />,
    path: '/admin/review-moderation',
  },
  {
    id: 'vendor-performance',
    name: 'Vendor Performance',
    description: 'Monitor vendor KPIs and performance metrics',
    icon: <BarChart3 className="h-5 w-5 text-indigo-600" />,
    path: '/admin/vendor-performance',
  },
];

export default AdminDashboard;
