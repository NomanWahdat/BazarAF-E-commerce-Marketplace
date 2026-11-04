// File: frontend/src/pages/Checkout.tsx

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Package, MapPin, CreditCard, CheckCircle, ArrowLeft } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { Separator } from '@/app/components/ui/separator';
import api, { apiErrorMessage } from '../../services/api';
import { formatAFN, normalizeAfghanPhone } from '../../utils/locale';

interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  seller: {
    id?: string;
    name: string;
  };
}

interface CheckoutProps {
  items: CartItem[];
  onNavigate: (page: string, data?: any) => void;
  onClearCart: () => void;
}

export function Checkout({ items, onClearCart }: CheckoutProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState<'details' | 'confirm' | 'success'>('details');
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState('');
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    province: '',
    city: '',
    address: '',
    notes: '',
    payment_method: 'cod',
  });

  const [errors, setErrors] = useState({
    full_name: '',
    phone: '',
    province: '',
    city: '',
    address: '',
  });

  const [quote, setQuote] = useState<{ subtotal: string; delivery_fee: string; total: string } | null>(null);
  const [zones, setZones] = useState<{ province: string; city: string; fee: string }[]>([]);
  const [requestError, setRequestError] = useState('');
  const checkoutKey = useRef(crypto.randomUUID());
  const submitting = useRef(false);
  useEffect(() => {
    let active = true;
    api.get('/user/profile/').then(({ data }) => {
      const user = data.user || data.data || data;
      if (active) setFormData(previous => ({ ...previous, full_name: user.full_name || '', phone: user.phone || '' }));
    }).catch(() => undefined);
    api.get('/delivery-zones/').then(({ data }) => { if (active) setZones(data.zones); }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  const subtotal = quote ? Number(quote.subtotal) : items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = quote ? Number(quote.delivery_fee) : 0;
  const total = quote ? Number(quote.total) : subtotal;
  const orderData = () => ({
    customer_name: formData.full_name, customer_phone: normalizeAfghanPhone(formData.phone),
    delivery_address: { province: formData.province, city: formData.city, address: formData.address },
    delivery_notes: formData.notes, payment_method: 'cod',
    items: items.map(item => ({ product_id: item.id, quantity: item.quantity })),
  });

  const validateForm = () => {
    const newErrors = {
      full_name: '',
      phone: '',
      province: '',
      city: '',
      address: '',
    };

    if (!formData.full_name.trim()) {
      newErrors.full_name = t('error_full_name_required_checkout');
    }
    if (!formData.phone.trim()) {
      newErrors.phone = t('error_phone_required_checkout');
    } else if (!/^[0-9+\s-]{10,15}$/.test(formData.phone)) {
      newErrors.phone = t('error_phone_invalid_checkout');
    }
    if (!formData.province.trim()) {
      newErrors.province = t('error_province_required');
    }
    if (!formData.city.trim()) {
      newErrors.city = t('error_city_required');
    }
    if (!formData.address.trim()) {
      newErrors.address = t('error_address_required');
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error);
  };

  const handleSubmit = async () => {
    if (submitting.current || !validateForm()) return;
    if (!localStorage.getItem('access_token')) { navigate('/login', { state: { from: '/checkout' } }); return; }
    submitting.current = true;
    setLoading(true);
    setRequestError('');
    try {
      if (step === 'details') {
        const { data } = await api.post('/orders/quote/', orderData());
        setQuote(data);
        checkoutKey.current = crypto.randomUUID();
        setStep('confirm');
      } else {
        const { data: latest } = await api.post('/orders/quote/', orderData());
        if (latest.total !== quote?.total) {
          setQuote(latest);
          setRequestError(t('quote_changed'));
          checkoutKey.current = crypto.randomUUID();
          return;
        }
        const { data } = await api.post('/orders/checkout/', { ...orderData(), expected_total: latest.total }, {
          headers: { 'Idempotency-Key': checkoutKey.current },
        });
        setOrderId(data.order.id);
        setQuote({ subtotal: data.order.subtotal, delivery_fee: data.order.delivery_fee, total: data.order.total });
        setStep('success');
        onClearCart();
        navigate(`/order-tracking/${encodeURIComponent(data.order.id)}`, { replace: true });
      }
    } catch (error) {
      setRequestError(apiErrorMessage(error, t('quote_failed')));
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  if (!items.length && step !== 'success') return <Layout variant="customer"><div className="max-w-lg mx-auto py-20 text-center space-y-4"><Package className="mx-auto text-teal-700" size={48} /><h1 className="text-2xl font-bold">{t('empty_cart')}</h1><Button onClick={() => navigate('/products')}>{t('continue_shopping')}</Button></div></Layout>;

  if (step === 'success') {
    return (
      <Layout variant="customer" cartItemCount={0} showFooter={false}>
        <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 flex items-center justify-center p-4">
          <div className="max-w-lg w-full space-y-6">
            <Card className="p-8 text-center bg-white border-0 shadow-md">
              <div className="w-20 h-20 bg-gradient-to-b from-teal-50 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                <CheckCircle className="w-11 h-11 text-teal-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">{t('checkout_order_confirmed')}</h2>
              <p className="text-gray-600 mb-6">{t('checkout_order_placed_successfully')}</p>
              
              <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
                <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">{t('checkout_order_reference')}</div>
                <div className="text-2xl font-bold text-teal-600 mb-4 font-mono">{orderId}</div>
                
                <div className="space-y-3 text-left">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">{t('checkout_total_amount')}</span>
                    <span className="font-bold text-gray-900">{formatAFN(total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">{t('checkout_payment_method')}</span>
                    <span className="font-semibold text-teal-700">{t('checkout_cod')}</span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-6">{t('checkout_redirecting_to_tracking')}</p>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      variant="customer" 
      cartItemCount={items.length}
      onCartClick={() => navigate('/cart')}
      onProfileClick={() => navigate('/profile')}
      showFooter={true}
    >
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
        <main className="max-w-6xl mx-auto px-4 py-8 pb-20">
          <datalist id="delivery-provinces">{[...new Set(zones.map(zone => zone.province))].map(province => <option key={province} value={province} />)}</datalist>
          <datalist id="delivery-cities">{zones.filter(zone => zone.province === formData.province).map(zone => <option key={zone.city} value={zone.city} />)}</datalist>
          {requestError && <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{requestError}</div>}

          {/* Header */}
            <div className="mb-8 flex items-center gap-3">
            <button
              onClick={() => navigate('/cart')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{t('checkout_heading')}</h1>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center gap-4">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm transition-colors ${
                step === 'details' ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                1
              </div>
              <div className={`flex-1 h-1 transition-colors ${step !== 'details' ? 'bg-teal-600' : 'bg-gray-200'}`}></div>
              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm transition-colors ${
                step === 'confirm' ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
            </div>
            <div className="flex justify-between mt-2 text-xs font-medium text-gray-600">
              <span>{t('checkout_delivery')}</span>
              <span>{t('checkout_confirm')}</span>
            </div>
          </div>

          {step === 'details' && (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Form Section */}
              <div className="lg:col-span-2 space-y-6">
                {/* Delivery Information */}
                <Card className="border-0 shadow-md p-6 bg-white">
                      <div className="flex items-center gap-3 mb-6">
                        <MapPin className="w-5 h-5 text-teal-600" />
                        <h3 className="text-xl font-bold text-gray-900">{t('checkout_delivery_information')}</h3>
                      </div>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="full_name" className="text-gray-700 font-semibold mb-2 block text-sm">{t('checkout_full_name_label')} *</Label>
                      <Input
                        id="full_name" autoComplete="name"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        placeholder={t('checkout_full_name_placeholder')}
                        className={`h-10 rounded-lg border ${errors.full_name ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white focus:border-teal-500'} transition-colors`}
                      />
                      {errors.full_name && <p className="text-xs text-red-500 mt-1">{errors.full_name}</p>}
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-gray-700 font-semibold mb-2 block text-sm">{t('checkout_phone_label')} *</Label>
                      <Input
                        id="phone" type="tel" dir="ltr" autoComplete="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder={t('checkout_phone_placeholder')}
                        className={`h-10 rounded-lg border ${errors.phone ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white focus:border-teal-500'} transition-colors`}
                      />
                      {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="province" className="text-gray-700 font-semibold mb-2 block text-sm">{t('checkout_province_label')} *</Label>
                        <Input
                          id="province" list="delivery-provinces" autoComplete="address-level1"
                          value={formData.province}
                          onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                          placeholder={t('checkout_province_placeholder')}
                          className={`h-10 rounded-lg border ${errors.province ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white focus:border-teal-500'} transition-colors`}
                        />
                        {errors.province && <p className="text-xs text-red-500 mt-1">{errors.province}</p>}
                      </div>
                      <div>
                        <Label htmlFor="city" className="text-gray-700 font-semibold mb-2 block text-sm">{t('checkout_city_label')} *</Label>
                        <Input
                          id="city" list="delivery-cities" autoComplete="address-level2"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          placeholder={t('checkout_city_placeholder')}
                          className={`h-10 rounded-lg border ${errors.city ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white focus:border-teal-500'} transition-colors`}
                        />
                        {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="address" className="text-gray-700 font-semibold mb-2 block text-sm">{t('checkout_address_label')} *</Label>
                      <Textarea
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder={t('address_landmark')}
                        className={`rounded-lg border ${errors.address ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white focus:border-teal-500'} transition-colors resize-none`}
                        rows={3}
                      />
                      {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
                    </div>
                    <div>
                      <Label htmlFor="notes" className="text-gray-700 font-semibold mb-2 block text-sm">{t('checkout_notes_label')}</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder={t('checkout_notes_placeholder')}
                        className="h-20 rounded-lg border border-gray-300 bg-white focus:border-teal-500 transition-colors resize-none"
                        rows={2}
                      />
                    </div>
                  </div>
                </Card>

                {/* Payment Method */}
                <Card className="border-0 shadow-md p-6 bg-white">
                  <div className="flex items-center gap-3 mb-6">
                    <CreditCard className="w-5 h-5 text-teal-600" />
                    <h3 className="text-xl font-bold text-gray-900">{t('checkout_payment_method')}</h3>
                  </div>
                  <RadioGroup 
                    value={formData.payment_method} 
                    onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                  >
                    <div className="border-2 border-teal-200 bg-teal-50 rounded-lg p-4 hover:bg-teal-100/50 transition-colors">
                      <div className="flex items-start gap-3">
                        <RadioGroupItem value="cod" id="cod" className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor="cod" className="cursor-pointer">
                            <div className="flex items-center gap-2 mb-1">
                              <Package className="w-4 h-4 text-teal-700" />
                              <span className="font-semibold text-gray-900">{t('checkout_cod_recommended')}</span>
                            </div>
                            <p className="text-sm text-gray-600">{t('checkout_cod_description')}</p>
                          </Label>
                        </div>
                      </div>
                    </div>
                  </RadioGroup>
                </Card>

                {/* Action Buttons */}
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !navigator.onLine}
                  className="w-full h-11 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-colors shadow-md hover:shadow-lg"
                >
                  {t('checkout_continue_to_confirm')}
                </Button>
              </div>

              {/* Order Summary Sidebar */}
              <div>
                <Card className="border-0 shadow-md p-6 bg-white sticky top-20">
                  <h3 className="text-lg font-bold mb-6 text-gray-900">{t('checkout_order_summary')}</h3>
                  <div className="space-y-3 mb-6 max-h-72 overflow-y-auto pr-2">
                    {items.map((item) => (
                      <div key={item.id} className="flex gap-3 pb-3 border-b border-gray-100 last:border-0">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1">{item.name}</div>
                          <div className="text-xs text-gray-500">{t('quantity_label')}: {item.quantity}</div>
                          <div className="text-sm font-bold text-teal-600">{formatAFN(item.price * item.quantity)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Separator className="my-4" />
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{t('checkout_subtotal')}</span>
                      <span className="font-semibold text-gray-900">{formatAFN(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{t('checkout_delivery_fee')}</span>
                      <span className="font-semibold text-gray-900">{quote ? formatAFN(deliveryFee) : t('quote_pending')}</span>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <div className="flex justify-between font-bold text-lg mb-6">
                    <span className="text-gray-900">{t('checkout_total')}</span>
                    <span className="text-teal-600">{formatAFN(total)}</span>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {step === 'confirm' && (
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Delivery Details */}
              <Card className="border-0 shadow-md p-6 bg-white">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-teal-600" />
                    <h3 className="text-xl font-bold text-gray-900">{t('checkout_step_details')}</h3>
                  </div>
                  <Button variant="link" className="text-teal-600 hover:text-teal-700 font-semibold text-sm" onClick={() => setStep('details')}>
                    {t('edit')}
                  </Button>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-600">{t('checkout_full_name_label')}:</span>
                    <span className="font-semibold text-gray-900">{formData.full_name}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-600">{t('checkout_phone_label')}:</span>
                    <span className="font-semibold text-gray-900">{formData.phone}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-600">{t('checkout_location_label')}:</span>
                    <span className="font-semibold text-gray-900">{formData.province}, {formData.city}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-600">{t('checkout_address_label')}:</span>
                    <span className="font-semibold text-gray-900 text-right max-w-xs">{formData.address}</span>
                  </div>
                  {formData.notes && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('checkout_notes_label')}:</span>
                      <span className="font-semibold text-gray-900 text-right max-w-xs">{formData.notes}</span>
                    </div>
                  )}
                </div>
              </Card>

              {/* Order Items */}
              <Card className="border-0 shadow-md p-6 bg-white">
                <div className="flex items-center gap-3 mb-6">
                  <Package className="w-5 h-5 text-teal-600" />
                  <h3 className="text-xl font-bold text-gray-900">{t('checkout_order_items')}</h3>
                </div>
                <div className="space-y-3 divide-y divide-gray-100">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                      <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 mb-1">{item.name}</div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>{t('product_detail_quantity')}: {item.quantity}</div>
                          <div>{t('checkout_unit_price')}: AFN {item.price.toLocaleString()}</div>
                        </div>
                        <div className="text-base font-bold text-teal-600 mt-2">{formatAFN(item.price * item.quantity)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Payment Summary */}
              <Card className="border-0 shadow-md p-6 bg-white">
                <div className="flex items-center gap-3 mb-6">
                  <CreditCard className="w-5 h-5 text-teal-600" />
                  <h3 className="text-xl font-bold text-gray-900">{t('checkout_payment_summary')}</h3>
                </div>
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('checkout_subtotal')}</span>
                    <span className="font-semibold text-gray-900">{formatAFN(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('checkout_delivery_fee')}</span>
                    <span className="font-semibold text-gray-900">{quote ? formatAFN(deliveryFee) : t('quote_pending')}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-bold text-lg">
                    <span className="text-gray-900">{t('checkout_total_amount')}</span>
                    <span className="text-teal-600">{formatAFN(total)}</span>
                  </div>
                </div>
                <div className="bg-teal-50 rounded-lg p-4 flex items-start gap-3 border border-teal-200">
                  <Package className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-gray-900">{t('checkout_cod')}</p>
                    <p className="text-gray-600">{t('checkout_cod_description')}</p>
                  </div>
                </div>
              </Card>

              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  className="flex-1 h-10 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold transition-colors"
                  onClick={() => setStep('details')}
                >
                  ← {t('checkout_back_to_edit')}
                </Button>
                <Button 
                  className="flex-1 h-10 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-colors shadow-md hover:shadow-lg" 
                  size="lg" 
                  onClick={handleSubmit}
                  disabled={loading || !navigator.onLine}
                                  >
                  {loading ? t('checkout_placing_order') : t('checkout_place_order')}
                </Button>
              </div>
              <p className="text-xs text-center text-gray-600">{t('checkout_terms_notice')}</p>
            </div>
          )}
        </main>
      </div>
    </Layout>
  );
}