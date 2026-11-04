// File: frontend/src/pages/Cart.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingCart, Truck, Lock, Gift, ArrowLeft, Check } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { getAbsoluteImageUrl } from '@/utils/imageUtils';

interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  slug?: string;
  seller: {
    name: string;
  };
}

interface CartProps {
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
}

const Cart: React.FC<CartProps> = ({ items, onUpdateQuantity, onRemoveItem }) => {
  const navigate = useNavigate();
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);

  // console.log('🛒 Cart component mounted/updated with items:', items);
  // console.log('   - Item count:', items.length);
  // console.log('   - Items details:', JSON.stringify(items, null, 2));

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = items.length > 0 ? 200 : 0;
  const discount = appliedPromo ? Math.floor(subtotal * 0.1) : 0; // 10% discount
  const taxes = Math.floor(subtotal * 0.05); // 5% tax
  const total = subtotal + deliveryFee + taxes - discount;

  const handleProductClick = (item: CartItem) => {
    if (item.slug) {
      navigate(`/product/${item.slug}`);
    } else {
      console.warn('Product slug is missing for item:', item.id);
      navigate(`/product/${item.name.toLowerCase().replace(/\s+/g, '-')}`);
    }
  };

  const handleApplyPromo = () => {
    if (promoCode.trim()) {
      setAppliedPromo(promoCode);
      setPromoCode('');
    }
  };

  const handleCheckout = () => {
    navigate('/checkout', { state: { items, total } });
  };

  return (
    <Layout
      variant="customer"
      cartItemCount={items.reduce((sum, item) => sum + item.quantity, 0)}
      onCartClick={() => navigate('/cart')}
      onProfileClick={() => navigate('/profile')}
      showFooter={true}
    >
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
        <main className="max-w-6xl mx-auto px-4 py-8 pb-40">
          {/* Header with Navigation */}
          <div className="mb-8 flex items-center gap-3">
            <button
              onClick={() => navigate('/home')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
            <span className="ml-auto text-sm font-medium text-gray-500">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="text-center">
                <div className="bg-gradient-to-b from-teal-50 to-blue-50 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                  <ShoppingCart className="w-12 h-12 text-teal-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
                <p className="text-gray-500 mb-8">Looks like you haven't added any products yet. Start shopping now!</p>
                <Button
                  onClick={() => navigate('/products')}
                  className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  Continue Shopping
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Cart Items Section */}
              <div className="lg:col-span-2">
                <Card className="border-0 shadow-md overflow-hidden">
                  {/* Cart Items Header */}
                  <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-600">ITEMS</p>
                  </div>

                  {/* Items List */}
                  <div className="divide-y divide-gray-100">
                    {items.map((item, index) => (
                      <div
                        key={item.id}
                        className={`p-6 hover:bg-teal-50/30 transition-colors duration-200 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                        }`}
                      >
                        <div className="flex gap-6">
                          {/* Product Image */}
                          <div
                            className="w-28 h-28 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer shadow-sm hover:shadow-md transition-shadow duration-300"
                            onClick={() => handleProductClick(item)}
                          >
                            <img
                              src={getAbsoluteImageUrl(item.image)}
                              alt={item.name}
                              onError={(e) => {
                                e.currentTarget.src = '/placeholder.svg';
                              }}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            />
                          </div>

                          {/* Product Details */}
                          <div className="flex-1">
                            <h3
                              className="text-base font-bold text-gray-900 mb-1 cursor-pointer hover:text-teal-600 transition-colors line-clamp-2"
                              onClick={() => handleProductClick(item)}
                            >
                              {item.name}
                            </h3>
                            <p className="text-sm text-gray-500 mb-3">
                              Seller: <span className="font-medium text-gray-700">{item.seller.name}</span>
                            </p>

                            {/* Price and Quantity Controls */}
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-lg font-bold text-teal-600">
                                  AFN {item.price.toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Each
                                </p>
                              </div>

                              {/* Quantity Selector */}
                              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-white transition-colors"
                                  onClick={() =>
                                    onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))
                                  }
                                >
                                  <Minus className="w-4 h-4 text-gray-600" />
                                </Button>
                                <span className="w-8 text-center font-bold text-gray-900">{item.quantity}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-white transition-colors"
                                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                                >
                                  <Plus className="w-4 h-4 text-gray-600" />
                                </Button>
                              </div>

                              {/* Remove Button */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors ml-2"
                                onClick={() => onRemoveItem(item.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>

                            {/* Subtotal for item */}
                            <div className="mt-3 text-right">
                              <p className="text-sm text-gray-600">
                                Subtotal: <span className="font-bold text-gray-900">AFN {(item.price * item.quantity).toLocaleString()}</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Trust Badges */}
                <div className="grid grid-cols-3 gap-4 mt-8">
                  <div className="bg-white rounded-lg p-4 text-center border border-gray-100 shadow-sm">
                    <Lock className="w-6 h-6 text-teal-600 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-gray-700">Secure Payment</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center border border-gray-100 shadow-sm">
                    <Truck className="w-6 h-6 text-teal-600 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-gray-700">Fast Delivery</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center border border-gray-100 shadow-sm">
                    <Gift className="w-6 h-6 text-teal-600 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-gray-700">Easy Returns</p>
                  </div>
                </div>
              </div>

              {/* Order Summary Section */}
              <div>
                <Card className="border-0 shadow-md p-6 sticky top-20">
                  <h3 className="text-lg font-bold text-gray-900 mb-6">Order Summary</h3>

                  {/* Summary Items */}
                  <div className="space-y-3 mb-6 pb-6 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Subtotal</span>
                      <span className="font-semibold text-gray-900">AFN {subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Taxes (5%)</span>
                      <span className="font-semibold text-gray-900">AFN {taxes.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Delivery Fee</span>
                      <span className="font-semibold text-gray-900">AFN {deliveryFee.toLocaleString()}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-green-600 text-sm font-medium flex items-center gap-1">
                          <Check className="w-4 h-4" /> Discount (10%)
                        </span>
                        <span className="font-semibold text-green-600">-AFN {discount.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Total */}
                  <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg p-4 mb-6 border border-teal-100">
                    <p className="text-gray-600 text-sm font-medium mb-1">Total Amount</p>
                    <p className="text-3xl font-bold text-teal-600">AFN {total.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-2">Including all taxes and fees</p>
                  </div>

                  {/* Promo Code */}
                  <div className="mb-6">
                    <label className="text-sm font-semibold text-gray-700 block mb-2">Promo Code</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter code"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        disabled={!!appliedPromo}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      {!appliedPromo ? (
                        <Button
                          onClick={handleApplyPromo}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 text-sm font-medium transition-colors"
                        >
                          Apply
                        </Button>
                      ) : (
                        <Button
                          onClick={() => setAppliedPromo(null)}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 text-sm font-medium transition-colors"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* COD Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <p className="text-sm font-semibold text-blue-900 mb-1">💵 Cash on Delivery</p>
                    <p className="text-xs text-blue-700">Pay safely when your order arrives</p>
                  </div>

                  {/* Checkout Button */}
                  <Button
                    className="w-full bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 text-base mb-3"
                    onClick={handleCheckout}
                  >
                    Proceed to Checkout
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full border-2 border-gray-300 text-gray-700 font-semibold py-2 rounded-lg hover:bg-gray-50 transition-colors"
                    onClick={() => navigate('/products')}
                  >
                    Continue Shopping
                  </Button>
                </Card>
              </div>
            </div>
          )}
        </main>
      </div>
    </Layout>
  );
};

export default Cart;