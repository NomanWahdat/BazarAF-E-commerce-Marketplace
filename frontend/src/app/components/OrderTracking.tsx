import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Package, MapPin, CheckCircle, Circle, RefreshCw } from 'lucide-react';
import Layout from './layout/Layout';
import { Button } from './ui/button';
import { Card } from './ui/card';
import api, { apiErrorMessage } from '../../services/api';
import { formatAFN, formatKabulDate } from '../../utils/locale';

interface Order {
  id: string; order_id: string; status: string; total_amount: string;
  delivery_address: string; city: string; province: string; updated_at: string;
  items: { id: string; product_name: string; quantity: number; price_at_order: string; product?: { primary_image?: string } }[];
}
interface OrderTrackingProps { onNavigate: (page: string, data?: unknown) => void; orderId?: string; }
const steps = ['pending', 'confirmed', 'processing', 'picked', 'shipped', 'delivered'];

export function OrderTracking({ orderId: initialId }: OrderTrackingProps) {
  const { t } = useTranslation();
  const { orderId } = useParams();
  const navigate = useNavigate();
  const reference = orderId || initialId || '';
  const [query, setQuery] = useState(reference);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const signedIn = Boolean(localStorage.getItem('access_token'));

  useEffect(() => {
    if (!reference || !signedIn) return;
    const controller = new AbortController();
    setLoading(true); setError(''); setOrder(null);
    api.get(`/orders/track/${encodeURIComponent(reference)}/`, { signal: controller.signal })
      .then(({ data }) => setOrder(data.order))
      .catch(error => { if (!controller.signal.aborted) setError(apiErrorMessage(error, t('tracking_not_found'))); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reference, signedIn, revision, t]);

  const cancel = async () => {
    if (!order || !window.confirm(t('tracking_cancel_confirm'))) return;
    setLoading(true);
    try { await api.post(`/orders/${order.id}/cancel/`); setRevision(value => value + 1); }
    catch (error) { setError(apiErrorMessage(error, t('quote_failed'))); }
    finally { setLoading(false); }
  };

  return <Layout variant="customer">
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center gap-3"><Package className="text-teal-700" size={32} /><h1 className="text-3xl font-bold">{t('tracking_title')}</h1></div>
      {!signedIn ? <Card className="p-6 space-y-4"><p>{t('tracking_sign_in')}</p><Button onClick={() => navigate('/login')}>{t('login')}</Button></Card> : <>
        <form className="flex flex-wrap gap-3" onSubmit={event => { event.preventDefault(); if (query.trim()) navigate(`/order-tracking/${encodeURIComponent(query.trim())}`); }}>
          <label className="flex-1 min-w-48"><span className="sr-only">{t('tracking_reference')}</span><input value={query} onChange={event => setQuery(event.target.value)} required dir="ltr" placeholder="ORD-?" className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3" /></label>
          <Button type="submit" className="h-12">{t('tracking_search')}</Button>
        </form>
        {loading && <p role="status">{t('loading')}</p>}
        {error && <div role="alert" className="rounded-lg bg-red-50 text-red-800 p-4">{error}<Button variant="outline" className="ms-3" onClick={() => setRevision(value => value + 1)}>{t('retry')}</Button></div>}
        {order && <>
          <Card className="p-6 space-y-4 border-teal-100 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-mono text-sm break-all" dir="ltr">{order.order_id}</h2><span className="rounded-full bg-teal-50 px-3 py-1 text-teal-900 font-medium">{t(order.status)}</span></div>
            <p className="text-3xl font-bold text-teal-800"><bdi>{formatAFN(order.total_amount)}</bdi></p>
            <p className="text-sm text-slate-500">{t('tracking_updated')}: {formatKabulDate(order.updated_at)}</p>
            <Button variant="outline" disabled={loading} onClick={() => setRevision(value => value + 1)}><RefreshCw size={16} className="me-2" />{t('tracking_refresh')}</Button>
          </Card>
          {order.status !== 'cancelled' && <Card className="p-6"><ol className="space-y-5">{steps.map((step, index) => {
            const complete = index <= steps.indexOf(order.status);
            return <li key={step} className="flex items-center gap-3" aria-current={step === order.status ? 'step' : undefined}>{complete ? <CheckCircle className="text-teal-600" /> : <Circle className="text-slate-300" />}<span className={complete ? 'font-medium text-teal-950' : 'text-slate-500'}>{t(step)}</span></li>;
          })}</ol></Card>}
          <Card className="p-6 space-y-4"><h2 className="font-semibold flex items-center gap-2"><MapPin size={20} />{t('checkout_delivery_information')}</h2><p>{order.province} ? {order.city}</p><p>{order.delivery_address}</p></Card>
          <Card className="p-6 space-y-5"><h2 className="font-semibold">{t('tracking_items')}</h2>{order.items.map(item => <div key={item.id} className="flex gap-4 items-center border-b border-slate-100 pb-4 last:border-0">
            {item.product?.primary_image && <img src={item.product.primary_image} alt="" loading="lazy" width={64} height={64} className="rounded-lg object-cover w-16 h-16" />}
            <div className="flex-1"><p className="font-medium">{item.product_name}</p><p className="text-sm text-slate-500">{t('quantity_label')}: {item.quantity}</p></div><bdi>{formatAFN(Number(item.price_at_order) * item.quantity)}</bdi>
          </div>)}</Card>
          <div className="flex flex-wrap gap-3">{['pending', 'confirmed'].includes(order.status) && <Button variant="outline" disabled={loading} onClick={cancel}>{t('tracking_cancel')}</Button>}<Link className="inline-flex items-center rounded-lg bg-teal-700 px-4 py-2 text-white" to={`/help-support?order=${encodeURIComponent(order.order_id)}`}>{t('tracking_help')}</Link></div>
        </>}
      </>}
    </div>
  </Layout>;
}
