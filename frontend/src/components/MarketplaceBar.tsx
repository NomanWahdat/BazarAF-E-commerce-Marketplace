import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, WifiOff } from 'lucide-react';

export function MarketplaceBar() {
  const { t, i18n } = useTranslation();
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  return <>
    <a href="#main-content" className="skip-link">{t('skip_content')}</a>
    <div className="bg-teal-950 text-teal-50 text-sm border-b border-teal-800">
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        <span>{t('marketplace_tagline')}</span>
        <label className="flex items-center gap-2">
          <Globe size={16} aria-hidden="true" />
          <span className="sr-only">{t('language_label')}</span>
          <select aria-label={t('language_label')} value={i18n.resolvedLanguage || 'en'}
            onChange={event => void i18n.changeLanguage(event.target.value)}
            className="bg-teal-950 text-white rounded px-2 py-1 border border-teal-700" dir="auto">
            <option value="fa">دری</option><option value="ps">پښتو</option><option value="en">English</option>
          </select>
        </label>
      </div>
    </div>
    {!online && <div role="status" className="flex items-center justify-center gap-2 bg-amber-50 text-amber-950 px-4 py-3 text-sm"><WifiOff size={18} />{t('offline_notice')}</div>}
  </>;
}
