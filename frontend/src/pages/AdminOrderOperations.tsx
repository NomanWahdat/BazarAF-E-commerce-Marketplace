/**
 * Admin Order Operations Page
 * Command center for order management
 */
import React, { useState, useEffect } from 'react';
import useDebounce from '@/app/hooks/useDebounce';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  CheckCircle,
  ShoppingCart,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import adminService from '@/services/adminService';
import Layout from '@/app/components/layout/Layout';

interface OrderItem {
  id: string;
  product_name: string;
  vendor_name: string;
  quantity: number;
  price: number | string;
}

interface Order {
  id: string;
  order_id: string;
  customer_info: {
    name: string;
    phone: string;
    email?: string;
  };
  source_vendors?: string[];
  total_amount: number;
  status: string;
  city: string;
  created_at: string;
  items: OrderItem[];
}

interface OrderDetail extends Order {
  delivery_address: string;
  delivery_info?: {
    rider_name: string;
    rider_phone: string;
    status: string;
    collected_amount: string;
    delivered_at?: string;
  };
  updated_at: string;
}

export const AdminOrderOperations: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    status: 'pending',
    city: '',
    date_range: '',
    vendor: '',
  });
  const [searchInputs, setSearchInputs] = useState({
    city: '',
    vendor: '',
  });
  const debouncedCity = useDebounce(searchInputs.city, 300);
  const debouncedVendor = useDebounce(searchInputs.vendor, 300);

  const validStatusTransitions: Record<string, string[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['processing', 'cancelled'],
    processing: ['picked', 'cancelled'],
    picked: ['shipped', 'cancelled'],
    shipped: ['delivered', 'cancelled'],
    delivered: [],
    cancelled: [],
  };

  const getAllowedStatusOptions = (status?: string) => {
    if (!status) {
      return ['pending', 'confirmed', 'processing', 'picked', 'shipped', 'delivered', 'cancelled'];
    }

    return validStatusTransitions[status] || [];
  };

  useEffect(() => {
    setFilters((current) => ({
      ...current,
      city: debouncedCity,
      vendor: debouncedVendor,
    }));
  }, [debouncedCity, debouncedVendor]);

  // Dialogs
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showRiderDialog, setShowRiderDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [newStatus, setNewStatus] = useState('');
  const [riderId, setRiderId] = useState('');

  useEffect(() => {
    loadOrders();
  }, [filters]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await adminService.getOrdersForOperations(filters);
      setOrders(data.results || data);
      setError(null);
    } catch (err) {
      setError('Failed to load orders');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadOrderDetails = async (orderId: string) => {
    try {
      const data = await adminService.getOrderDetails(orderId);
      setSelectedOrder(data);
    } catch (err) {
      setError('Failed to load order details');
      console.error(err);
    }
  };

  const handleUpdateStatus = async (orderId: string, status: string) => {
    if (!status) {
      setError('Please select a new status');
      return;
    }

    try {
      await adminService.updateOrderStatus(orderId, { status });
      setSuccess(`Order status updated to ${status}`);
      setShowStatusDialog(false);
      setNewStatus('');
      loadOrders();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(
        err?.response?.data?.error || err?.message || 'Failed to update order status'
      );
      console.error('Order status update error:', err);
    }
  };

  const handleAssignRider = async (orderId: string) => {
    if (!riderId.trim()) {
      setError('Rider ID is required');
      return;
    }
    try {
      await adminService.assignRider(orderId, { rider_id: riderId });
      setSuccess('Rider assigned successfully');
      setShowRiderDialog(false);
      setRiderId('');
      loadOrders();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(`Failed to assign rider: ${err}`);
    }
  };

  const handleBatchUpdateStatus = async (status: string) => {
    if (selectedOrders.length === 0) {
      setError('No orders selected');
      return;
    }

    if (!status) {
      setError('Please select a new status');
      return;
    }

    try {
      await adminService.batchUpdateOrderStatus({
        order_ids: selectedOrders,
        status,
      });
      setSuccess(`${selectedOrders.length} orders updated to ${status}`);
      setShowStatusDialog(false);
      setNewStatus('');
      setSelectedOrders([]);
      loadOrders();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(
        err?.response?.data?.error || err?.message || 'Failed to batch update orders'
      );
      console.error('Batch order status update error:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Layout variant="admin" showFooter={false}>
        <div className="flex items-center justify-center h-screen">
          <p className="text-muted-foreground">Loading orders...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout variant="admin" showFooter={false}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Order Operations</h1>
          <p className="text-muted-foreground">
            Manage orders, assign riders, and track delivery status
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
        {success && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                <p>{success}</p>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">City</label>
                <Input
                  placeholder="Search city..."
                  value={searchInputs.city}
                  onChange={(e) =>
                    setSearchInputs({ ...searchInputs, city: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Date Range
                </label>
                <Select
                  value={filters.date_range}
                  onValueChange={(value) =>
                    setFilters({
                      ...filters,
                      date_range: value === 'all' ? '' : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 days</SelectItem>
                    <SelectItem value="month">Last 30 days</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Vendor</label>
                <Input
                  placeholder="Search vendor..."
                  value={searchInputs.vendor}
                  onChange={(e) =>
                    setSearchInputs({ ...searchInputs, vendor: e.target.value })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedOrders.length > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <p className="text-blue-900">
                  {selectedOrders.length} order(s) selected
                </p>
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNewStatus('confirmed');
                      setShowStatusDialog(true);
                    }}
                  >
                    Confirm All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNewStatus('shipped');
                      setShowStatusDialog(true);
                    }}
                  >
                    Mark Shipped
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedOrders([])}
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Orders ({orders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No orders found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={
                          selectedOrders.length === orders.length &&
                          orders.length > 0
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOrders(orders.map((o) => o.id));
                          } else {
                            setSelectedOrders([]);
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                    </TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedOrders.includes(order.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedOrders([...selectedOrders, order.id]);
                            } else {
                              setSelectedOrders(
                                selectedOrders.filter((id) => id !== order.id)
                              );
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {order.id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.customer_info?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {order.customer_info?.phone}
                          </p>
                          {order.customer_info?.email && (
                            <p className="text-xs text-muted-foreground">
                              {order.customer_info.email}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {order.source_vendors && order.source_vendors.length > 0
                            ? order.source_vendors.join(', ')
                            : order.items.length > 0
                            ? order.items[0].vendor_name || 'Unknown'
                            : 'Unknown'}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        AFN {order.total_amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {order.city}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            loadOrderDetails(order.id);
                            setShowDetailDialog(true);
                          }}
                        >
                          View <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Order ID: {selectedOrder?.id.slice(0, 12)}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-medium">{selectedOrder.customer_info?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedOrder.customer_info?.phone}
                  </p>
                  {selectedOrder.customer_info?.email && (
                    <p className="text-sm text-muted-foreground">
                      {selectedOrder.customer_info.email}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Source Vendors</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedOrder.source_vendors?.length
                      ? selectedOrder.source_vendors.join(', ')
                      : 'Unknown'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={getStatusColor(selectedOrder.status)}>
                    {selectedOrder.status}
                  </Badge>
                </div>
              </div>

              {/* Delivery Info */}
              <div>
                <p className="text-sm text-muted-foreground mb-1">Delivery Address</p>
                <p className="text-sm bg-gray-50 p-2 rounded">
                  {selectedOrder.delivery_address}, {selectedOrder.city}
                </p>
              </div>

              {/* Items */}
              <div>
                <p className="text-sm font-medium mb-2">Items</p>
                <div className="space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded"
                    >
                      <div>
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Qty: {item.quantity}
                        </p>
                      </div>
                      <p className="font-medium">
                        AFN {(Number(item.price) * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-between items-center pt-2 border-t">
                <p className="font-medium">Total Amount</p>
                <p className="text-lg font-bold">
                  AFN {selectedOrder.total_amount.toLocaleString()}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-4">
                <Button
                  className="w-full"
                  onClick={() => {
                    setShowDetailDialog(false);
                    setShowRiderDialog(true);
                  }}
                >
                  Assign Rider
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setShowDetailDialog(false);
                    setShowStatusDialog(true);
                  }}
                >
                  Update Status
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">New Status</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {(
                    selectedOrders.length > 0
                      ? ['pending', 'confirmed', 'processing', 'picked', 'shipped', 'delivered', 'cancelled']
                      : getAllowedStatusOptions(selectedOrder?.status)
                  ).map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedOrders.length === 0 && selectedOrder && getAllowedStatusOptions(selectedOrder.status).length === 0 && (
                <p className="mt-2 text-sm text-red-600">
                  No valid status transitions available for the current order.
                </p>
              )}
            </div>

            {selectedOrders.length > 0 && (
              <div className="bg-blue-50 p-3 rounded">
                <p className="text-sm text-blue-900">
                  This will update {selectedOrders.length} order(s)
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowStatusDialog(false);
                setNewStatus('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedOrders.length > 0) {
                  handleBatchUpdateStatus(newStatus);
                } else if (selectedOrder) {
                  handleUpdateStatus(selectedOrder.id, newStatus);
                }
              }}
            >
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rider Assignment Dialog */}
      <Dialog open={showRiderDialog} onOpenChange={setShowRiderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Rider</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Rider ID</label>
              <Input
                placeholder="Enter rider ID or name"
                value={riderId}
                onChange={(e) => setRiderId(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRiderDialog(false);
                setRiderId('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedOrder) handleAssignRider(selectedOrder.id);
              }}
            >
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default AdminOrderOperations;
