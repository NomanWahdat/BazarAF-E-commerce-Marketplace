import { useState, useEffect } from 'react';
import { Users, ShoppingBag, Truck, DollarSign, CheckCircle, XCircle, Eye, Package, Edit } from 'lucide-react';
import { Button } from '../../app/components/ui/button';
import { getProductImageUrl } from '@/utils/imageUtils';
import { Card } from '../../app/components/ui/card';
import { Badge } from '../../app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../app/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../app/components/ui/table';
import Layout from '../components/layout/Layout';

// Import services
import { dashboardService } from '../../services/dashboard-service';
import { vendorService } from '../../services/vendor-service';
import { orderService } from '../../services/order-service';
import { payoutService } from '../../services/payout-service';
import { productService } from '../../services/product-service';

// Import types
import { 
  DashboardStats, 
  Vendor, 
  Order, 
  LogisticsStats,
  OrderStatusCounts,
  PayoutSummary,
  Product
} from '../../types/api';

interface AdminPanelProps {
  onNavigate: (page: string, data?: any) => void;
}

export function AdminPanel({ onNavigate }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState('overview');
  
  // State
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderStatusCounts, setOrderStatusCounts] = useState<OrderStatusCounts | null>(null);
  const [logisticsStats, setLogisticsStats] = useState<LogisticsStats | null>(null);
  const [payoutSummary, setPayoutSummary] = useState<PayoutSummary | null>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Vendor details modal state
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showVendorDetails, setShowVendorDetails] = useState(false);
  
  // Order status update modal state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderStatusModal, setShowOrderStatusModal] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Product details modal state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductDetails, setShowProductDetails] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === 'vendors') {
      loadVendors();
    } else if (activeTab === 'orders') {
      loadOrders();
      loadOrderStatusCounts();
    } else if (activeTab === 'logistics') {
      loadLogisticsStats();
    } else if (activeTab === 'payouts') {
      loadPayouts();
      loadPayoutSummary();
    } else if (activeTab === 'products') {
      loadProducts();
    }
  }, [activeTab]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dashboardService.getStats();
      setStats(data.stats);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadVendors = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await vendorService.getVendors({ page_size: 50 });
      
      const transformedVendors = response.results.map(vendor => ({
        ...vendor,
        name: vendor.user.full_name,
        email: vendor.user.email || '',
        phone: vendor.user.phone,
        businessName: vendor.shop_name,
        joinDate: new Date(vendor.created_at).toLocaleDateString(),
        totalProducts: 0,
        totalOrders: 0,
        earnings: 0,
        verified: vendor.status === 'approved',
      }));
      
      setVendors(transformedVendors);
    } catch (err: any) {
      setError(err.message || 'Failed to load vendors');
      console.error('Vendors error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await orderService.getOrders({ page_size: 50 });
      
      const transformedOrders = response.results.map(order => ({
        ...order,
        customerName: order.customer?.full_name || order.customer_name || 'Guest Customer',  // ✅ Safe,
        vendorName: 'Multiple Vendors',
        orderDate: new Date(order.created_at).toLocaleDateString(),
        total: parseFloat(order.total_amount),
      }));
      
      setOrders(transformedOrders);
    } catch (err: any) {
      setError(err.message || 'Failed to load orders');
      console.error('Orders error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadOrderStatusCounts = async () => {
    try {
      const counts = await dashboardService.getOrderStatusCounts();
      setOrderStatusCounts(counts);
    } catch (err: any) {
      console.error('Order status counts error:', err);
    }
  };

  const loadLogisticsStats = async () => {
    try {
      setLoading(true);
      const data = await dashboardService.getLogisticsStats();
      setLogisticsStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load logistics stats');
      console.error('Logistics error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPayoutSummary = async () => {
    try {
      const data = await dashboardService.getPayoutSummary();
      setPayoutSummary(data);
    } catch (err: any) {
      console.error('Payout summary error:', err);
    }
  };

  const loadPayouts = async () => {
    try {
      setLoading(true);
      const response = await payoutService.getPayouts({ page_size: 50 });
      setPayouts(response.results);
    } catch (err: any) {
      setError(err.message || 'Failed to load payouts');
      console.error('Payouts error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await productService.getProducts({ page_size: 100 });
      setProducts(response.results);
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
      console.error('Products error:', err);
    } finally {
      setLoading(false);
    }
  };

  const approveVendor = async (vendorId: string) => {
    try {
      setLoading(true);
      await vendorService.approveVendor(vendorId);
      await loadVendors();
      // console.log('Vendor approved successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to approve vendor');
      console.error('Approve error:', err);
    } finally {
      setLoading(false);
    }
  };

  const rejectVendor = async (vendorId: string) => {
    try {
      setLoading(true);
      await vendorService.suspendVendor(vendorId);
      await loadVendors();
      // console.log('Vendor rejected successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to reject vendor');
      console.error('Reject error:', err);
    } finally {
      setLoading(false);
    }
  };

  const processPayout = async (payoutId: string) => {
    try {
      setLoading(true);
      const reference = window.prompt('Enter the bank transfer or signed cash receipt reference:');
      if (!reference?.trim()) return;
      await payoutService.markPaid(payoutId, reference);
      await loadPayouts();
      await loadPayoutSummary();
      // console.log('Payout processed successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to process payout');
      console.error('Payout error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Updated product status functions to work with backend status field
  const approveProduct = async (productId: string) => {
    try {
      setLoading(true);
      await productService.approveProduct(productId);
      await loadProducts();
      // console.log('Product approved successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to approve product');
      console.error('Product approve error:', err);
    } finally {
      setLoading(false);
    }
  };

  const rejectProduct = async (productId: string) => {
    try {
      setLoading(true);
      await productService.rejectProduct(productId);
      await loadProducts();
      // console.log('Product rejected successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to reject product');
      console.error('Product reject error:', err);
    } finally {
      setLoading(false);
    }
  };

  const deactivateProduct = async (productId: string) => {
    try {
      setLoading(true);
      await productService.deactivateProduct(productId);
      await loadProducts();
      // console.log('Product deactivated successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate product');
      console.error('Product deactivate error:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      setUpdatingStatus(true);
      await orderService.updateOrderStatus(orderId, { status: newStatus });
      await loadOrders();
      await loadOrderStatusCounts();
      setShowOrderStatusModal(false);
      setSelectedOrder(null);
      // console.log(`Order status updated to ${newStatus}`);
    } catch (err: any) {
      setError(err.message || 'Failed to update order status');
      console.error('Update order status error:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'delivered':
      case 'active':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'rejected':
      case 'cancelled':
      case 'suspended':
      case 'inactive':
      case 'draft':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'confirmed':
      case 'processing':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'picked':
      case 'shipped':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Product Details Modal Component
  const ProductDetailsModal = () => {
    if (!showProductDetails || !selectedProduct) return null;

    return (
      <div 
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        onClick={() => {
          setShowProductDetails(false);
          setSelectedProduct(null);
        }}
      >
        <div 
          className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold">Product Details</h3>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setShowProductDetails(false);
                setSelectedProduct(null);
              }}
            >
              ✕
            </Button>
          </div>

          <div className="space-y-6">
            {/* Product Images */}
            {selectedProduct.images && selectedProduct.images.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {selectedProduct.images.map((image, index) => (
                  <img 
                    key={index}
                    src={getProductImageUrl(image)} 
                    alt={`${selectedProduct.name} - ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                ))}
              </div>
            )}

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Product Name</label>
                <p className="font-medium mt-1">{selectedProduct.name}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Category</label>
                <p className="font-medium mt-1">{selectedProduct.category || 'Uncategorized'}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Price</label>
                <p className="font-medium mt-1">AFN {parseFloat(String(selectedProduct.price || 0)).toLocaleString()}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Stock Quantity</label>
                <p className="font-medium mt-1">{selectedProduct.stock_quantity || 0} units</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Badge variant="outline" className={getStatusColor(selectedProduct.status)}>
                    {selectedProduct.status}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Created</label>
                <p className="font-medium mt-1">
                  {new Date(selectedProduct.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Vendor Info */}
            {selectedProduct.vendor && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Vendor Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Shop Name</label>
                    <p className="font-medium mt-1">{selectedProduct.vendor.shop_name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Vendor Name</label>
                    <p className="font-medium mt-1">{selectedProduct.vendor.user?.full_name}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <label className="text-sm text-muted-foreground">Description</label>
              <p className="mt-1 text-sm">{selectedProduct.description}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              {selectedProduct.status === 'pending' && (
                <>
                  <Button
                    onClick={() => {
                      approveProduct(selectedProduct.id);
                      setShowProductDetails(false);
                    }}
                    className="flex-1"
                    disabled={loading}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve Product
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      rejectProduct(selectedProduct.id);
                      setShowProductDetails(false);
                    }}
                    className="flex-1"
                    disabled={loading}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject Product
                  </Button>
                </>
              )}
              {selectedProduct.status === 'approved' && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    deactivateProduct(selectedProduct.id);
                    setShowProductDetails(false);
                  }}
                  className="w-full"
                  disabled={loading}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Deactivate Product
                </Button>
              )}
              {(selectedProduct.status === 'inactive' || selectedProduct.status === 'rejected') && (
                <Button
                  onClick={() => {
                    approveProduct(selectedProduct.id);
                    setShowProductDetails(false);
                  }}
                  className="w-full"
                  disabled={loading}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve Product
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Vendor Details Modal Component
  const VendorDetailsModal = () => {
    if (!showVendorDetails || !selectedVendor) return null;

    return (
      <div 
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        onClick={() => {
          setShowVendorDetails(false);
          setSelectedVendor(null);
        }}
      >
        <div 
          className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold">Vendor Details</h3>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setShowVendorDetails(false);
                setSelectedVendor(null);
              }}
            >
              ✕
            </Button>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Vendor Name</label>
                <p className="font-medium mt-1">{selectedVendor.name}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Business Name</label>
                <p className="font-medium mt-1">{selectedVendor.businessName}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Email</label>
                <p className="font-medium mt-1">{selectedVendor.email}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Phone</label>
                <p className="font-medium mt-1">{selectedVendor.phone}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">City</label>
                <p className="font-medium mt-1">{selectedVendor.city}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Badge variant="outline" className={getStatusColor(selectedVendor.status)}>
                    {selectedVendor.status}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Join Date</label>
                <p className="font-medium mt-1">{selectedVendor.joinDate}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Commission Rate</label>
                <p className="font-medium mt-1">{selectedVendor.commission_rate}%</p>
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Address</label>
              <p className="font-medium mt-1">{selectedVendor.address}</p>
            </div>

            {(selectedVendor.identity_document || selectedVendor.business_document) && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Documents</h4>
                <div className="space-y-2">
                  {selectedVendor.identity_document && (
                    <div>
                      <label className="text-sm text-muted-foreground">Identity Document</label>
                      <a 
                        href={selectedVendor.identity_document} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline block mt-1"
                      >
                        View Document →
                      </a>
                    </div>
                  )}
                  {selectedVendor.business_document && (
                    <div>
                      <label className="text-sm text-muted-foreground">Business Document</label>
                      <a 
                        href={selectedVendor.business_document} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline block mt-1"
                      >
                        View Document →
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t">
              {selectedVendor.status === 'pending' && (
                <>
                  <Button
                    onClick={() => {
                      approveVendor(selectedVendor.id);
                      setShowVendorDetails(false);
                    }}
                    className="flex-1"
                    disabled={loading}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve Vendor
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      rejectVendor(selectedVendor.id);
                      setShowVendorDetails(false);
                    }}
                    className="flex-1"
                    disabled={loading}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject Application
                  </Button>
                </>
              )}
              {selectedVendor.status === 'approved' && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    rejectVendor(selectedVendor.id);
                    setShowVendorDetails(false);
                  }}
                  className="w-full"
                  disabled={loading}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Suspend Vendor
                </Button>
              )}
              {selectedVendor.status === 'suspended' && (
                <Button
                  onClick={() => {
                    approveVendor(selectedVendor.id);
                    setShowVendorDetails(false);
                  }}
                  className="w-full"
                  disabled={loading}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Reactivate Vendor
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Order Status Update Modal Component
  const OrderStatusUpdateModal = () => {
    if (!showOrderStatusModal || !selectedOrder) return null;

    const orderStatuses = [
      { value: 'pending', label: 'Pending', description: 'Order has been placed but not confirmed' },
      { value: 'confirmed', label: 'Confirmed', description: 'Order has been confirmed by vendor' },
      { value: 'processing', label: 'Processing', description: 'Order is being prepared' },
      { value: 'picked', label: 'Picked', description: 'Order has been picked up for delivery' },
      { value: 'shipped', label: 'Shipped', description: 'Order is in transit' },
      { value: 'delivered', label: 'Delivered', description: 'Order has been delivered to customer' },
      { value: 'cancelled', label: 'Cancelled', description: 'Order has been cancelled' },
    ];

    return (
      <div 
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        onClick={() => {
          setShowOrderStatusModal(false);
          setSelectedOrder(null);
        }}
      >
        <div 
          className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold">Update Order Status</h3>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setShowOrderStatusModal(false);
                setSelectedOrder(null);
              }}
            >
              ✕
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Order ID</label>
              <p className="font-medium mt-1">{selectedOrder.id}</p>
            </div>
            
            <div>
              <label className="text-sm text-muted-foreground">Customer</label>
              <p className="font-medium mt-1">{selectedOrder.customerName}</p>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Current Status</label>
              <div className="mt-1">
                <Badge variant="outline" className={getStatusColor(selectedOrder.status)}>
                  {selectedOrder.status}
                </Badge>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Select New Status</label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {orderStatuses.map((status) => (
                  <div 
                    key={status.value}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedOrder.status === status.value 
                        ? 'border-primary bg-primary/5' 
                        : 'border-gray-200 hover:border-primary/50'
                    }`}
                    onClick={() => updateOrderStatus(selectedOrder.id, status.value)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{status.label}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {status.description}
                        </div>
                      </div>
                      {selectedOrder.status === status.value && (
                        <CheckCircle className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowOrderStatusModal(false);
                    setSelectedOrder(null);
                  }}
                  disabled={updatingStatus}
                >
                  Cancel
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => {
                    setShowOrderStatusModal(false);
                    setSelectedOrder(null);
                  }}
                  disabled={updatingStatus}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading && !stats) {
    return (
      <Layout variant="admin" notificationCount={0} onLogout={() => onNavigate('/logout')}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (error && !stats) {
    return (
      <Layout variant="admin" notificationCount={0} onLogout={() => onNavigate('/logout')}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={loadDashboardData}>Retry</Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      variant="admin"
      notificationCount={stats?.pending_vendors || 0}
      onLogout={() => onNavigate('/logout')}
    >
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="vendors">Vendors</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="logistics">Logistics</TabsTrigger>
              <TabsTrigger value="payouts">Payouts</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-6 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <div className="text-2xl font-semibold mb-1">{stats?.total_vendors || 0}</div>
                  <div className="text-sm text-muted-foreground">Total Vendors</div>
                  <div className="text-xs text-yellow-600 mt-1">
                    {stats?.pending_vendors || 0} pending approval
                  </div>
                </Card>

                <Card className="p-6 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <ShoppingBag className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="text-2xl font-semibold mb-1">{stats?.active_orders || 0}</div>
                  <div className="text-sm text-muted-foreground">Active Orders</div>
                </Card>

                <Card className="p-6 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <div className="text-2xl font-semibold mb-1">
                    AFN {stats?.total_revenue?.toLocaleString() || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Revenue</div>
                </Card>

                <Card className="p-6 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Truck className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                  <div className="text-2xl font-semibold mb-1">{stats?.in_transit || 0}</div>
                  <div className="text-sm text-muted-foreground">In Transit</div>
                </Card>
              </div>

              <Card className="p-6 bg-white">
                <h3 className="mb-4 font-semibold">Quick Actions</h3>
                <div className="grid md:grid-cols-2 gap-3">
                  <Button variant="outline" onClick={() => setActiveTab('vendors')}>
                    <Users className="w-4 h-4 mr-2" />
                    Review Vendor Applications ({stats?.pending_vendors || 0})
                  </Button>
                  <Button variant="outline" onClick={() => setActiveTab('products')}>
                    <Package className="w-4 h-4 mr-2" />
                    Manage Products
                  </Button>
                  <Button variant="outline" onClick={() => setActiveTab('orders')}>
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    Monitor Active Orders ({stats?.active_orders || 0})
                  </Button>
                  <Button variant="outline" onClick={() => setActiveTab('payouts')}>
                    <DollarSign className="w-4 h-4 mr-2" />
                    Process Payouts
                  </Button>
                </div>
              </Card>
            </TabsContent>

            {/* Vendors Tab */}
            <TabsContent value="vendors" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Vendor Management</h2>
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  {vendors.filter(v => v.status === 'pending').length} Pending Approval
                </Badge>
              </div>

              {loading && (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              )}

              {!loading && vendors.length === 0 && (
                <Card className="p-6 bg-white text-center text-muted-foreground">
                  No vendors found
                </Card>
              )}

              {!loading && vendors.length > 0 && (
                <Card className="bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Business</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Join Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vendors.map((vendor) => (
                        <TableRow key={vendor.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{vendor.name}</div>
                              <div className="text-sm text-muted-foreground">{vendor.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>{vendor.businessName}</TableCell>
                          <TableCell className="text-sm">{vendor.phone}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {vendor.joinDate}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getStatusColor(vendor.status)}>
                              {vendor.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setSelectedVendor(vendor);
                                  setShowVendorDetails(true);
                                }}
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              
                              {vendor.status === 'pending' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => approveVendor(vendor.id)}
                                  disabled={loading}
                                  title="Approve Vendor"
                                >
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                </Button>
                              )}
                              
                              {(vendor.status === 'pending' || vendor.status === 'approved') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => rejectVendor(vendor.id)}
                                  disabled={loading}
                                  title={vendor.status === 'pending' ? 'Reject Application' : 'Suspend Vendor'}
                                >
                                  <XCircle className="w-4 h-4 text-red-600" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </TabsContent>

            {/* Products Tab */}
            <TabsContent value="products" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Product Management</h2>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    {products.filter(p => p.status === 'pending').length} Pending Review
                  </Badge>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {products.length} Total Products
                  </Badge>
                </div>
              </div>

              {loading && (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              )}

              {!loading && products.length === 0 && (
                <Card className="p-6 bg-white text-center text-muted-foreground">
                  No products found
                </Card>
              )}

              {!loading && products.length > 0 && (
                <Card className="bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {product.images?.[0] && (
                                <img 
                                  src={getProductImageUrl(product.images[0])} 
                                  alt={product.name}
                                  className="w-12 h-12 rounded object-cover"
                                />
                              )}
                              <div>
                                <div className="font-medium">{product.name}</div>
                                <div className="text-sm text-muted-foreground line-clamp-1">
                                  {product.description}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{product.vendor?.shop_name || 'N/A'}</div>
                              <div className="text-sm text-muted-foreground">
                                {product.vendor?.user?.full_name || 'N/A'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{product.category || 'Uncategorized'}</TableCell>
                          <TableCell className="font-semibold">
                            AFN {parseFloat(String(product.price || 0)).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={product.stock_quantity > 0 
                                ? 'bg-green-50 text-green-700 border-green-200' 
                                : 'bg-red-50 text-red-700 border-red-200'
                              }
                            >
                              {product.stock_quantity || 0} units
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={getStatusColor(product.status)}
                            >
                              {product.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setSelectedProduct(product);
                                  setShowProductDetails(true);
                                }}
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              
                              {product.status === 'pending' && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => approveProduct(product.id)}
                                    disabled={loading}
                                    title="Approve Product"
                                  >
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => rejectProduct(product.id)}
                                    disabled={loading}
                                    title="Reject Product"
                                  >
                                    <XCircle className="w-4 h-4 text-red-600" />
                                  </Button>
                                </>
                              )}
                              
                              {product.status === 'approved' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deactivateProduct(product.id)}
                                  disabled={loading}
                                  title="Deactivate Product"
                                >
                                  <XCircle className="w-4 h-4 text-red-600" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders" className="space-y-6">
              <h2 className="text-2xl font-semibold">Order Monitoring</h2>

              <div className="grid sm:grid-cols-4 gap-4">
                <Card className="p-4 bg-white">
                  <div className="text-sm text-muted-foreground mb-1">Pending</div>
                  <div className="text-2xl font-semibold">
                    {orderStatusCounts?.pending || 0}
                  </div>
                </Card>
                <Card className="p-4 bg-white">
                  <div className="text-sm text-muted-foreground mb-1">Processing</div>
                  <div className="text-2xl font-semibold">
                    {orderStatusCounts?.confirmed || 0}
                  </div>
                </Card>
                <Card className="p-4 bg-white">
                  <div className="text-sm text-muted-foreground mb-1">Shipped</div>
                  <div className="text-2xl font-semibold">
                    {orderStatusCounts?.picked || 0}
                  </div>
                </Card>
                <Card className="p-4 bg-white">
                  <div className="text-sm text-muted-foreground mb-1">Delivered</div>
                  <div className="text-2xl font-semibold text-green-600">
                    {orderStatusCounts?.delivered || 0}
                  </div>
                </Card>
              </div>

              {loading && (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              )}

              {!loading && orders.length > 0 && (
                <Card className="bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">
                            {order.id.substring(0, 8)}...
                          </TableCell>
                          <TableCell>{order.customerName}</TableCell>
                          <TableCell className="text-sm">{order.city}</TableCell>
                          <TableCell>AFN {order.total?.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getStatusColor(order.status)}>
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {order.orderDate}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setShowOrderStatusModal(true);
                                }}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Update Status
                              </Button>
                              <Button variant="ghost" size="sm">
                                View Details
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </TabsContent>

            {/* Logistics Tab */}
            <TabsContent value="logistics" className="space-y-6">
              <h2 className="text-2xl font-semibold">Logistics & Delivery Management</h2>

              <div className="grid md:grid-cols-3 gap-4">
                <Card className="p-6 bg-white">
                  <Truck className="w-8 h-8 text-primary mb-3" />
                  <div className="text-2xl font-semibold mb-1">
                    {logisticsStats?.packages_in_transit || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Packages in Transit</div>
                </Card>

                <Card className="p-6 bg-white">
                  <CheckCircle className="w-8 h-8 text-green-600 mb-3" />
                  <div className="text-2xl font-semibold mb-1">
                    {logisticsStats?.delivered_today || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Delivered Today</div>
                </Card>

                <Card className="p-6 bg-white">
                  <Users className="w-8 h-8 text-blue-600 mb-3" />
                  <div className="text-2xl font-semibold mb-1">
                    {logisticsStats?.active_drivers || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Active Drivers</div>
                </Card>
              </div>

              {logisticsStats && logisticsStats.delivery_by_province.length > 0 && (
                <Card className="p-6 bg-white">
                  <h3 className="mb-4 font-semibold">Delivery by Province</h3>
                  <div className="space-y-3">
                    {logisticsStats.delivery_by_province.map((region) => (
                      <div 
                        key={region.province} 
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                      >
                        <div className="font-medium">{region.province}</div>
                        <div className="flex gap-4 text-sm">
                          <div className="text-muted-foreground">
                            Active: <span className="font-medium text-foreground">{region.active}</span>
                          </div>
                          <div className="text-muted-foreground">
                            Completed: <span className="font-medium text-green-600">{region.completed}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </TabsContent>

            {/* Payouts Tab */}
            <TabsContent value="payouts" className="space-y-6">
              <h2 className="text-2xl font-semibold">Payout Management</h2>

              <div className="grid md:grid-cols-3 gap-4">
                <Card className="p-6 bg-gradient-to-br from-primary to-primary/80 text-white">
                  <div className="text-sm mb-2 opacity-90">Pending Payouts</div>
                  <div className="text-3xl font-semibold mb-1">
                    AFN {payoutSummary?.pending_amount.toLocaleString() || 0}
                  </div>
                  <div className="text-sm opacity-75">
                    {payoutSummary?.pending_count || 0} vendors waiting
                  </div>
                </Card>

                <Card className="p-6 bg-white">
                  <div className="text-sm text-muted-foreground mb-2">Processed This Month</div>
                  <div className="text-3xl font-semibold mb-1">
                    AFN {payoutSummary?.processed_amount.toLocaleString() || 0}
                  </div>
                  <div className="text-sm text-green-600">
                    {payoutSummary?.processed_count || 0} successful payouts
                  </div>
                </Card>

                <Card className="p-6 bg-white">
                  <div className="text-sm text-muted-foreground mb-2">Next Payout Date</div>
                  <div className="text-3xl font-semibold mb-1">Jan 30</div>
                  <div className="text-sm text-muted-foreground">2026</div>
                </Card>
              </div>

              {!loading && payouts.length > 0 && (
                <Card className="bg-white p-4">
                  <h3 className="mb-3 font-semibold">Pending Payouts</h3>
                </Card>
              )}

              <Card className="p-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Business</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payouts.filter(p => p.status === 'pending').map((payout) => (
                        <TableRow key={payout.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{payout.vendor.user.full_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {payout.vendor.user.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{payout.vendor.shop_name}</TableCell>
                          <TableCell className="font-semibold">
                            AFN {parseFloat(payout.amount).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(payout.period_start).toLocaleDateString()} - {' '}
                            {new Date(payout.period_end).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                              {payout.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => processPayout(payout.id)}
                              disabled={loading}
                            >
                              Process Payout
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>

            </TabsContent>
          </Tabs>
        </div>
      </div>

      <VendorDetailsModal />
      <OrderStatusUpdateModal />
      <ProductDetailsModal />
    </Layout>
  );
}