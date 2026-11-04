import React from 'react';
import { useTranslation } from 'react-i18next';
import { Package, Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin, CreditCard } from 'lucide-react';

const Footer: React.FC = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* About Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">BazaarAF</h3>
            </div>
              <p className="text-sm text-gray-400 mb-4">
              {t('footer_about_blurb')}
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-9 h-9 bg-gray-800 hover:bg-teal-600 rounded-full flex items-center justify-center transition-colors">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 bg-gray-800 hover:bg-teal-600 rounded-full flex items-center justify-center transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 bg-gray-800 hover:bg-teal-600 rounded-full flex items-center justify-center transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 bg-gray-800 hover:bg-teal-600 rounded-full flex items-center justify-center transition-colors">
                <Youtube className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">{t('footer_quick_links')}</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-teal-400 transition-colors">{t('footer_about_us')}</a></li>
              <li><a href="#" className="hover:text-teal-400 transition-colors">{t('footer_become_seller')}</a></li>
              <li><a href="#" className="hover:text-teal-400 transition-colors">{t('footer_careers')}</a></li>
              <li><a href="#" className="hover:text-teal-400 transition-colors">{t('footer_blog')}</a></li>
              <li><a href="#" className="hover:text-teal-400 transition-colors">{t('footer_press_media')}</a></li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="text-white font-semibold mb-4">{t('footer_customer_service')}</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-teal-400 transition-colors">{t('footer_help_center')}</a></li>
              <li><a href="#" className="hover:text-teal-400 transition-colors">{t('footer_track_order')}</a></li>
              <li><a href="#" className="hover:text-teal-400 transition-colors">{t('footer_returns_refunds')}</a></li>
              <li><a href="#" className="hover:text-teal-400 transition-colors">{t('footer_shipping_info')}</a></li>
              <li><a href="#" className="hover:text-teal-400 transition-colors">{t('footer_contact_us')}</a></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-white font-semibold mb-4">{t('footer_contact_us')}</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-1 text-teal-400 flex-shrink-0" />
                <span>{t('footer_location')}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-teal-400 flex-shrink-0" />
                <span>+93 700 123 456</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-teal-400 flex-shrink-0" />
                <span>support@bazaaraf.com</span>
              </li>
            </ul>
            
            {/* Payment Methods */}
            <div className="mt-6">
              <h5 className="text-white text-xs font-semibold mb-2">{t('footer_payment_methods')}</h5>
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 bg-gray-800 rounded text-xs font-medium text-teal-400 border border-gray-700">
                  COD
                </div>
                <CreditCard className="w-6 h-6 text-gray-600" />
              </div>
              <p className="text-xs text-gray-500 mt-2">{t('footer_cod_available')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-400">
              {t('footer_copyright')}
            </p>
            <div className="flex gap-6 text-sm">
              <a href="#" className="text-gray-400 hover:text-teal-400 transition-colors">{t('footer_privacy_policy')}</a>
              <a href="#" className="text-gray-400 hover:text-teal-400 transition-colors">{t('footer_terms_service')}</a>
              <a href="#" className="text-gray-400 hover:text-teal-400 transition-colors">{t('footer_cookie_policy')}</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;