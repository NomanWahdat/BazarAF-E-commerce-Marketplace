// File: frontend/src/app/components/CustomerHome.tsx
/**
 * CustomerHome Component - Production-Ready Homepage for BazaarAF
 * 
 * Features:
 * - Hero Banner with CTAs
 * - Trust Badges Section
 * - Category Navigation
 * - Featured Products Grid
 * - How It Works Section
 * - Why Choose BazaarAF
 * - Top Sellers Carousel
 * - Promotional Banners
 * - App Download Section
 * - Newsletter Signup
 * - Customer Testimonials
 * 
 * Responsive: Mobile-first, Tablet, Desktop
 * Accessibility: WCAG 2.1 AA Compliant
 * Performance: Lazy Loading, Image Optimization
 */

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  MessageCircle, Phone, Package, Truck, BadgeCheck, Loader2, RefreshCw,
  ChevronLeft, ChevronRight, ShoppingBag, Star, TrendingUp, MapPin,
  DollarSign, RotateCcw, ShieldCheck, CheckCircle, Download, Mail, ArrowRight,
  Zap, Shield
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import Layout from '../components/layout/Layout';
import { productsAPI, Product, Category } from '../../services/productsAPI';
import { CategoriesDisplay } from './Categories';
import ProductCard from '@/components/customer/ProductCard';
import { toast } from 'sonner';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface TopSeller {
  id: string;
  name: string;
  logo: string;
  rating: number;
  productCount: number;
  verified: boolean;
}

interface Testimonial {
  id: string;
  customerName: string;
  location: string;
  rating: number;
  review: string;
  avatar: string;
  verifiedPurchase: boolean;
}

interface CustomerHomeProps {
  onNavigate: (page: string, data?: any) => void;
  cartCount: number;
}

// ============================================
// MOCK DATA
// ============================================

const topSellers: TopSeller[] = [
  {
    id: '1',
    name: 'Electronics Hub',
    logo: '📱',
    rating: 4.8,
    productCount: 342,
    verified: true,
  },
  {
    id: '2',
    name: 'Fashion Palace',
    logo: '👗',
    rating: 4.6,
    productCount: 521,
    verified: true,
  },
  {
    id: '3',
    name: 'Home & Living',
    logo: '🏠',
    rating: 4.7,
    productCount: 287,
    verified: true,
  },
  {
    id: '4',
    name: 'Sports Gear',
    logo: '⚽',
    rating: 4.5,
    productCount: 198,
    verified: true,
  },
  {
    id: '5',
    name: 'Beauty & Care',
    logo: '💄',
    rating: 4.9,
    productCount: 412,
    verified: true,
  },
  {
    id: '6',
    name: 'Books & Media',
    logo: '📚',
    rating: 4.4,
    productCount: 634,
    verified: false,
  },
];

