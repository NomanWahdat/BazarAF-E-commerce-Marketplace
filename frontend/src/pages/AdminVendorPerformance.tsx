/**
 * Admin Vendor Performance Page
 * Monitor vendor KPIs and performance metrics
 */
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Input } from '@/app/components/ui/input';
import {
  AlertCircle,
  Star,
  TrendingUp,
  Package,
  Clock,
  ShoppingCart,
  BarChart3,
} from 'lucide-react';
import adminService from '@/services/adminService';
import Layout from '@/app/components/layout/Layout';

interface Vendor {
  id: string;
  shop_name: string;
  status: string;
  rating: number;
  total_sales: number;
  this_month_sales: number;
  order_completion_rate: number;
  avg_delivery_time: number;
  cancellation_rate: number;
  products_count: number;
  created_at: string;
}

interface VendorMetrics {
  vendor_id?: string;
  shop_name: string;
  status?: string;
  commission_rate?: string;
  total_products?: number;
  total_sales_amount?: number | string;
  total_orders?: number;
  completed_orders?: number;
  completion_rate_percent?: number;
  average_rating?: number;
  cancellation_rate_percent?: number;
  average_delivery_days?: number;
  created_at?: string;
}

export const AdminVendorPerformance: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    status: 'approved',
    rating_range: '',
    search: '',
  });

  // Dialogs
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<VendorMetrics | null>(null);

  const toNumber = (value?: number | string | null) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const formatMoney = (value?: number | string | null) =>
    toNumber(value).toLocaleString();

  useEffect(() => {
    loadVendors();
  }, [filters]);

  const loadVendors = async () => {
    try {
      setLoading(true);
      const data = await adminService.getVendorsPerformance(filters);
      setVendors(data.results || data);
      setError(null);
    } catch (err) {
      setError('Failed to load vendor performance data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadVendorMetrics = async (vendorId: string) => {
    try {
      const data = await adminService.getVendorMetrics(vendorId);
      setSelectedVendor(data);
    } catch (err) {
      setError('Failed to load vendor metrics');
      console.error(err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 3.5) return 'text-blue-600';
    if (rating >= 2.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < Math.round(rating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const detailRating = toNumber(selectedVendor?.average_rating);
  const detailCompletionRate = toNumber(selectedVendor?.completion_rate_percent);
  const detailCancellationRate = toNumber(
    selectedVendor?.cancellation_rate_percent
  );
  const detailDeliveryDays = toNumber(selectedVendor?.average_delivery_days);
  const detailOrders = toNumber(selectedVendor?.total_orders);
  const detailProducts = toNumber(selectedVendor?.total_products);
  const detailSales = formatMoney(selectedVendor?.total_sales_amount);

  if (loading) {
    return (
      <Layout variant="admin" showFooter={false}>
        <div className="flex items-center justify-center h-screen">
          <p className="text-muted-foreground">Loading vendor data...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout variant="admin" showFooter={false}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Vendor Performance Tracking</h1>
          <p className="text-muted-foreground">
            Monitor vendor KPIs and performance metrics
          </p>
        </div>

        {/* Messages */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5" />
                <p>{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select
                  value={filters.status}
                  onValueChange={(value) =>
                    setFilters({
                      ...filters,
                      status: value === 'all' ? '' : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Rating Range
                </label>
                <Select
                  value={filters.rating_range}
                  onValueChange={(value) =>
                    setFilters({
                      ...filters,
                      rating_range: value === 'all' ? '' : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All ratings" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4.5-5">4.5 - 5.0 stars</SelectItem>
                    <SelectItem value="3.5-4.5">3.5 - 4.5 stars</SelectItem>
                    <SelectItem value="2.5-3.5">2.5 - 3.5 stars</SelectItem>
                    <SelectItem value="below-2.5">Below 2.5 stars</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Search Vendor
                </label>
                <Input
                  placeholder="Search by shop name..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vendors Grid/Table */}
        <div className="grid grid-cols-1 gap-4">
          {vendors.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No vendors found</p>
              </CardContent>
            </Card>
          ) : (
            vendors.map((vendor) => {
              const ratingValue = toNumber(vendor.rating);
              const totalSales = formatMoney(vendor.total_sales);
              const monthSales = formatMoney(vendor.this_month_sales);
              const completionRate = toNumber(vendor.order_completion_rate);
              const avgDelivery = toNumber(vendor.avg_delivery_time);
              const cancellationRate = toNumber(vendor.cancellation_rate);

              return (
                <Card key={vendor.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                    {/* Vendor Info */}
                    <div className="md:col-span-2">
                      <h3 className="font-bold text-lg mb-1">{vendor.shop_name}</h3>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getStatusColor(vendor.status)}>
                          {vendor.status === 'approved' ? 'active' : vendor.status}
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                          {toNumber(vendor.products_count)}{' '}
                          <Package className="h-3 w-3" />
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Joined {new Date(vendor.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Rating Card */}
                    <div className="bg-gradient-to-br from-yellow-50 to-amber-50 p-4 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Rating</p>
                      <div className="flex items-center gap-2 mb-1">
                        {renderStars(ratingValue)}
                      </div>
                      <p className={`font-bold text-lg ${getRatingColor(ratingValue)}`}>
                        {ratingValue.toFixed(1)}
                      </p>
                    </div>

                    {/* Sales Card */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">
                        This Month
                      </p>
                      <p className="font-bold text-lg text-green-600 mb-1">
                        AFN {monthSales}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Total: AFN {totalSales}
                      </p>
                    </div>

                    {/* Performance Metrics */}
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-lg">
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Completion</span>
                          <span className="font-bold text-blue-600">
                            {completionRate}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Delivery Time</span>
                          <span className="font-bold text-blue-600">
                            {avgDelivery}d
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cancellation</span>
                          <span className="font-bold text-blue-600">
                            {cancellationRate}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end">
                      <Button
                        onClick={() => {
                          loadVendorMetrics(vendor.id);
                          setShowDetailDialog(true);
                        }}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Vendor Details Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedVendor?.shop_name}</DialogTitle>
            <DialogDescription>Performance Metrics Breakdown</DialogDescription>
          </DialogHeader>

          {selectedVendor && (
            <div className="space-y-6 py-4">
              {/* Overall Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-yellow-50 p-4 rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="h-5 w-5 text-yellow-400" />
                    <p className="text-sm text-muted-foreground">Rating</p>
                  </div>
                  <p className="text-2xl font-bold text-yellow-600">
                    {detailRating.toFixed(1)}
                  </p>
                </div>

                <div className="bg-green-50 p-4 rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingCart className="h-5 w-5 text-green-600" />
                    <p className="text-sm text-muted-foreground">Orders</p>
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    {detailOrders}
                  </p>
                  <p className="text-xs text-muted-foreground">Total lifetime</p>
                </div>

                <div className="bg-blue-50 p-4 rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-5 w-5 text-blue-600" />
                    <p className="text-sm text-muted-foreground">Products</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">
                    {detailProducts}
                  </p>
                  <p className="text-xs text-muted-foreground">Listed products</p>
                </div>

                <div className="bg-purple-50 p-4 rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                    <p className="text-sm text-muted-foreground">Sales</p>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">
                    AFN {detailSales}
                  </p>
                  <p className="text-xs text-muted-foreground">Total revenue</p>
                </div>
              </div>

              {/* Performance Metrics */}
              <div>
                <h4 className="font-semibold mb-3">Performance KPIs</h4>
                <div className="space-y-3">
                  {/* Completion Rate */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">
                        Order Completion Rate
                      </span>
                      <span className="text-sm font-bold">
                        {detailCompletionRate}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{
                          width: `${detailCompletionRate}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Cancellation Rate */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">
                        Cancellation Rate
                      </span>
                      <span className="text-sm font-bold">
                        {detailCancellationRate}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full"
                        style={{
                          width: `${detailCancellationRate}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Average Delivery Time */}
                  <div className="bg-blue-50 p-3 rounded">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium">Avg. Delivery Time</p>
                        <p className="text-lg font-bold text-blue-600">
                          {detailDeliveryDays} days
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default AdminVendorPerformance;
