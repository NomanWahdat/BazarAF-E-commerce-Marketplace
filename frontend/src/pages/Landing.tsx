// File: frontend/src/pages/Landing.tsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Package, ShoppingBag, Shield, Users } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Package className="w-12 h-12 text-primary" />
            <h1 className="text-4xl md:text-5xl font-semibold text-primary">{t('bazaaraf_title')}</h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('afghanistan_trusted_platform')}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {t('cash_verified_platform')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Customer Portal */}
          <Card 
            className="p-8 bg-white hover:shadow-xl transition-shadow cursor-pointer group" 
            onClick={() => navigate('/home')}
          >
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
              <ShoppingBag className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-center mb-2">{t('customer_portal')}</h3>
            <p className="text-sm text-muted-foreground text-center mb-6">
              {t('browse_products_shop_securely')}
            </p>
            <Button className="w-full" onClick={() => navigate('/home')}>
              {t('start_shopping')}
            </Button>
          </Card>

          {/* Vendor Dashboard */}
          <Card 
            className="p-8 bg-white hover:shadow-xl transition-shadow cursor-pointer group" 
            onClick={() => navigate('/vendor')}
          >
            <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-secondary/20 transition-colors">
              <Package className="w-8 h-8 text-secondary" />
            </div>
            <h3 className="text-center mb-2">{t('vendor_dashboard')}</h3>
            <p className="text-sm text-muted-foreground text-center mb-6">
              {t('manage_products_orders_earnings')}
            </p>
            <Button className="w-full bg-secondary hover:bg-secondary/90" onClick={() => navigate('/vendor')}>
              {t('vendor_login')}
            </Button>
          </Card>

          {/* Admin Panel */}
          <Card 
            className="p-8 bg-white hover:shadow-xl transition-shadow cursor-pointer group" 
            onClick={() => navigate('/admin')}
          >
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-200 transition-colors">
              <Shield className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-center mb-2">{t('admin_panel')}</h3>
            <p className="text-sm text-muted-foreground text-center mb-6">
              {t('platform_management_vendor_approval_logistics')}
            </p>
            <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={() => navigate('/admin')}>
              {t('admin_access')}
            </Button>
          </Card>
        </div>

        {/* Features */}
        <div className="mt-12 grid sm:grid-cols-3 gap-6 text-center">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2">
              <Package className="w-6 h-6 text-green-600" />
            </div>
            <div className="font-medium mb-1">{t('cash_on_delivery')}</div>
            <div className="text-sm text-muted-foreground">{t('pay_when_you_receive')}</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div className="font-medium mb-1">{t('platform_guarantee')}</div>
            <div className="text-sm text-muted-foreground">{t('secure_shopping')}</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-2">
              <Users className="w-6 h-6 text-orange-600" />
            </div>
            <div className="font-medium mb-1">{t('verified_sellers')}</div>
            <div className="text-sm text-muted-foreground">{t('trusted_vendors')}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;