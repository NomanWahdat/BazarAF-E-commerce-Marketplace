import api, { apiErrorMessage } from '../services/api';
import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../app/components/layout/Layout';
import ProductCard from '@/components/customer/ProductCard';
import { categoryAPI } from '@/services/categoryApi';
import { Product, Category } from '@/types/category';
import { Button } from '@/app/components/ui/button';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Store,
  AlertCircle,
  Grid,
  List,
  Star,
  Truck,
  Shield,
  RefreshCw,
  Mail,
  MapPin,
  Phone,
  Clock,
  CheckCircle,
  Zap,
} from 'lucide-react';
import { getAbsoluteImageUrl } from '@/utils/imageUtils';
import { toast } from 'sonner';

interface StoreInfo {
  id: string;
  shop_name: string;
  description: string;
  logo?: string;
  banner?: string;
  favicon?: string;
  primary_color?: string;
  featured_products?: string[];
  vendor_id: string;
  created_at: string;
  totalProducts?: number;
  totalSales?: number;
  rating?: number;
  followers?: number;
  responseTime?: string;
}

interface StoreReview {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  date: string;
  helpful: number;
}

interface FilterState {
  priceMin: number;
  priceMax: number;
  categories: string[];
  rating: number;
}

/**
 * StoreFront Page
 * Public storefront for a specific vendor/seller
 * Displays all approved products from the store
 */
