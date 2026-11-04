import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, X, Loader2 } from 'lucide-react';
import { productAPI } from '@/services/categoryApi';
import { Product, Category, SearchResult } from '@/types/category';
import { getAbsoluteImageUrl } from '@/utils/imageUtils';

interface SearchBarProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
}

/**
 * SearchBar Component
 * Advanced search with autocomplete for products and categories
 */
const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search debounce
  useEffect(() => {
    const searchProducts = async () => {
      if (query.length < 2) {
        setResults(null);
        return;
      }

      setIsLoading(true);
      try {
        const data = await productAPI.search(query);
        setResults(data);
        setShowResults(true);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(searchProducts, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/products?search=${encodeURIComponent(query)}`);
      setShowResults(false);
      onSearch?.(query);
    }
  };

  const handleCategoryClick = (category: Category) => {
    navigate(`/products?category=${category.slug}`);
    setShowResults(false);
    setQuery('');
  };

  const handleProductClick = (product: Product) => {
    navigate(`/product/${product.id}`);
    setShowResults(false);
    setQuery('');
  };

  const handleClear = () => {
    setQuery('');
    setResults(null);
    setShowResults(false);
  };

  return (
    <div ref={searchRef} className="relative w-full">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder={placeholder || t('search_products_placeholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch(e as any)}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-sm"
          autoComplete="off"
        />

        {/* Clear Button */}
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-600 animate-spin" />
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && results && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-y-auto z-50">
          {/* Categories Section */}
          {results.categories.length > 0 && (
            <div className="border-b px-4 py-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                {t('searchbar_categories')}
              </h3>
              {results.categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded text-sm text-gray-700 hover:text-teal-600 transition-colors"
                >
                  {category.name}
                  <span className="text-xs text-gray-400 ml-2">
                    ({category.product_count})
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Products Section */}
          {results.results.length > 0 && (
            <div className="px-4 py-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                {t('searchbar_products')}
              </h3>
              {results.results.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 rounded transition-colors mb-1 last:mb-0"
                >
                  {/* Product Image */}
                  <img
                    src={getAbsoluteImageUrl(product.primary_image || '/placeholder.svg')}
                    alt={product.name}
                    className="w-12 h-12 object-cover rounded"
                  />

                  {/* Product Info */}
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">
                      {product.name}
                    </p>
                    <p className="text-sm text-teal-600 font-semibold">
                      AFN {Math.round(product.price).toLocaleString()}
                    </p>
                    {product.discount_percentage > 0 && (
                      <span className="text-xs text-red-600">
                        {product.discount_percentage}% off
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No Results */}
          {results.results.length === 0 && results.categories.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <p className="text-sm">{t('searchbar_no_results_found_for', { query })}</p>
            </div>
          )}

          {/* View All Results */}
          {(results.results.length > 0 || results.categories.length > 0) && (
            <div className="border-t px-4 py-3 bg-gray-50">
              <button
                onClick={() =>
                  navigate(`/products?search=${encodeURIComponent(query)}`)
                }
                className="w-full text-center text-sm text-teal-600 hover:text-teal-700 font-semibold"
              >
                {t('searchbar_view_all_results')} →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading && query.length >= 2 && !results && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-lg border border-gray-200 p-4 text-center z-50">
          <p className="text-sm text-gray-500">{t('searchbar_searching')}</p>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