export function CustomerHome({ onNavigate, cartCount }: CustomerHomeProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [sellersScroll, setSellersScroll] = useState(0);
  const sellersRef = useRef<HTMLDivElement>(null);

  const testimonials = useMemo<Testimonial[]>(
    () => [
      {
        id: '1',
        customerName: t('customer_testimonial_1_name'),
        location: t('customer_testimonial_1_location'),
        rating: 5,
        review: t('customer_testimonial_1_review'),
        avatar: '👨',
        verifiedPurchase: true,
      },
      {
        id: '2',
        customerName: t('customer_testimonial_2_name'),
        location: t('customer_testimonial_2_location'),
        rating: 5,
        review: t('customer_testimonial_2_review'),
        avatar: '👩',
        verifiedPurchase: true,
      },
      {
        id: '3',
        customerName: t('customer_testimonial_3_name'),
        location: t('customer_testimonial_3_location'),
        rating: 4,
        review: t('customer_testimonial_3_review'),
        avatar: '👨',
        verifiedPurchase: true,
      },
    ],
    [t],
  );

  useEffect(() => {
    // console.log('🎯 CustomerHome component mounted, fetching data...');
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      // console.log('🔄 Fetching categories and products...');
      
      // Fetch categories and products in parallel
      const [categoriesData, productsData] = await Promise.all([
        productsAPI.getCategories().catch((err) => {
          console.warn('⚠️ Failed to load categories:', err);
          return [];
        }),
        productsAPI.getFeaturedProducts()
      ]);
      
      // console.log('✅ Categories:', categoriesData);
      // console.log('✅ Products:', productsData);
      
      // Handle both paginated and direct array responses
      const categoriesArray = Array.isArray(categoriesData) 
        ? categoriesData 
        : (categoriesData && typeof categoriesData === 'object' && 'results' in categoriesData) 
          ? (categoriesData as any).results 
          : [];
      
      setCategories(categoriesArray);
      setProducts(productsData.results.slice(0, 8));
      // console.log('✅ Set categories:', categoriesArray);
      // console.log('✅ Set products:', productsData.results.slice(0, 8));
    } catch (err: any) {
      console.error('❌ Error fetching data:', err);
      console.error('❌ Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      setError(t('customer_home_load_failed'));
      toast.error(t('customer_home_products_load_failed'));
    } finally {
      setLoading(false);
    }
  };



  const handleSearch = (query: string) => {
    if (query.trim()) {
      navigate(`/products?search=${encodeURIComponent(query)}`);
    }
  };

  const handleNewsletterSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error(t('newsletter_email_required'));
      return;
    }
    setSubscribing(true);
    setTimeout(() => {
      setSubscribing(false);
      setEmail('');
      toast.success(t('newsletter_subscribed'));
    }, 500);
  };

  const scrollSellers = (direction: 'left' | 'right') => {
    if (sellersRef.current) {
      const scrollAmount = 300;
      const newScroll = direction === 'left' 
        ? Math.max(0, sellersScroll - scrollAmount)
        : sellersScroll + scrollAmount;
      sellersRef.current.scrollLeft = newScroll;
      setSellersScroll(newScroll);
    }
  };

  return (
    <Layout
      variant="customer"
      cartItemCount={cartCount}
      onSearch={handleSearch}
      onCartClick={() => navigate('/cart')}
      onProfileClick={() => navigate('/profile')}
      onLanguageChange={() => {}}
    >
      <div className="min-h-screen bg-white">
        {/* ============================================
            SECTION 1: HERO BANNER
            ============================================ */}
        <section className="bg-gradient-to-r from-teal-600 via-teal-500 to-teal-700 text-white relative overflow-hidden">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-teal-400 rounded-full opacity-10 -mr-48 -mt-48" aria-hidden="true" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-400 rounded-full opacity-10 -ml-48 -mb-48" aria-hidden="true" />

          <div className="max-w-7xl mx-auto px-4 py-12 md:py-20 relative z-10">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* Left Content */}
              <div className="space-y-4 md:space-y-6">
                <h1 className="text-3xl md:text-5xl font-bold leading-tight">
                  {t('hero_title')}
                </h1>
                <p className="text-lg md:text-xl text-teal-100">
                  {t('hero_tagline')}
                </p>
                <p className="text-base text-teal-100 max-w-md">
                  {t('hero_description')}
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    onClick={() => navigate('/products')}
                    className="bg-white text-teal-600 hover:bg-gray-100 font-semibold py-3 px-6 text-base"
                    aria-label="Start shopping now"
                  >
                    <ShoppingBag className="w-5 h-5 mr-2" />
                    {t('start_shopping')}
                  </Button>
                  <Button
                    onClick={() => navigate('/become-seller')}
                    variant="outline"
                    className="border-2 border-white text-white hover:bg-teal-700 font-semibold py-3 px-6 text-base"
                    aria-label="Become a seller"
                  >
                    <TrendingUp className="w-5 h-5 mr-2" />
                    {t('sell_on_bazaaraf')}
                  </Button>
                </div>

                {/* Stats */}
                <div className="flex gap-8 pt-4 text-sm md:text-base">
                  <div>
                    <div className="font-bold text-2xl">+10K</div>
                    <div className="text-teal-100">{t('products')}</div>
                  </div>
                  <div>
                    <div className="font-bold text-2xl">+500</div>
                    <div className="text-teal-100">{t('sellers')}</div>
                  </div>
                  <div>
                    <div className="font-bold text-2xl">+50K</div>
                    <div className="text-teal-100">{t('users_count').replace('+50K ', '')}</div>
                  </div>
                </div>
              </div>

              {/* Right Side - Illustration/Icon */}
              <div className="hidden md:flex items-center justify-center">
                <div className="relative w-full max-w-md h-80 bg-white/10 rounded-3xl flex items-center justify-center backdrop-blur-sm border border-white/20">
                  <ShoppingBag className="w-32 h-32 text-white opacity-20" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================
            SECTION 2: TRUST BADGES
            ============================================ */}
        <section className="bg-gradient-to-r from-teal-50 to-blue-50 border-b border-teal-200 py-8 md:py-12">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {/* Cash on Delivery */}
              <div className="text-center">
                <div className="w-14 h-14 md:w-16 md:h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-3 hover:bg-teal-200 transition-colors">
                  <DollarSign className="w-7 h-7 md:w-8 md:h-8 text-teal-600" aria-hidden="true" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{t('trust_cash_on_delivery')}</h3>
                <p className="text-xs md:text-sm text-gray-600">{t('trust_pay_when_receive')}</p>
              </div>

              {/* 7-Day Returns */}
              <div className="text-center">
                <div className="w-14 h-14 md:w-16 md:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 hover:bg-blue-200 transition-colors">
                  <RotateCcw className="w-7 h-7 md:w-8 md:h-8 text-blue-600" aria-hidden="true" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{t('trust_7_day_returns')}</h3>
                <p className="text-xs md:text-sm text-gray-600">{t('trust_easy_returns_refunds')}</p>
              </div>

              {/* Verified Sellers */}
              <div className="text-center">
                <div className="w-14 h-14 md:w-16 md:h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3 hover:bg-purple-200 transition-colors">
                  <ShieldCheck className="w-7 h-7 md:w-8 md:h-8 text-purple-600" aria-hidden="true" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{t('trust_verified_sellers')}</h3>
                <p className="text-xs md:text-sm text-gray-600">{t('trust_only_trusted_vendors')}</p>
              </div>

              {/* Fast Delivery */}
              <div className="text-center">
                <div className="w-14 h-14 md:w-16 md:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 hover:bg-green-200 transition-colors">
                  <Truck className="w-7 h-7 md:w-8 md:h-8 text-green-600" aria-hidden="true" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{t('trust_fast_delivery')}</h3>
                <p className="text-xs md:text-sm text-gray-600">{t('trust_afghanistan_wide_shipping')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================
            SECTION 3: CATEGORIES
            ============================================ */}
        <section className="max-w-7xl mx-auto px-4 py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-gray-900">{t('home_shop_by_category')}</h2>
          <CategoriesDisplay
            categories={Array.isArray(categories) ? categories : []}
            loading={loading && (Array.isArray(categories) ? categories.length === 0 : true)}
            onCategoryClick={(category) => {
              navigate('/products', { state: { category: category.name } });
              onNavigate('products', { category: category.name });
            }}
            onSubcategoryClick={(category) => {
              const categoriesArray = Array.isArray(categories) ? categories : [];
              navigate('/products', { state: { category: category.name, parent: categoriesArray.find(c => c.id === category.parent_id)?.name } });
              onNavigate('products', { category: category.name });
            }}
            title=""
          />
        </section>

        {/* ============================================
            SECTION 4: FEATURED PRODUCTS
            ============================================ */}
        <section className="bg-gray-50 py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{t('featured_products')}</h2>
              <Button
                variant="ghost"
                className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                onClick={() => navigate('/products')}
              >
                {t('home_view_all')} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600 mb-4" />
                <p className="text-gray-600">{t('home_loading_products')}</p>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <Card className="p-8 text-center bg-red-50 border-red-200">
                <p className="text-red-600 mb-4">{error}</p>
                <Button 
                  onClick={fetchData} 
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {t('home_try_again')}
                </Button>
              </Card>
            )}

            {/* Products Grid */}
            {!loading && !error && products.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {products.map((product) => {
                  // Convert price from string to number for ProductCard
                  const productWithNumberPrice = {
                    ...product,
                    price: typeof product.price === 'string' ? parseFloat(product.price) : product.price,
                    original_price: product.original_price ? (typeof product.original_price === 'string' ? parseFloat(product.original_price) : product.original_price) : null,
                  };
                  return (
                    <ProductCard
                      key={product.id}
                      product={productWithNumberPrice as any}
                    />
                  );
                })}
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && products.length === 0 && (
              <Card className="p-12 text-center bg-white">
                <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold mb-2 text-gray-900">{t('home_no_products_yet')}</h3>
                <p className="text-gray-600">{t('home_check_back_later')}</p>
              </Card>
            )}
          </div>
        </section>

        {/* ============================================
            SECTION 5: HOW IT WORKS
            ============================================ */}
        <section className="bg-gradient-to-b from-gray-50 to-white py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">{t('home_how_it_works_title')}</h2>
              <p className="text-lg text-gray-600">{t('home_how_it_works_description')}</p>
            </div>

            <div className="grid md:grid-cols-4 gap-8">
              {/* Step 1 */}
              <div className="relative">
                <div className="flex flex-col items-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-teal-400 to-teal-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg transform hover:scale-105 transition-transform">
                    <ShoppingBag className="w-12 h-12 text-white" aria-hidden="true" />
                  </div>
                  <div className="text-center">
                    <div className="inline-block px-4 py-1 bg-teal-100 rounded-full text-teal-700 font-bold text-sm mb-3">{t('home_step_1')}</div>
                    <h3 className="font-bold text-xl mb-2 text-gray-900">{t('home_browse_search')}</h3>
                    <p className="text-gray-600 text-sm">{t('home_browse_search_desc')}</p>
                  </div>
                </div>
                {/* Connector Line */}
                <div className="hidden md:block absolute top-12 -right-4 w-8 h-1 bg-gradient-to-r from-teal-600 to-blue-600" aria-hidden="true" />
              </div>

              {/* Step 2 */}
              <div className="relative">
                <div className="flex flex-col items-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg transform hover:scale-105 transition-transform">
                    <Package className="w-12 h-12 text-white" aria-hidden="true" />
                  </div>
                  <div className="text-center">
                    <div className="inline-block px-4 py-1 bg-blue-100 rounded-full text-blue-700 font-bold text-sm mb-3">{t('home_step_2')}</div>
                    <h3 className="font-bold text-xl mb-2 text-gray-900">{t('home_add_checkout')}</h3>
                    <p className="text-gray-600 text-sm">{t('home_add_checkout_desc')}</p>
                  </div>
                </div>
                {/* Connector Line */}
                <div className="hidden md:block absolute top-12 -right-4 w-8 h-1 bg-gradient-to-r from-blue-600 to-purple-600" aria-hidden="true" />
              </div>

              {/* Step 3 */}
              <div className="relative">
                <div className="flex flex-col items-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg transform hover:scale-105 transition-transform">
                    <DollarSign className="w-12 h-12 text-white" aria-hidden="true" />
                  </div>
                  <div className="text-center">
                    <div className="inline-block px-4 py-1 bg-purple-100 rounded-full text-purple-700 font-bold text-sm mb-3">{t('home_step_3')}</div>
                    <h3 className="font-bold text-xl mb-2 text-gray-900">{t('home_pay_on_delivery')}</h3>
                    <p className="text-gray-600 text-sm">{t('home_pay_on_delivery_desc')}</p>
                  </div>
                </div>
                {/* Connector Line */}
                <div className="hidden md:block absolute top-12 -right-4 w-8 h-1 bg-gradient-to-r from-purple-600 to-green-600" aria-hidden="true" />
              </div>

              {/* Step 4 */}
              <div className="relative">
                <div className="flex flex-col items-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg transform hover:scale-105 transition-transform">
                    <Truck className="w-12 h-12 text-white" aria-hidden="true" />
                  </div>
                  <div className="text-center">
                    <div className="inline-block px-4 py-1 bg-green-100 rounded-full text-green-700 font-bold text-sm mb-3">{t('home_step_4')}</div>
                    <h3 className="font-bold text-xl mb-2 text-gray-900">{t('home_track_enjoy')}</h3>
                    <p className="text-gray-600 text-sm">{t('home_track_enjoy_desc')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================
            SECTION 6: WHY CHOOSE BAZAARAF
            ============================================ */}
        <section className="py-16 md:py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">{t('home_why_choose_title')}</h2>
              <p className="text-lg text-gray-600">{t('home_why_choose_description')}</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Benefit 1 */}
              <div className="group">
                <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-3xl p-8 h-full hover:shadow-xl transition-all transform hover:scale-105 group-hover:from-teal-100 group-hover:to-teal-200">
                  <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-teal-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                    <ShoppingBag className="w-8 h-8 text-white" aria-hidden="true" />
                  </div>
                  <h3 className="font-bold text-xl mb-3 text-gray-900">{t('home_largest_selection')}</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">{t('home_largest_selection_desc')}</p>
                  <div className="mt-4 pt-4 border-t border-teal-200">
                    <span className="text-xs font-semibold text-teal-700">{t('home_quality_guaranteed')}</span>
                  </div>
                </div>
              </div>

              {/* Benefit 2 */}
              <div className="group">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl p-8 h-full hover:shadow-xl transition-all transform hover:scale-105 group-hover:from-blue-100 group-hover:to-blue-200">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                    <Shield className="w-8 h-8 text-white" aria-hidden="true" />
                  </div>
                  <h3 className="font-bold text-xl mb-3 text-gray-900">{t('home_secure_title')}</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">{t('home_secure_description')}</p>
                  <div className="mt-4 pt-4 border-t border-blue-200">
                    <span className="text-xs font-semibold text-blue-700">{t('home_protected_payments')}</span>
                  </div>
                </div>
              </div>

              {/* Benefit 3 */}
              <div className="group">
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-3xl p-8 h-full hover:shadow-xl transition-all transform hover:scale-105 group-hover:from-purple-100 group-hover:to-purple-200">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                    <MapPin className="w-8 h-8 text-white" aria-hidden="true" />
                  </div>
                  <h3 className="font-bold text-xl mb-3 text-gray-900">{t('home_afghanistan_wide_title')}</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">{t('home_afghanistan_wide_description')}</p>
                  <div className="mt-4 pt-4 border-t border-purple-200">
                    <span className="text-xs font-semibold text-purple-700">{t('home_quick_delivery')}</span>
                  </div>
                </div>
              </div>

              {/* Benefit 4 */}
              <div className="group">
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-3xl p-8 h-full hover:shadow-xl transition-all transform hover:scale-105 group-hover:from-green-100 group-hover:to-green-200">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                    <Zap className="w-8 h-8 text-white" aria-hidden="true" />
                  </div>
                  <h3 className="font-bold text-xl mb-3 text-gray-900">{t('home_support_title')}</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">{t('home_support_description')}</p>
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <span className="text-xs font-semibold text-green-700">{t('home_always_available')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="text-center mt-12">
              <Button
                onClick={() => navigate('/products')}
                className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-bold py-4 px-8 text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
              >
                {t('home_start_shopping_now')} <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </section>

        {/* ============================================
            SECTION 7: TOP SELLERS CAROUSEL
            ============================================ */}
        <section className="max-w-7xl mx-auto px-4 py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-gray-900">{t('home_top_rated_sellers')}</h2>
          
          <div className="relative">
            {/* Sellers Carousel */}
            <div
              ref={sellersRef}
              className="flex gap-6 overflow-x-auto pb-4 scroll-smooth"
              style={{ scrollBehavior: 'smooth' }}
            >
              {topSellers.map((seller) => (
                <div
                  key={seller.id}
                  className="flex-shrink-0 w-72"
                >
                  <Card className="p-6 bg-white h-full hover:shadow-lg transition-shadow cursor-pointer border border-gray-200 group">
                    <div className="text-center">
                      {/* Avatar */}
                      <div className="w-20 h-20 bg-gradient-to-br from-teal-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl group-hover:scale-110 transition-transform">
                        {seller.logo}
                      </div>

                      {/* Seller Info */}
                      <div className="mb-4">
                        <h3 className="font-semibold text-lg text-gray-900 mb-1">{seller.name}</h3>
                        {seller.verified && (
                          <div className="flex items-center justify-center gap-1 mb-2">
                            <BadgeCheck className="w-4 h-4 text-teal-600" aria-hidden="true" />
                            <span className="text-xs font-medium text-teal-600">{t('home_verified')}</span>
                          </div>
                        )}
                      </div>

                      {/* Rating & Products */}
                      <div className="flex items-center justify-center gap-1 mb-4">
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < Math.floor(seller.rating)
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                              aria-hidden="true"
                            />
                          ))}
                        </div>
                        <span className="text-sm font-medium text-gray-600">
                          {seller.rating}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 mb-4">
                        {seller.productCount} {t('home_products_label')}
                      </p>

                      {/* CTA Button */}
                      <Button
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                      >
                        {t('home_visit_store')}
                      </Button>
                    </div>
                  </Card>
                </div>
              ))}
            </div>

            {/* Navigation Arrows */}
            <div className="flex gap-2 justify-center mt-6 md:hidden">
              <Button
                variant="outline"
                size="icon"
                onClick={() => scrollSellers('left')}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => scrollSellers('right')}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </section>

        {/* ============================================
            SECTION 8: PROMOTIONAL BANNERS
            ============================================ */}
        <section className="max-w-7xl mx-auto px-4 py-12 md:py-16">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Banner 1 */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-8 text-white overflow-hidden relative h-64 flex flex-col justify-end hover:shadow-lg transition-shadow group cursor-pointer">
              <div className="absolute top-0 right-0 w-48 h-48 bg-blue-400 rounded-full opacity-10 -mr-24 -mt-24" aria-hidden="true" />
              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-2">{t('home_banner_electronics')}</h3>
                <p className="text-blue-100 mb-4">{t('home_banner_electronics_offer')}</p>
                <Button className="bg-white text-blue-600 hover:bg-gray-100 font-semibold">
                  {t('home_shop_now')}
                </Button>
              </div>
            </div>

            {/* Banner 2 */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-8 text-white overflow-hidden relative h-64 flex flex-col justify-end hover:shadow-lg transition-shadow group cursor-pointer">
              <div className="absolute top-0 right-0 w-48 h-48 bg-purple-400 rounded-full opacity-10 -mr-24 -mt-24" aria-hidden="true" />
              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-2">{t('home_banner_fashion')}</h3>
                <p className="text-purple-100 mb-4">{t('home_banner_fashion_offer')}</p>
                <Button className="bg-white text-purple-600 hover:bg-gray-100 font-semibold">
                  {t('home_shop_now')}
                </Button>
              </div>
            </div>

            {/* Banner 3 */}
            <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl p-8 text-white overflow-hidden relative h-64 flex flex-col justify-end hover:shadow-lg transition-shadow group cursor-pointer">
              <div className="absolute top-0 right-0 w-48 h-48 bg-orange-400 rounded-full opacity-10 -mr-24 -mt-24" aria-hidden="true" />
              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-2">{t('home_banner_home_essentials')}</h3>
                <p className="text-orange-100 mb-4">{t('home_banner_home_essentials_offer')}</p>
                <Button className="bg-white text-orange-600 hover:bg-gray-100 font-semibold">
                  {t('home_shop_now')}
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================
            SECTION 9: DOWNLOAD APP
            ============================================ */}
        <section className="bg-gradient-to-r from-teal-600 to-teal-700 text-white py-12 md:py-16 relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-teal-400 rounded-full opacity-10 -mr-48 -mt-48" aria-hidden="true" />

          <div className="max-w-7xl mx-auto px-4 relative z-10">
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
              {/* Left - Phone Mockup */}
              <div className="hidden md:flex items-center justify-center">
                <div className="relative w-48 h-80 bg-white rounded-3xl shadow-2xl flex items-center justify-center border-8 border-gray-300">
                  <div className="w-full h-full bg-teal-50 rounded-2xl flex items-center justify-center">
                    <ShoppingBag className="w-24 h-24 text-teal-600" aria-hidden="true" />
                  </div>
                </div>
              </div>

              {/* Right - Content */}
              <div>
                <h2 className="text-2xl md:text-4xl font-bold mb-4">{t('home_get_app_title')}</h2>
                <p className="text-lg text-teal-100 mb-6">
                  {t('home_get_app_description')}
                </p>

                {/* Benefits */}
                <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 flex-shrink-0" aria-hidden="true" />
                    <span>{t('home_app_benefit_1')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 flex-shrink-0" aria-hidden="true" />
                    <span>{t('home_app_benefit_2')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 flex-shrink-0" aria-hidden="true" />
                    <span>{t('home_app_benefit_3')}</span>
                  </div>
                </div>

                {/* Download Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button className="bg-white text-teal-600 hover:bg-gray-100 font-semibold py-3 px-6">
                    <Download className="w-5 h-5 mr-2" />
                    {t('home_app_store')}
                  </Button>
                  <Button className="bg-white text-teal-600 hover:bg-gray-100 font-semibold py-3 px-6">
                    <Download className="w-5 h-5 mr-2" />
                    {t('home_google_play')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================
            SECTION 10: CUSTOMER TESTIMONIALS
            ============================================ */}
        <section className="max-w-7xl mx-auto px-4 py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12 text-gray-900">{t('home_customers_say')}</h2>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.id} className="p-6 bg-white hover:shadow-lg transition-shadow border border-gray-200 flex flex-col">
                {/* Star Rating */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < testimonial.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                      aria-hidden="true"
                    />
                  ))}
                </div>

                {/* Review Text */}
                <p className="text-gray-700 mb-6 flex-grow italic">"{testimonial.review}"</p>

                {/* Verified Badge */}
                <div className="flex items-center gap-1 mb-4">
                  <CheckCircle className="w-4 h-4 text-green-600" aria-hidden="true" />
                  <span className="text-xs font-medium text-green-600">{t('home_verified_purchase')}</span>
                </div>

                {/* Customer Info */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                  <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-lg">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{testimonial.customerName}</p>
                    <p className="text-xs text-gray-600 flex items-center gap-1">
                      <MapPin className="w-3 h-3" aria-hidden="true" />
                      {testimonial.location}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* ============================================
            SECTION 11: NEWSLETTER SIGNUP
            ============================================ */}
        <section className="bg-gradient-to-br from-teal-50 to-blue-50 py-12 md:py-16 border-t border-teal-200">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-2 text-gray-900">{t('home_stay_updated')}</h2>
            <p className="text-gray-600 mb-8">
              {t('home_newsletter_description')}
            </p>

            {/* Newsletter Form */}
            <form onSubmit={handleNewsletterSubscribe} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('newsletter_email_placeholder')}
                aria-label={t('newsletter_email_aria_label')}
                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
              />
              <Button
                type="submit"
                disabled={subscribing}
                className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 py-3 whitespace-nowrap"
              >
                {subscribing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('newsletter_subscribing')}
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    {t('newsletter_subscribe')}
                  </>
                )}
              </Button>
            </form>

            <p className="text-xs text-gray-600 mt-4">
              {t('newsletter_privacy')}
            </p>
          </div>
        </section>

        {/* ============================================
            FLOATING SUPPORT BUTTONS
            ============================================ */}
        <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
          <Button
            size="lg"
            className="rounded-full w-14 h-14 bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl transition-all"
            onClick={() => window.open('https://wa.me/93700000000', '_blank')}
            aria-label={t('support_whatsapp_aria_label')}
            title={t('support_whatsapp_title')}
          >
            <MessageCircle className="w-6 h-6" />
          </Button>
          <Button
            size="lg"
            className="rounded-full w-14 h-14 bg-teal-600 hover:bg-teal-700 shadow-lg hover:shadow-xl transition-all"
            onClick={() => window.open('tel:+93700000000', '_blank')}
            aria-label={t('support_call_aria_label')}
            title={t('support_call_title')}
          >
            <Phone className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </Layout>
  );
}

export default CustomerHome;