const StoreFront: React.FC = () => {
  const { storeName } = useParams<{ storeName: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const toSafeNumber = (value: number | string | undefined | null): number => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  const toValidHexColor = (value?: string): string => {
    const candidate = String(value || '').trim();
    return /^#[0-9A-Fa-f]{6}$/.test(candidate) ? candidate : '#059669';
  };

  const hexToRgba = (hex: string, alpha: number): string => {
    const normalized = toValidHexColor(hex);
    const r = parseInt(normalized.slice(1, 3), 16);
    const g = parseInt(normalized.slice(3, 5), 16);
    const b = parseInt(normalized.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // State
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('-created_at');
  const [cartItemCount, setCartItemCount] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [comparisonItems, setComparisonItems] = useState<Product[]>([]);
  
  // Filters
  const [filters, setFilters] = useState<FilterState>({
    priceMin: 0,
    priceMax: 10000,
    categories: [],
    rating: 0,
  });

  const itemsPerPage = 12;

  // Apply filters and sorting
  const filteredProducts = useMemo(() => {
    let result = [...allProducts];

    // Search filter
    if (searchQuery) {
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Price filter
    result = result.filter(
      (p) =>
        toSafeNumber(p.price) >= filters.priceMin &&
        toSafeNumber(p.price) <= filters.priceMax
    );

    // Category filter
    if (filters.categories.length > 0) {
      result = result.filter((p) =>
        filters.categories.includes(p.category_name || '')
      );
    }

    // Rating filter
    if (filters.rating > 0) {
      result = result.filter((p) => (p.average_rating || 0) >= filters.rating);
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return toSafeNumber(a.price) - toSafeNumber(b.price);
        case '-price':
          return toSafeNumber(b.price) - toSafeNumber(a.price);
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'rating':
          return (b.average_rating || 0) - (a.average_rating || 0);
        case '-created_at':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return result;
  }, [allProducts, searchQuery, filters, sortBy]);

  const totalCount = filteredProducts.length;
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const primaryColor = useMemo(() => toValidHexColor(storeInfo?.primary_color), [storeInfo?.primary_color]);
  const primarySoftBg = useMemo(() => hexToRgba(primaryColor, 0.1), [primaryColor]);

  const featuredProducts = useMemo(() => {
    const configuredIds = (storeInfo?.featured_products || []).map((id) => String(id));
    if (!configuredIds.length) return [];

    const productMap = new Map(allProducts.map((product) => [String(product.id), product]));
    return configuredIds
      .map((id) => productMap.get(id))
      .filter((item): item is Product => Boolean(item));
  }, [allProducts, storeInfo?.featured_products]);

  const [storeReviews, setStoreReviews] = useState<StoreReview[]>([]);

  // Load cart count
  useEffect(() => {
    const updateCartCount = () => {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        try {
          const cart = JSON.parse(savedCart);
          const count = cart.reduce((sum: number, item: any) => sum + item.quantity, 0);
          setCartItemCount(count);
        } catch (error) {
          console.error('Error reading cart:', error);
        }
      }
    };

    updateCartCount();
    window.addEventListener('cartUpdated', updateCartCount);
    return () => window.removeEventListener('cartUpdated', updateCartCount);
  }, []);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categoryAPI.getCategoryTree();
        setCategories(response || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // Fetch store info and products
  useEffect(() => {
    const fetchStoreData = async () => {
      try {
        setLoading(true);
        setError(null);

        const decodedStoreName = storeName
          ? decodeURIComponent(storeName)
              .replace(/-/g, ' ')
              .replace(/\b\w/g, (char) => char.toUpperCase())
          : '';

        const { data: response } = await api.get(`/stores/${encodeURIComponent(storeName || '')}/`);
        if (response?.results) {
          const scopedProducts: Product[] = [...response.results];
          // Fetch only this seller's pages, preserving the existing client-side filters.
          let page = 2;
          let next = response.next;
          while (next) {
            const { data } = await api.get(`/stores/${encodeURIComponent(storeName || '')}/`, { params: { page } });
            scopedProducts.push(...data.results);
            next = data.next;
            page += 1;
          }
          setStoreReviews(response.reviews || []);
          setAllProducts(scopedProducts);

          const avgRating = scopedProducts.length
            ? Number(
                (
                  scopedProducts.reduce((sum, p) => sum + (p.average_rating || 0), 0) /
                  scopedProducts.length
                ).toFixed(1)
              )
            : 0;

          const totalSales = scopedProducts.reduce((sum, product) => {
            return sum + (product.sales_count || 0);
          }, 0);

          const totalReviews = scopedProducts.reduce(
            (sum, p) => sum + (p.review_count || 0),
            0
          );

          // Set store info from first product's vendor data
          if (scopedProducts.length > 0 && scopedProducts[0].vendor) {
            const vendorData: any = response.vendor;
            setStoreInfo({
              id: scopedProducts[0].vendor.id || 'unknown',
              shop_name: scopedProducts[0].vendor.shop_name || decodedStoreName || 'Vendor Store',
              description: `Welcome to our store! We offer quality products sourced from trusted vendors.`,
              logo: vendorData.logo || undefined,
              banner: vendorData.banner || undefined,
              favicon: vendorData.favicon || undefined,
              primary_color: vendorData.primary_color || '#059669',
              featured_products: Array.isArray(vendorData.featured_products)
                ? vendorData.featured_products.map((id: any) => String(id))
                : [],
              vendor_id: scopedProducts[0].vendor.id || 'unknown',
              created_at: new Date().toISOString(),
              totalProducts: scopedProducts.length,
              totalSales,
              rating: avgRating,
              followers: totalReviews,
              responseTime: '?',
            });
          } else {
            setStoreInfo({
              id: 'unknown',
              shop_name: decodedStoreName || 'Store',
              description: 'Explore our collection of quality products',
              primary_color: '#059669',
              featured_products: [],
              vendor_id: 'unknown',
              created_at: new Date().toISOString(),
              totalProducts: scopedProducts.length,
              totalSales,
              rating: 0,
              followers: totalReviews,
              responseTime: '?',
            });
          }

          if (scopedProducts.length === 0) {
            setError('This store has no published products yet.');
          }
        } else {
          setError('Store not found or has no products');
        }
      } catch (err) {
        console.error('Error fetching store data:', err);
        setError('Failed to load store. Please try again.');
        toast.error('Failed to load store');
      } finally {
        setLoading(false);
      }
    };

    fetchStoreData();
  }, [storeName]);

  useEffect(() => {
    if (!storeInfo?.favicon) return;

    const faviconElement = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
    if (!faviconElement) return;

    const previousHref = faviconElement.href;
    faviconElement.href = storeInfo.favicon;

    return () => {
      faviconElement.href = previousHref;
    };
  }, [storeInfo?.favicon]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  };

  const handleAddToComparison = (product: Product) => {
    if (comparisonItems.find((p) => p.id === product.id)) {
      setComparisonItems((prev) => prev.filter((p) => p.id !== product.id));
      toast.success('Removed from comparison');
    } else {
      if (comparisonItems.length < 4) {
        setComparisonItems((prev) => [...prev, product]);
        toast.success('Added to comparison');
      } else {
        toast.error('Maximum 4 items can be compared');
      }
    }
  };

  const handleNewsletterSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) {
      toast.error('Please enter an email address');
      return;
    }
    if (!newsletterEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    try {
      await api.post('/newsletter/', { email: newsletterEmail, vendor_id: storeInfo?.vendor_id });
      setNewsletterEmail('');
      toast.success(t('newsletter_saved'));
    } catch (error) { toast.error(apiErrorMessage(error, t('network_error'))); }
  };

  if (loading) {
    return (
      <Layout variant="customer" cartItemCount={cartItemCount}>
        <div className="min-h-screen bg-gray-50 py-12">
          <div className="max-w-7xl mx-auto px-4">
            <div className="animate-pulse space-y-8">
              <div className="h-40 bg-gray-300 rounded-lg" />
              <div className="grid md:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-gray-300 h-64 rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout variant="customer" cartItemCount={cartItemCount}>
      <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-gray-100">
        {/* BREADCRUMB NAVIGATION */}
        <div className="max-w-7xl mx-auto px-4 pt-4 pb-2">
          <div className="flex items-center gap-2 text-sm">
            <button onClick={() => navigate('/')} className="text-gray-600 transition-colors" style={{ color: '#4b5563' }}>Home</button>
            <span className="text-gray-400">/</span>
            <button onClick={() => navigate('/products')} className="text-gray-600 transition-colors" style={{ color: '#4b5563' }}>Products</button>
            <span className="text-gray-400">/</span>
            <span className="font-semibold" style={{ color: primaryColor }}>{storeInfo?.shop_name}</span>
          </div>
        </div>

        {/* HERO BANNER - Ultra Premium Store Header */}
        <div
          className="relative h-64 md:h-96 overflow-hidden group"
          style={{
            backgroundImage: `linear-gradient(135deg, ${hexToRgba(primaryColor, 0.18)} 0%, ${hexToRgba(primaryColor, 0.9)} 50%, ${hexToRgba(primaryColor, 1)} 100%)`,
          }}
        >
          {/* Multiple animated gradient layers */}
          <div className="absolute inset-0 opacity-40"
            style={{
              backgroundImage: storeInfo?.banner
                ? `url(${storeInfo.banner})`
                : 'radial-gradient(circle at 20% 50%, teal 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgb(13, 148, 136) 0%, transparent 50%)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'brightness(0.95)'
            }}
          />
          
          {/* Decorative elements */}
          <div className="absolute -top-64 -right-64 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-64 h-64 rounded-full blur-2xl" style={{ backgroundColor: hexToRgba(primaryColor, 0.16) }} />
          <div className="absolute top-1/2 right-1/4 w-48 h-48 bg-white/3 rounded-full blur-3xl" />
          
          <div className="relative max-w-7xl mx-auto px-4 h-full flex items-center">
            <div className="flex items-center gap-6 md:gap-10 w-full">
              {/* Store Logo - Elevated Design */}
              <div className="flex-shrink-0 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-300/30 to-transparent rounded-3xl blur-2xl" />
                <div className="relative w-32 h-32 md:w-40 md:h-40 bg-white rounded-3xl shadow-2xl flex items-center justify-center backdrop-blur-sm transform group-hover:scale-105 transition-transform duration-300">
                  {storeInfo?.logo ? (
                    <img
                      src={storeInfo.logo}
                      alt={`${storeInfo.shop_name} logo`}
                      className="w-24 h-24 md:w-28 md:h-28 object-cover rounded-2xl"
                    />
                  ) : (
                    <Store className="w-16 h-16 md:w-20 md:h-20" style={{ color: primaryColor }} />
                  )}
                </div>
              </div>
              
              {/* Store Info */}
              <div className="flex-1 min-w-0">
                {/* Store Name & Description */}
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white mb-3 leading-tight drop-shadow-lg">
                  {storeInfo?.shop_name}
                </h1>
                <p className="text-teal-100 text-base md:text-lg mb-4 drop-shadow-md max-w-2xl">
                  {storeInfo?.description}
                </p>
                {/* Trust Indicators */}
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5 text-white text-sm font-semibold">
                    <CheckCircle className="w-5 h-5 text-green-300" />
                    Verified Store
                  </div>
                  <div className="flex items-center gap-1.5 text-white text-sm font-semibold">
                    <Star className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                    {storeInfo?.rating}/5 Rating
                  </div>
                  <div className="flex items-center gap-1.5 text-white text-sm font-semibold">
                    <Truck className="w-5 h-5 text-blue-200" />
                    Cash on Delivery
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FEATURED PRODUCTS - Premium Section */}
        {featuredProducts.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 py-16">
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-1 h-8 rounded-full" style={{ backgroundImage: `linear-gradient(to bottom, ${primaryColor}, ${hexToRgba(primaryColor, 0.55)})` }} />
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Featured Collection</h2>
              </div>
              <p className="text-gray-600 text-lg ml-4">Hand-picked bestsellers from our store</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <div key={product.id} className="group relative">
                  <div className="absolute -top-3 -right-3 z-10">
                    <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg">
                      ⭐ Featured
                    </div>
                  </div>
                  <div className="transform transition-transform duration-300 group-hover:-translate-y-1">
                    <ProductCard product={product} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PRODUCTS SECTION - Premium Layout */}
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* CATEGORY TABS - Modern Simple Navigation */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-6">Browse by Category</h3>
                  
                  <div className="space-y-2" role="tablist" aria-label="Product categories">
                    {/* All Products Tab */}
                    <button
                      onClick={() => handleFilterChange({ categories: [] })}
                      className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 duration-200 ${filters.categories.length === 0 ? 'text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      style={filters.categories.length === 0 ? { backgroundColor: primaryColor } : undefined}
                      role="tab"
                      aria-selected={filters.categories.length === 0}
                    >
                      All Products
                    </button>

                    {/* Category Tabs */}
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => handleFilterChange({ categories: [cat.name] })}
                        className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 duration-200 ${filters.categories.includes(cat.name) ? 'text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        style={filters.categories.includes(cat.name) ? { backgroundColor: primaryColor } : undefined}
                        role="tab"
                        aria-selected={filters.categories.includes(cat.name)}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>

                  {/* Clear Button */}
                  {filters.categories.length > 0 && (
                    <button
                      onClick={() => {
                        setFilters({ priceMin: 0, priceMax: 10000, categories: [], rating: 0 });
                        setSearchQuery('');
                        setSortBy('-created_at');
                      }}
                      className="w-full mt-6 px-4 py-3 border-2 rounded-2xl font-bold transition-all"
                      style={{ borderColor: hexToRgba(primaryColor, 0.5), color: primaryColor, backgroundColor: hexToRgba(primaryColor, 0.06) }}
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* PRODUCTS AREA - Premium Layout */}
            <div className="lg:col-span-3">
              {error && (
                <Alert variant="destructive" className="mb-6 border-l-4 border-red-600 bg-red-50 rounded-xl">
                  <AlertCircle className="h-5 w-5" />
                  <AlertDescription className="ml-2">{error}</AlertDescription>
                </Alert>
              )}

              {/* Search Bar & Controls - Premium Design */}
              <div className="mb-8 space-y-5">
                {/* Search Bar */}
                <form onSubmit={handleSearch} className="flex gap-3">
                  <div className="flex-1 relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-teal-600 transition-colors" />
                    <input
                      type="text"
                      placeholder="Search products in this store..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-11 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 bg-white shadow-sm hover:shadow-md transition-all"
                    />
                  </div>
                  <Button type="submit" className="rounded-2xl px-6 shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95 text-white" style={{ backgroundColor: primaryColor }}>
                    <Search className="w-5 h-5" />
                  </Button>
                </form>

                {/* Sort & View Controls */}
                <div className="flex items-center justify-between gap-4 flex-wrap bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-700">
                      {totalCount} Product{totalCount !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-lg" style={{ backgroundColor: primarySoftBg, color: primaryColor }}>{totalCount > 0 ? 'Found' : 'No results'}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* View Mode Toggle */}
                    <div className="inline-flex gap-1 bg-gray-100 p-1 rounded-lg">
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                        style={viewMode === 'grid' ? { color: primaryColor } : undefined}
                        title="Grid view"
                      >
                        <Grid className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded transition-all ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                        style={viewMode === 'list' ? { color: primaryColor } : undefined}
                        title="List view"
                      >
                        <List className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Sort Dropdown */}
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="px-4 py-2 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 text-sm font-semibold text-gray-700 bg-white shadow-sm hover:shadow-md transition-all cursor-pointer"
                    >
                      <option value="-created_at">Newest First</option>
                      <option value="price">Price: Low to High</option>
                      <option value="-price">Price: High to Low</option>
                      <option value="name">Name: A to Z</option>
                      <option value="rating">Best Rating</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Comparison Bar */}
              {comparisonItems.length > 0 && (
                <div className="p-5 mb-8 rounded-xl border-l-4 shadow-sm" style={{ backgroundColor: hexToRgba(primaryColor, 0.08), borderLeftColor: primaryColor }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-900 text-sm">
                        {comparisonItems.length} Item{comparisonItems.length !== 1 ? 's' : ''} Selected
                      </p>
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {comparisonItems.map((item) => (
                          <span key={item.id} className="px-3 py-1 bg-white rounded-full text-xs font-medium text-gray-700 border border-teal-200">
                            {item.name}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Button className="rounded-2xl text-base shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95 text-white" style={{ backgroundColor: primaryColor }}>
                      🔗 Compare
                    </Button>
                  </div>
                </div>
              )}

              {/* Products Grid/List - Premium Layout */}
              {paginatedProducts.length > 0 ? (
                <>
                  <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12' : 'space-y-4 mb-12'}>
                    {paginatedProducts.map((product) => (
                      <div key={product.id} className="group">
                        {viewMode === 'grid' ? (
                          <div className="relative h-full">
                            <div className="transform transition-all duration-300 group-hover:-translate-y-2 h-full">
                              <ProductCard product={product} />
                            </div>
                            <button
                              onClick={() => handleAddToComparison(product)}
                              className="absolute bottom-6 right-4 bg-white hover:bg-teal-600 hover:text-white text-teal-600 p-3 rounded-full shadow-lg transition-all duration-300 transform opacity-0 group-hover:opacity-100 hover:scale-110"
                              title="Add to comparison"
                            >
                              <Zap className="w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                          <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
                            <div className="flex gap-4 p-5">
                              <img
                                src={getAbsoluteImageUrl(product.primary_image || '/placeholder.svg')}
                                alt={product.name}
                                className="w-28 h-28 object-cover rounded-lg flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 line-clamp-1 mb-1">{product.name}</h4>
                                <p className="text-sm text-gray-600 line-clamp-1 mb-3">{product.description}</p>
                                <div className="flex items-end justify-between">
                                  <div>
                                    <div className="text-lg font-bold" style={{ color: primaryColor }}>AFN {toSafeNumber(product.price).toLocaleString()}</div>
                                    {product.original_price && <div className="text-xs text-gray-500 line-through">AFN {toSafeNumber(product.original_price).toLocaleString()}</div>}
                                  </div>
                                  <Button className="text-white text-sm rounded-2xl shadow-md hover:shadow-lg transition-all transform hover:scale-105 active:scale-95" style={{ backgroundColor: primaryColor }} onClick={() => navigate(`/product/${product.slug || product.id}`)}>
                                    View Details
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Premium Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 mb-12 flex-wrap">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="rounded-2xl border-2 border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95"
                      >
                        <ChevronLeft className="w-5 h-5" />
                        Previous
                      </Button>

                      <div className="flex items-center gap-2">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let page = i + 1;
                          if (totalPages > 5 && currentPage > 3) page = currentPage - 2 + i;
                          if (page > totalPages) return null;
                          return (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`px-4 py-2 rounded-lg font-medium transition-all ${page === currentPage ? 'text-white shadow-lg' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
                              style={page === currentPage ? { backgroundColor: primaryColor } : undefined}
                            >
                              {page}
                            </button>
                          );
                        })}
                        {totalPages > 5 && <span className="px-2 text-gray-500">•••</span>}
                      </div>

                      <Button variant="outline" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="rounded-2xl border-2 border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95">
                        Next
                        <ChevronRight className="w-5 h-5" />
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 md:p-16 text-center">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Store className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No products found</h3>
                  <p className="text-gray-600 mb-8">Try adjusting your search or filters</p>
                  <Button
                    onClick={() => {
                      setFilters({ priceMin: 0, priceMax: 10000, categories: [], rating: 0 });
                      setSearchQuery('');
                    }}
                    className="text-white rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95"
                    style={{ backgroundColor: primaryColor }}
                  >
                    ✨ Reset Filters
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CUSTOMER REVIEWS - Premium Section */}
        <div className="bg-white py-16 border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4">
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-1 h-8 bg-gradient-to-b from-teal-600 to-teal-400 rounded-full" />
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Customer Reviews</h2>
              </div>
              <p className="text-gray-600 text-lg ml-4">What customers are saying about us</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {storeReviews.map((review) => (
                <div key={review.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 p-6 md:p-8">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {review.customerName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{review.customerName}</p>
                      <div className="flex gap-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed mb-4">{review.comment}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <span className="text-xs text-gray-500 font-medium">{new Date(review.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    <button className="text-xs font-semibold transition-colors" style={{ color: primaryColor }}>👍 Helpful ({review.helpful})</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* WHY SHOP HERE - Premium Features */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 py-16 border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4">
            <div className="mb-12 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Why Shop With Us?</h2>
              <p className="text-gray-600 text-lg">Shop with clear information</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: Truck, color: 'teal', title: 'Fast Shipping', desc: 'Quick & reliable delivery', badge: '⚡' },
                { icon: Shield, color: 'green', title: 'Secure Payments', desc: 'Protected transactions', badge: '🔒' },
                { icon: RefreshCw, color: 'purple', title: 'Easy Returns', desc: 'Hassle-free returns', badge: '↩️' },
                { icon: Zap, color: 'orange', title: 'Customer Support', desc: 'Send and track a support request', badge: '💬' }
              ].map((feature, idx) => {
                const Icon = feature.icon;
                const colorMap: Record<string, string> = {
                  teal: 'bg-teal-100 text-teal-600',
                  green: 'bg-green-100 text-green-600',
                  purple: 'bg-purple-100 text-purple-600',
                  orange: 'bg-orange-100 text-orange-600'
                };
                return (
                  <div key={idx} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 p-8 text-center group">
                    <div className={`w-16 h-16 rounded-2xl ${colorMap[feature.color]} mx-auto mb-5 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform`}>
                      <Icon className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                    <p className="text-gray-600 text-sm">{feature.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* NEWSLETTER - Premium CTA */}
        <div className="py-16 md:py-20" style={{ backgroundImage: `linear-gradient(to right, ${primaryColor}, ${hexToRgba(primaryColor, 0.88)})` }}>
          <div className="max-w-3xl mx-auto px-4 text-center">
            <div className="mb-6 inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
              <Mail className="w-5 h-5 text-white inline mr-2" />
              <span className="text-white text-sm font-semibold">Exclusive Offers</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Stay in the Loop</h2>
            <p className="text-white/85 text-lg mb-8 max-w-xl mx-auto">Get updates on new products, special discounts, and exclusive deals delivered to your inbox</p>
            <form onSubmit={handleNewsletterSignup} className="flex gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                className="flex-1 px-4 py-4 rounded-2xl focus:outline-none shadow-lg transition-all border-2 border-transparent hover:border-white"
              />
              <Button type="submit" className="bg-white hover:bg-gray-100 font-bold rounded-2xl px-8 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all" style={{ color: primaryColor }}>
                Subscribe Now
              </Button>
            </form>
            <p className="text-white/85 text-xs mt-4">No spam. Unsubscribe anytime.</p>
          </div>
        </div>

        {/* STORE INFO FOOTER - Premium Design */}
        <div className="bg-white border-t border-gray-100 py-12">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 md:gap-12">
              <div className="group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-teal-100 rounded-xl group-hover:scale-110 transition-transform">
                    <MapPin className="w-5 h-5" style={{ color: primaryColor }} />
                  </div>
                  <h4 className="font-bold text-gray-900">Location</h4>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {storeInfo?.shop_name} Store<br />
                  <span className="text-xs text-gray-500">Afghanistan</span>
                </p>
              </div>
              <div className="group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-teal-100 rounded-xl group-hover:scale-110 transition-transform">
                    <Clock className="w-5 h-5" style={{ color: primaryColor }} />
                  </div>
                  <h4 className="font-bold text-gray-900">Hours</h4>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Mon - Fri: 9:00 AM - 6:00 PM<br />
                  <span className="text-xs text-gray-500">Sat & Sun: 10:00 AM - 4:00 PM</span>
                </p>
              </div>
              <div className="group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-teal-100 rounded-xl group-hover:scale-110 transition-transform">
                    <Phone className="w-5 h-5" style={{ color: primaryColor }} />
                  </div>
                  <h4 className="font-bold text-gray-900">Contact</h4>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">
                  +93 (0) 123 456 789<br />
                  <span className="text-xs font-medium" style={{ color: primaryColor }}>Reviews: {storeInfo?.followers || 0} Customers</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default StoreFront;
