import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '../app/components/layout/Layout';
import ProductCard from '@/components/customer/ProductCard';
import { productAPI, categoryAPI } from '@/services/categoryApi';
import { Product, Category } from '@/types/category';
import { getAbsoluteImageUrl } from '@/utils/imageUtils';
import { Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * ProductListing Page
 * Displays products with filtering, sorting, and pagination
 */
const ProductListing: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [cartItemCount, setCartItemCount] = useState(0);
  const { t } = useTranslation();

  // Filters
  const categorySlug = searchParams.get('category');
  const searchQuery = searchParams.get('search');
  const minPrice = searchParams.get('min_price');
  const maxPrice = searchParams.get('max_price');
  const sortBy = searchParams.get('sort') || '-created_at';

  // Load cart count on mount and listen for updates
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
      } else {
        setCartItemCount(0);
      }
    };

    updateCartCount();

    const handleCartUpdate = () => updateCartCount();
    window.addEventListener('cartUpdated', handleCartUpdate);
    const interval = setInterval(updateCartCount, 500);

    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
      clearInterval(interval);
    };
  }, []);

  // Load products and category
  useEffect(() => {
    loadProducts();
    if (categorySlug) {
      loadCategory();
    }
  }, [categorySlug, searchQuery, minPrice, maxPrice, sortBy, currentPage]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const filters: any = {
        ordering: sortBy,
        page: currentPage,
      };

      if (categorySlug) filters.category_slug = categorySlug;
      if (searchQuery) filters.search = searchQuery;
      if (minPrice) filters.min_price = minPrice;
      if (maxPrice) filters.max_price = maxPrice;

      const data = await productAPI.getProducts(filters, currentPage);
      setProducts(data.results || []);
      setTotalCount(data.count || 0);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategory = async () => {
    if (!categorySlug) return;
    try {
      const data = await categoryAPI.getCategory(categorySlug);
      setCategory(data);
    } catch (error) {
      console.error('Error loading category:', error);
    }
  };

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    setSearchParams(params);
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setSearchParams({});
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalCount / 20);
  const hasAppliedFilters =
    categorySlug || searchQuery || minPrice || maxPrice;

  return (
    <Layout variant="customer" cartItemCount={cartItemCount}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-600 mb-6">
          <button
            onClick={() => navigate('/')}
            className="hover:text-teal-600"
          >
            {t('home')}
          </button>
          <span>/</span>
          {category && (
            <>
              <span className="text-gray-900 font-medium">
                {category.full_path}
              </span>
              <span>/</span>
            </>
          )}
          {searchQuery && (
            <span className="text-gray-900 font-medium">
              Search: "{searchQuery}"
            </span>
          )}
        </nav>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              {category?.name || (searchQuery ? t('product_listing_search_results') : t('product_listing_all_products'))}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {t('product_listing_products_found_count', { count: totalCount })}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => updateFilter('sort', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
            >
              <option value="-created_at">{t('product_listing_sort_newest')}</option>
              <option value="price">{t('product_listing_sort_price_low_high')}</option>
              <option value="-price">{t('product_listing_sort_price_high_low')}</option>
              <option value="-sales_count">{t('product_listing_sort_best_selling')}</option>
            </select>

            {/* Filter Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm">{t('product_listing_filters')}</span>
            </button>
          </div>
        </div>

        {/* Active Filters Display */}
        {hasAppliedFilters && (
          <div className="mb-4 p-3 bg-teal-50 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-700">
                {t('product_listing_active_filters')}
              </span>
              {categorySlug && (
                <span className="text-xs bg-teal-600 text-white px-2 py-1 rounded">
                  {category?.name}
                </span>
              )}
              {searchQuery && (
                <span className="text-xs bg-teal-600 text-white px-2 py-1 rounded">
                  {t('search')}: {searchQuery}
                </span>
              )}
              {(minPrice || maxPrice) && (
                <span className="text-xs bg-teal-600 text-white px-2 py-1 rounded">
                  AFN {minPrice || '0'} - AFN {maxPrice || '∞'}
                </span>
              )}
            </div>
            <button
              onClick={clearAllFilters}
              className="text-xs text-teal-700 hover:text-teal-800 font-semibold"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">{t('product_listing_filters')}</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Price Range */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  Price Range (AFN)
                </h4>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder={t('product_listing_min_price')}
                    value={minPrice || ''}
                    onChange={(e) =>
                      updateFilter('min_price', e.target.value || null)
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="number"
                    placeholder={t('product_listing_max_price')}
                    value={maxPrice || ''}
                    onChange={(e) =>
                      updateFilter('max_price', e.target.value || null)
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Category Filter */}
              {!categorySlug && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">
                    {t('category')}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {t('product_listing_navigate_category_to_filter')}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="bg-gray-200 rounded-lg aspect-square animate-pulse"
              />
            ))}
          </div>
        ) : products.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={(p) => {
                    // Add to cart logic - store in localStorage
                    try {
                      const existingCart = localStorage.getItem('cart');
                      const cart = existingCart ? JSON.parse(existingCart) : [];

                      const existingItem = cart.find((item: any) => item.id === p.id);

                      if (existingItem) {
                        existingItem.quantity += 1;
                      } else {
                        cart.push({
                          id: p.id,
                          name: p.name,
                          price: typeof p.price === 'string' ? parseFloat(p.price) : p.price,
                          image: getAbsoluteImageUrl(p.primary_image || '/placeholder.svg'),
                          quantity: 1,
                          slug: p.slug,
                          seller: {
                            name: p.vendor?.shop_name || 'Unknown',
                          },
                          vendorId: p.vendor?.id,
                        });
                      }

                      localStorage.setItem('cart', JSON.stringify(cart));
                      
                      // Dispatch event to App component to sync state
                      const event = new CustomEvent('cartUpdated', { detail: cart });
                      window.dispatchEvent(event);
                      
                      // product added to cart
                    } catch (error) {
                      console.error('Error adding to cart:', error);
                    }
                  }}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                        currentPage === i + 1
                          ? 'bg-teal-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg mb-4">
              {t('product_listing_no_matches')}
            </p>
            <button
              onClick={clearAllFilters}
              className="text-teal-600 hover:underline font-semibold"
            >
              {t('product_listing_clear_filters_try_again')}
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ProductListing;
