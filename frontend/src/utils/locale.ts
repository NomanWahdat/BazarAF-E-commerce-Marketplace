import i18n from '../i18n';

export function formatAFN(value: number | string): string {
  const locale = i18n.resolvedLanguage === 'fa' ? 'fa-AF' : i18n.resolvedLanguage === 'ps' ? 'ps-AF' : 'en-AF';
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'AFN', maximumFractionDigits: 2 }).format(Number(value));
}

export function formatKabulDate(value: string): string {
  const locale = i18n.resolvedLanguage === 'fa' ? 'fa-AF' : i18n.resolvedLanguage === 'ps' ? 'ps-AF' : 'en-GB';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kabul' }).format(new Date(value));
}

export function normalizeAfghanPhone(value: string): string {
  let phone = value.replace(/[۰-۹٠-٩]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.includes(digit) ? '۰۱۲۳۴۵۶۷۸۹'.indexOf(digit) : '٠١٢٣٤٥٦٧٨٩'.indexOf(digit))).replace(/[\s()-]/g, '');
  if (phone.startsWith('0093')) phone = '+' + phone.slice(2);
  if (phone.startsWith('0')) phone = '+93' + phone.slice(1);
  if (/^7\d{8}$/.test(phone)) phone = '+93' + phone;
  if (/^93\d{9}$/.test(phone)) phone = '+' + phone;
  return phone;
}
