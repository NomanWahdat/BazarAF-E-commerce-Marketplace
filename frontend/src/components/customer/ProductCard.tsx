import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product } from '@/types/category';
import { Star, ShoppingCart, Heart, Package } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { getAbsoluteImageUrl } from '@/utils/imageUtils';
import { isInWishlist, toggleWishlistProduct, wishlistEventName } from '@/utils/wishlist';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
  onWishlistToggle?: (product: Product) => void;
}

/**
 * ProductCard Component
 * Displays individual product with image carousel, pricing, and actions
 */
const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  onWishlistToggle,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    setIsWishlisted(isInWishlist(product.id));

    const handleWishlistUpdated = () => {
      setIsWishlisted(isInWishlist(product.id));
    };

    window.addEventListener(wishlistEventName, handleWishlistUpdated);
    return () => window.removeEventListener(wishlistEventName, handleWishlistUpdated);
  }, [product.id]);

  const handleProductClick = () => {
    if (!product.slug) {
      console.warn('Product slug is missing, using fallback');
    }
    const navigateUrl = `/product/${product.slug || product.name.toLowerCase().replace(/\s+/g, '-')}`;
    navigate(navigateUrl);
  };

  const getStoreSlug = (shopName?: string) => {
    const source = String(shopName || '').trim();
    if (!source) return 'store';
    return source
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\p{L}\p{N}-]/gu, '')
      .replace(/-+/g, '-');
  };

  const handleVisitStore = (e: React.MouseEvent) => {
    e.stopPropagation();
    const storeName = product.vendor?.shop_name || product.vendor_name || '';
    const storeSlug = getStoreSlug(storeName);
    navigate(`/store/${product?.vendor?.id || storeSlug}`);
  };

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const { added } = toggleWishlistProduct(product);
    setIsWishlisted(added);
    toast.success(added ? t('wishlist_added') : t('wishlist_removed'));
    if (onWishlistToggle) {
      onWishlistToggle(product);
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // If callback is provided, use it
    if (onAddToCart) {
      onAddToCart(product);
      return;
    }

    // Otherwise, add directly to localStorage
    try {
      const existingCart = localStorage.getItem('cart');
      const cart = existingCart ? JSON.parse(existingCart) : [];

      const existingItem = cart.find((item: any) => item.id === product.id);

      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        cart.push({
          id: product.id,
          name: product.name,
          price: typeof product.price === 'string' ? parseFloat(product.price) : product.price,
          image: getAbsoluteImageUrl(product.primary_image || '/placeholder.svg'),
          quantity: 1,
          slug: product.slug,
          seller: {
            name: product.vendor?.shop_name || 'Unknown',
          },
          vendorId: product.vendor?.id,
        });
      }

      localStorage.setItem('cart', JSON.stringify(cart));
      
      // Dispatch event to App component to sync state
      const event = new CustomEvent('cartUpdated', { detail: cart });
      window.dispatchEvent(event);
      
      toast.success(t('product_added_to_cart', { productName: product.name }));
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error(t('product_add_to_cart_failed'));
    }
  };

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-200 group cursor-pointer"
      onClick={handleProductClick}
    >
      {/* Product Image Container */}
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        {/* Main Image */}
        <img
          src={getAbsoluteImageUrl(product.primary_image || '/placeholder.svg')}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Discount Badge */}
        {product.discount_percentage > 0 && (
          <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full z-10">
            -{product.discount_percentage}%
          </div>
        )}

        {/* Out of Stock Overlay */}
        {!product.in_stock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold">
              {t('product_out_of_stock')}
            </div>
          </div>
        )}

        {/* Wishlist Button */}
        <button
          onClick={handleWishlistClick}
          className="absolute top-3 right-12 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
        >
          <Heart
            className={`w-4 h-4 ${
              isWishlisted
                ? 'fill-red-500 text-red-500'
                : 'text-gray-600 hover:text-red-500'
            }`}
          />
        </button>
      </div>

      {/* Product Info */}
      <div className="p-3">
        {/* Product Name */}
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 min-h-[40px] hover:text-teal-600 transition-colors">
          {product.name}
        </h3>

        {/* Vendor Info & COD */}
        <div className="flex items-center justify-between gap-2 mt-1 mb-2 flex-wrap">
          <div className="flex items-center gap-1 flex-1 min-w-0">
            {product.vendor?.is_verified && (
              <span className="text-teal-600 text-xs" title={t('product_verified_vendor')}>
                ✓
              </span>
            )}
            <button
              onClick={handleVisitStore}
              className="text-xs text-gray-600 truncate hover:text-teal-600 hover:underline transition-colors"
              title={t('product_visit_store')}
            >
              {product.vendor?.shop_name || product.vendor_name || t('product_seller')}
            </button>
          </div>
          {product.cod_available && (
            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded whitespace-nowrap flex items-center gap-0.5">
              <Package className="w-3 h-3" />
              COD
            </span>
          )}
        </div>

        {/* Rating & Reviews */}
        <div className="flex items-center gap-1 mb-2">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-3 h-3 ${
                  i < Math.floor(product.average_rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-gray-600">
            ({product.review_count})
          </span>
        </div>

        {/* Price Section */}
        <div className="mb-3">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-teal-600">
              AFN {Math.round(product.price).toLocaleString()}
            </span>
            {product.original_price && product.original_price > product.price && (
              <span className="text-sm text-gray-400 line-through">
                AFN {Math.round(product.original_price).toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Add to Cart Button */}
        <button
          onClick={handleAddToCart}
          disabled={!product.in_stock}
          className={`w-full py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
            product.in_stock
              ? 'bg-teal-600 text-white hover:bg-teal-700'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          {product.in_stock ? t('product_add_to_cart') : t('product_unavailable')}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
