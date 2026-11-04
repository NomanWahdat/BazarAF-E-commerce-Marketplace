import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api, { apiErrorMessage } from '../services/api';
import { Button } from '../app/components/ui/button';
import { formatKabulDate } from '../utils/locale';

interface Ticket { id: string; subject: string; status: string; response: string; created_at: string; }
export function SupportRequests() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [form, setForm] = useState({ subject: '', message: '', kind: 'general', order_reference: params.get('order') || '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const authenticated = Boolean(localStorage.getItem('access_token'));
  useEffect(() => {
    if (!authenticated) return;
    const controller = new AbortController();
    api.get('/support/', { signal: controller.signal }).then(({ data }) => setTickets(data.results || data))
      .catch(error => { if (!controller.signal.aborted) setError(apiErrorMessage(error, t('network_error'))); });
    return () => controller.abort();
  }, [authenticated, revision, t]);
  if (!authenticated) return <div className="rounded-xl border bg-white p-6"><Link className="text-teal-700 underline" to="/login">{t('login')}</Link> · {t('support_title')}</div>;
  return <section className="rounded-2xl border border-teal-100 bg-white p-6 shadow-sm space-y-6" aria-labelledby="support-title">
    <h2 id="support-title" className="text-2xl font-bold">{t('support_title')}</h2>
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={async event => {
      event.preventDefault(); if (busy) return; setBusy(true); setError(''); setMessage('');
      try { await api.post('/support/', form); setMessage(t('support_sent')); setForm(previous => ({ ...previous, subject: '', message: '' })); setRevision(value => value + 1); }
      catch (error) { setError(apiErrorMessage(error, t('network_error'))); }
      finally { setBusy(false); }
    }}>
      <label className="space-y-2">{t('support_subject')}<input required maxLength={200} value={form.subject} onChange={event => setForm({ ...form, subject: event.target.value })} className="block w-full rounded-lg border p-3" /></label>
      <label className="space-y-2">{t('support_order')}<input dir="ltr" value={form.order_reference} onChange={event => setForm({ ...form, order_reference: event.target.value })} className="block w-full rounded-lg border p-3" /></label>
      <label className="sm:col-span-2"><span className="sr-only">{t('support_subject')}</span><select value={form.kind} onChange={event => setForm({ ...form, kind: event.target.value })} className="w-full rounded-lg border p-3"><option value="general">{t('support_general')}</option><option value="return">{t('support_return')}</option></select></label>
      <label className="sm:col-span-2 space-y-2">{t('support_message')}<textarea required maxLength={5000} rows={4} value={form.message} onChange={event => setForm({ ...form, message: event.target.value })} className="block w-full rounded-lg border p-3" /></label>
      <Button type="submit" disabled={busy}>{busy ? t('loading') : t('support_send')}</Button>
    </form>
    {error && <p role="alert" className="text-red-700">{error}</p>}{message && <p role="status" className="text-teal-700">{message}</p>}
    <h3 className="font-semibold">{t('support_requests')}</h3>
    {!tickets.length && <p className="text-slate-500">{t('support_empty')}</p>}
    {tickets.map(ticket => <article key={ticket.id} className="border-t pt-4 space-y-2"><div className="flex justify-between gap-4"><h4 className="font-medium">{ticket.subject}</h4><span>{t(`support_${ticket.status}`)}</span></div><p className="text-sm text-slate-500">{formatKabulDate(ticket.created_at)}</p>{ticket.response && <p className="rounded-lg bg-teal-50 p-3 whitespace-pre-wrap">{ticket.response}</p>}</article>)}
  </section>;
}
