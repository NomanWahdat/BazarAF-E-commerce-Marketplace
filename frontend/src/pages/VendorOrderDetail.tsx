import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Package, User, MapPin, Clock } from 'lucide-react';
import Layout from '../app/components/layout/Layout';
import { Button } from '../app/components/ui/button';
import { Card } from '../app/components/ui/card';
import { Badge } from '../app/components/ui/badge';
import { Alert, AlertDescription } from '../app/components/ui/alert';
import { getOrderDetails } from '../services/vendorAPI';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'confirmed':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'processing':
      return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'picked':
    case 'shipped':
      return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    case 'delivered':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'cancelled':
      return 'bg-red-100 text-red-700 border-red-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

const VendorOrderDetail: React.FC = () => {
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId) {
        setError('Order id is missing.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await getOrderDetails(orderId);
        setOrder(data);
      } catch (err: any) {
        setError(err?.response?.data?.error || err?.response?.data?.detail || 'Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId]);

  if (loading) {
    return (
      <Layout variant="vendor">
        <div className="p-6">
          <Card className="p-8 text-center">
            <p className="text-gray-600">Loading order details...</p>
          </Card>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout variant="vendor">
        <div className="p-6 space-y-4">
          <Button variant="outline" onClick={() => navigate('/vendor?tab=orders')}>
            <ArrowLeft className="w-4 h-4 mr-2" />Back to Orders
          </Button>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  if (!order) {
    return (
      <Layout variant="vendor">
        <div className="p-6 space-y-4">
          <Button variant="outline" onClick={() => navigate('/vendor?tab=orders')}>
            <ArrowLeft className="w-4 h-4 mr-2" />Back to Orders
          </Button>
          <Card className="p-8 text-center">
            <p className="text-gray-600">Order not found.</p>
          </Card>
        </div>
      </Layout>
    );
  }

  const items = order.items || [];

  return (
    <Layout variant="vendor">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate('/vendor?tab=orders')}>
            <ArrowLeft className="w-4 h-4 mr-2" />Back to Orders
          </Button>
          <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
        </div>

        <Card className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Order #{order.order_id || order.id?.slice(0, 8).toUpperCase()}</h1>
              <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Created on {new Date(order.created_at).toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Total Amount</p>
              <p className="text-2xl font-bold">AFN {parseFloat(order.total_amount || '0').toLocaleString()}</p>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />Customer Information
            </h2>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Name:</span> {order.customer?.full_name || order.customer_name || 'N/A'}</p>
              <p><span className="font-medium">Phone:</span> {order.customer?.phone || order.customer_phone || 'N/A'}</p>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" />Delivery Information
            </h2>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Address:</span> {order.delivery_address || 'N/A'}</p>
              <p><span className="font-medium">City:</span> {order.city || 'N/A'}</p>
              <p><span className="font-medium">Province:</span> {order.province || 'N/A'}</p>
              {order.delivery_notes && (
                <p><span className="font-medium">Notes:</span> {order.delivery_notes}</p>
              )}
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Package className="w-5 h-5" />Order Items
          </h2>

          {items.length === 0 ? (
            <p className="text-sm text-gray-600">No item details available for this order.</p>
          ) : (
            <div className="space-y-3">
              {items.map((item: any) => {
                const quantity = Number(item.quantity || 0);
                const unitPrice = Number(item.price_at_order || 0);
                const subtotal = quantity * unitPrice;

                return (
                  <div key={item.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">{item.product_name || item.product?.name || 'Product'}</p>
                        <p className="text-sm text-gray-600 mt-1">Qty: {quantity}</p>
                        <p className="text-sm text-gray-600">Unit Price: AFN {unitPrice.toLocaleString()}</p>
                      </div>
                      <p className="font-semibold">AFN {subtotal.toLocaleString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
};

export default VendorOrderDetail;
