// File 2: frontend/src/pages/MyOrders.tsx

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Package, Clock, CheckCircle, Truck, XCircle, Eye, MapPin, Phone, Star } from 'lucide-react';
import Layout from '../app/components/layout/Layout';
import api from '../services/api';

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  price_at_order: string;
  product?: { name: string; primary_image: string };
}

interface Order {
  id: string;
  order_id: string;
  status: 'pending' | 'confirmed' | 'processing' | 'picked' | 'shipped' | 'delivered' | 'cancelled';
  status_display: string;
  created_at: string;
  total_amount: string;
  items: OrderItem[];
  delivery_address: string;
  city: string;
  province: string;
  customer_name: string;
  customer_phone: string;
}

const MyOrders: React.FC = () => {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    loadOrders();
  }, [activeFilter]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await api.get('/user/orders/', {
        params: activeFilter !== 'all' ? { status: activeFilter } : {}
      });
      setOrders(response.data);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-5 h-5" />;
      case 'confirmed': return <CheckCircle className="w-5 h-5" />;
      case 'shipped': return <Truck className="w-5 h-5" />;
      case 'delivered': return <Package className="w-5 h-5" />;
      case 'cancelled': return <XCircle className="w-5 h-5" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

  const filters = [
    { id: 'all', label: t('orders_filter_all') },
    { id: 'pending', label: t('orders_filter_pending') },
    { id: 'confirmed', label: t('orders_filter_confirmed') },
    { id: 'shipped', label: t('orders_filter_shipped') },
    { id: 'delivered', label: t('orders_filter_delivered') },
    { id: 'cancelled', label: t('orders_filter_cancelled') },
  ];

  return (
    <Layout variant="customer" cartItemCount={0}>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
        <main className="max-w-6xl mx-auto px-4 py-8 pb-20">
          {/* Header Section */}
          <div className="mb-10">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{t('my_orders_heading')}</h1>
            <p className="text-gray-600 text-lg">{t('my_orders_description')}</p>
          </div>

          {/* Filter Tabs */}
          <div className="mb-8 flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`px-6 py-2.5 rounded-lg font-semibold whitespace-nowrap transition-all ${
                  activeFilter === filter.id
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Orders List */}
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
              <p className="text-gray-600 text-lg">{t('orders_loading')}</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-lg shadow-sm border border-gray-100">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Package className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('order_no_orders')}</h3>
              <p className="text-gray-600 mb-8">{t('orders_empty_description')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden"
                >
                  <div className="p-6">
                    {/* Order Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 pb-6 border-b border-gray-100">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-xl font-bold text-gray-900">{t('order_id')}: #{order.order_id}</h3>
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}>
                            {getStatusIcon(order.status)}
                            <span>{order.status_display || order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {t('order_placed_on')} <span className="font-medium">{new Date(order.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}</span>
                        </p>
                      </div>
                      <div className="text-right sm:min-w-max">
                        <p className="text-xs text-gray-600 uppercase tracking-wider mb-1">{t('order_total_amount')}</p>
                        <p className="text-3xl font-bold text-teal-600">AFN {order.total_amount}</p>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">{t('order_items_count', { count: order.items.length })}</h4>
                      <div className="space-y-2">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                            <div className="flex-1 min-w-0">
                              <h5 className="font-semibold text-gray-900 truncate">{item.product_name}</h5>
                              <p className="text-sm text-gray-600">Qty: <span className="font-medium">{item.quantity}</span></p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-lg font-bold text-gray-900">AFN {item.price_at_order}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="flex-1 bg-teal-600 text-white px-4 py-2.5 rounded-lg hover:bg-teal-700 transition-colors font-semibold flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                      >
                        <Eye className="w-4 h-4" />
                        {t('order_view_details')}
                      </button>
                      {order.status === 'delivered' && (
                        <button className="flex-1 bg-white text-teal-600 border-2 border-teal-600 px-4 py-2.5 rounded-lg hover:bg-teal-50 transition-colors font-semibold">
                          {t('order_write_review')}
                        </button>
                      )}
                      {order.status === 'pending' && (
                        <button className="flex-1 bg-white text-red-600 border-2 border-red-600 px-4 py-2.5 rounded-lg hover:bg-red-50 transition-colors font-semibold">
                          {t('order_cancel_order')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Order Details Modal */}
          {selectedOrder && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
                {/* Modal Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Order Details</h2>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {/* Order Info Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Order Information</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-600 uppercase tracking-wider mb-1">Order Number</p>
                        <p className="text-lg font-bold text-gray-900">#{selectedOrder.order_id}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-600 uppercase tracking-wider mb-1">Status</p>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedOrder.status)}`}>
                          {getStatusIcon(selectedOrder.status)}
                          <span>{selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}</span>
                        </span>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 sm:col-span-2">
                        <p className="text-xs text-gray-600 uppercase tracking-wider mb-1">Order Date</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {new Date(selectedOrder.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Info */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Delivery Information</h3>
                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg border-2 border-teal-200 p-5 space-y-4">
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-gray-600 font-medium mb-1">Delivery Address</p>
                          <p className="text-gray-900 font-semibold">{selectedOrder.delivery_address}</p>
                          <p className="text-sm text-gray-600 mt-1">{selectedOrder.city}, {selectedOrder.province}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 pt-4 border-t border-gray-200">
                        <Phone className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-gray-600 font-medium mb-1">Contact Number</p>
                          <p className="text-gray-900 font-semibold">{selectedOrder.customer_phone}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Items */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Order Items</h3>
                    <div className="space-y-3">
                      {selectedOrder.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-teal-200 transition-colors">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 mb-1">{item.product_name}</h4>
                            <p className="text-sm text-gray-600">Quantity: <span className="font-medium text-gray-900">{item.quantity}</span></p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-lg font-bold text-teal-600">AFN {item.price_at_order}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Total */}
                  <div className="border-t border-gray-200 pt-6">
                    <div className="flex justify-between items-center bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg p-5 border-2 border-teal-200">
                      <span className="text-lg font-bold text-gray-900">Total Amount</span>
                      <span className="text-3xl font-bold text-teal-600">AFN {selectedOrder.total_amount}</span>
                    </div>
                  </div>

                  {/* Close Button */}
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="w-full bg-teal-600 text-white py-3 rounded-lg hover:bg-teal-700 transition-colors font-semibold shadow-sm hover:shadow-md"
                  >
                    Close
                  </button>

                  {/* Leave Review Button */}
                  {selectedOrder.status === 'delivered' && (
                    <button
                      onClick={() => {
                        // Navigate to review page with order id
                        setSelectedOrder(null);
                        window.scrollTo(0, 0);
                        // You can implement this functionality when MyReviews page is ready
                        alert('Review functionality will open when you submit. For now, you can leave reviews on individual product pages.');
                      }}
                      className="w-full bg-yellow-500 text-white py-3 rounded-lg hover:bg-yellow-600 transition-colors font-semibold shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                    >
                      <Star className="w-5 h-5" />
                      Leave Review
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </Layout>
  );
};

export default MyOrders;