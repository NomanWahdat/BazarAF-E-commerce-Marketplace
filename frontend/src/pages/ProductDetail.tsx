import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../app/components/layout/Layout';
import { productAPI } from '@/services/categoryApi';
import {
  ProductDetail as ProductDetailType,
} from '@/types/category';
import { Product } from '@/types/category';
import {
  Star,
  Minus,
  Plus,
  Heart,
  Share2,
  Truck,
  Shield,
  ChevronLeft,
  Loader2,
  ShoppingCart,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { getAbsoluteImageUrl, getProductImageUrl } from '@/utils/imageUtils';
import { isInWishlist, toggleWishlistProduct } from '@/utils/wishlist';

/**
 * ProductDetail Page
 * Displays full product information with attributes, reviews, and more
 */
const ProductDetail: React.FC = () => {
  const { productSlug } = useParams<{ productSlug: string }>();
  const navigate = useNavigate();

  // State
  const [product, setProduct] = useState<ProductDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [wishlistActive, setWishlistActive] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const { t } = useTranslation();

  // Load product on mount
  useEffect(() => {
    loadProduct();
  }, [productSlug]);

  // Load cart count from localStorage and listen for updates
  useEffect(() => {
    const updateCartCount = () => {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        try {
          const cart = JSON.parse(savedCart);
          const count = cart.reduce((sum: number, item: any) => sum + item.quantity, 0);
          // cart count updated
          setCartItemCount(count);
        } catch (error) {
          console.error('❌ Error reading cart:', error);
        }
      } else {
        setCartItemCount(0);
      }
    };

    // Initial load
    updateCartCount();

    // Listen for cart updates
    const handleCartUpdate = () => {
      updateCartCount();
    };

    window.addEventListener('cartUpdated', handleCartUpdate);

    // Also poll every 500ms
    const interval = setInterval(updateCartCount, 500);

    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
      clearInterval(interval);
    };
  }, []);

  const loadProduct = async () => {
    if (!productSlug) {
      navigate('/');
      return;
    }

    setLoading(true);
    try {
      // Fetch product (includes view increment and refresh)
      const data = await productAPI.getProduct(productSlug);
      setProduct(data);
      if (data?.id) {
        setWishlistActive(isInWishlist(data.id));
      }
      
      // Load reviews
      if (productSlug) {
        loadReviews(productSlug);
      }
    } catch (error) {
      console.error('Error loading product:', error);
      toast.error(t('product_detail_load_failed'));
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async (productRef: string) => {
    setReviewsLoading(true);
    try {
      const reviewsData = await productAPI.getReviews(productRef);
      setReviews(reviewsData || []);
    } catch (error) {
      console.error('Error loading reviews:', error);
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
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

  const navigateToStore = () => {
    const storeName = product?.vendor?.shop_name || product?.vendor_name || '';
    const storeSlug = getStoreSlug(storeName);
    navigate(`/store/${product?.vendor?.id || storeSlug}`);
  };

  const handleAddToCart = () => {
    if (!product) {
      toast.error(t('product_detail_not_found_error'));
      return;
    }
    
    setIsAddingToCart(true);
    
    try {
      // Get existing cart from localStorage
      const existingCartStr = localStorage.getItem('cart');
      const cart = existingCartStr ? JSON.parse(existingCartStr) : [];

      // Check if product already in cart
      const existingItem = cart.find((item: any) => item.id === product.id);

      if (existingItem) {
        existingItem.quantity += quantity;
        toast.success(t('product_detail_updated_quantity_in_cart', { name: product.name }));
      } else {
        const cartItem = {
          id: product.id,
          name: product.name,
          price: typeof product.price === 'string' ? parseFloat(product.price) : product.price,
          image: getAbsoluteImageUrl(
            product.images?.[0] ? getProductImageUrl(product.images[0]) : '/placeholder.svg'
          ),
          quantity: quantity,
          slug: product.slug,
          seller: {
            name: product.vendor_name || 'Unknown',
          },
          vendorId: product.vendor_id,
        };
        cart.push(cartItem);
        toast.success(t('product_detail_added_to_cart', { name: product.name }));
      }

      // Save to localStorage
      localStorage.setItem('cart', JSON.stringify(cart));
      
      // Dispatch custom event for App component
      const event = new CustomEvent('cartUpdated', { detail: cart });
      window.dispatchEvent(event);
      
      // Reset quantity
      setQuantity(1);
    } catch (error) {
      console.error('❌ Error adding to cart:', error);
      toast.error(t('product_detail_add_to_cart_failed'));
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleBuyNow = () => {
    if (!product) return;

    setIsAddingToCart(true);
    try {
      // Create a temporary cart with only this product
      const cartItem = {
        id: product.id,
        name: product.name,
        price: typeof product.price === 'string' ? parseFloat(product.price) : product.price,
        image: getAbsoluteImageUrl(
          product.images?.[0] ? getProductImageUrl(product.images[0]) : '/placeholder.svg'
        ),
        quantity: quantity,
        slug: product.slug,
        seller: {
          name: product.vendor_name || 'Unknown',
        },
        vendorId: product.vendor_id,
      };

      // Store in localStorage
      const cartArray = [cartItem];
      localStorage.setItem('cart', JSON.stringify(cartArray));
      localStorage.setItem('checkout_from_product', 'true');

      // Dispatch event to sync App state
      const event = new CustomEvent('cartUpdated', { detail: cartArray });
      window.dispatchEvent(event);

      // Navigate to checkout
      navigate('/checkout');
      toast.success(t('product_detail_proceeding_to_checkout'));
    } catch (error) {
      console.error('Error in buy now:', error);
      toast.error(t('product_detail_buy_now_failed'));
    } finally {
      setIsAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <Layout variant="customer" cartItemCount={cartItemCount}>
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex justify-center items-center h-96">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout variant="customer" cartItemCount={cartItemCount}>
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {t('product_detail_not_found_heading')}
            </h1>
            <button
              onClick={() => navigate('/products')}
              className="text-teal-600 hover:underline font-semibold"
            >
              {t('product_detail_back_to_products')}
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const mainImage =
    product.images?.length > 0 ? product.images[selectedImageIndex] : null;
  const rating = product.average_rating || 0;
  const ratingCount = product.review_count || 0;
  const discount = product.original_price
    ? Math.round(
        ((product.original_price - product.price) / product.original_price) *
          100
      )
    : 0;

  return (
    <Layout variant="customer" cartItemCount={cartItemCount}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-teal-600 hover:text-teal-700 mb-6 font-semibold"
        >
          <ChevronLeft className="w-4 h-4" />
          {t('back')}
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Image Section */}
          <div>
            {mainImage ? (
              <div className="mb-4">
                <div className="bg-gray-100 rounded-lg overflow-hidden aspect-square relative">
                  <img
                    src={getAbsoluteImageUrl(mainImage?.image_url || '/placeholder.svg')}
                    alt={product.name}
                    className="w-full h-full object-contain"
                  />
                  {product.is_featured && (
                    <div className="absolute top-3 right-3 bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      {t('product_detail_featured')}
                    </div>
                  )}
                  {discount > 0 && (
                    <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                      -{discount}%
                    </div>
                  )}
                  {!product.in_stock && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="bg-white text-gray-900 px-4 py-2 rounded-lg font-semibold">
                        {t('product_detail_out_of_stock')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-gray-200 rounded-lg aspect-square mb-4 animate-pulse" />
            )}

            {/* Image Thumbnails */}
            {product.images && product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden transition-colors ${
                      selectedImageIndex === index
                        ? 'border-teal-600'
                        : 'border-gray-300'
                    }`}
                  >
                    <img
                      src={getAbsoluteImageUrl(image.image_url)}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info Section */}
          <div>
            {/* Category */}
            {product.category_name && (
              <button
                onClick={() =>
                  navigate(`/products?category=${encodeURIComponent(product.category_name || '')}`)
                }
                className="text-teal-600 hover:underline text-sm font-semibold mb-2"
              >
                {product.category_name}
              </button>
            )}

            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              {product.name}
            </h1>

            {/* Vendor */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-gray-600">{t('product_detail_by')}</span>
              <button
                onClick={navigateToStore}
                className="text-teal-600 hover:underline font-semibold text-sm flex items-center gap-1"
              >
                {product.vendor?.shop_name || product.vendor_name || t('seller')}
                {product.vendor_verified && (
                  <Shield className="w-4 h-4 text-teal-600" />
                )}
              </button>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="font-bold text-gray-900">{rating}</span>
              </div>
              <span className="text-sm text-gray-600">
                {t('product_detail_reviews_count', { count: ratingCount })}
              </span>
            </div>

            <hr className="my-4" />

            {/* Pricing */}
            <div className="mb-4">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-teal-600">
                  AFN {product.price.toLocaleString()}
                </span>
                {product.original_price && (
                  <>
                    <span className="text-lg text-gray-500 line-through">
                      AFN {product.original_price.toLocaleString()}
                    </span>
                    <span className="text-sm font-semibold text-red-500">
                      -{discount}%
                    </span>
                  </>
                )}
              </div>

              {/* Stock Status */}
              <div className="mt-3 flex items-center gap-2">
                {product.in_stock ? (
                  <>
                    {product.is_low_stock ? (
                      <span className="text-sm text-orange-600 font-semibold">
                        {t('product_detail_low_stock')}
                      </span>
                    ) : (
                      <span className="text-sm text-green-600 font-semibold">
                        {t('product_detail_in_stock')}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-sm text-red-600 font-semibold">
                    {t('product_detail_out_of_stock')}
                  </span>
                )}
              </div>
            </div>

            {/* COD Badge */}
            {product.cod_available && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900 font-semibold">
                  {t('product_detail_cod_available')}
                </p>
              </div>
            )}

            {/* Quantity & Actions */}
            <div className="flex flex-col gap-3 mb-6">
              {product.in_stock && (
                <div className="flex items-center border border-gray-300 rounded-lg w-fit">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 hover:bg-gray-100"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 py-2 font-semibold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-2 hover:bg-gray-100"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Add to Cart Button */}
                <button
                  onClick={handleAddToCart}
                  disabled={!product.in_stock || isAddingToCart}
                  className={`flex-1 py-3 px-6 rounded-lg font-semibold text-white transition-colors flex items-center justify-center gap-2 ${
                    product.in_stock && !isAddingToCart
                      ? 'bg-teal-600 hover:bg-teal-700'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>{isAddingToCart ? t('product_detail_adding_to_cart') : t('product_detail_add_to_cart')}</span>
                </button>

                {/* Buy Now Button */}
                <button
                  onClick={handleBuyNow}
                  disabled={!product.in_stock || isAddingToCart}
                  className={`flex-1 py-3 px-6 rounded-lg font-semibold text-white transition-colors flex items-center justify-center gap-2 ${
                    product.in_stock && !isAddingToCart
                      ? 'bg-orange-600 hover:bg-orange-700'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Zap className="w-5 h-5" />
                  <span>{isAddingToCart ? t('product_detail_processing') : t('product_detail_buy_now')}</span>
                </button>
              </div>

              {/* Wishlist & Share */}
              <div className="flex gap-3">
                {/* Wishlist */}
                <button
                  onClick={() => {
                    if (!product) return;
                    const { added } = toggleWishlistProduct(product as Product);
                    setWishlistActive(added);
                    toast.success(added ? t('product_detail_added_to_wishlist') : t('product_detail_removed_from_wishlist'));
                  }}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    wishlistActive
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <Heart
                    className={`w-5 h-5 ${
                      wishlistActive ? 'fill-red-500 text-red-500' : 'text-gray-600'
                    }`}
                  />
                </button>

                {/* Share */}
                <button className="flex-1 p-3 rounded-lg border border-gray-300 hover:border-gray-400 flex items-center justify-center gap-2 text-gray-700 font-semibold">
                  <Share2 className="w-5 h-5" />
                  <span>{t('product_detail_share')}</span>
                </button>

                {/* Write Review Button */}
                <button
                  onClick={() => {
                    // Navigate to reviews page or open review modal
                    toast.info(t('product_detail_review_info'));
                  }}
                  className="flex-1 p-3 rounded-lg border-2 border-amber-300 bg-amber-50 hover:bg-amber-100 flex items-center justify-center gap-2 text-amber-700 font-semibold transition-colors"
                >
                  <Star className="w-5 h-5" />
                  <span>{t('product_detail_review')}</span>
                </button>
              </div>
            </div>

            {/* Shipping Info */}
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <div className="flex gap-3">
                <Truck className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-gray-900">
                    {t('product_detail_free_shipping')}
                  </p>
                  <p className="text-xs text-gray-600">
                    {t('product_detail_free_shipping_note')}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Shield className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-gray-900">
                    {t('product_detail_secure_payment')}
                  </p>
                  <p className="text-xs text-gray-600">
                    {t('product_detail_secure_payment_note')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Attributes Section */}
        {product.product_attributes && product.product_attributes.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-6 mb-12">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              {t('product_detail_specifications')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {product.product_attributes.map((attr) => (
                <div key={attr.id}>
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
                    {attr.attribute_name}
                  </p>
                  <p className="text-gray-900 font-semibold">{attr.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Description Section */}
        {product.description && (
          <div className="bg-white rounded-lg p-6 mb-12 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {t('product_detail_description')}
            </h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {product.description}
            </p>
          </div>
        )}

        {/* Reviews Section */}
        <div className="bg-white rounded-lg p-6 mb-12 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              {t('product_detail_customer_reviews')}
            </h2>
            <span className="text-sm text-gray-600">{t('product_detail_reviews_count', { count: reviews.length })}</span>
          </div>

          {reviewsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
            </div>
          ) : reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review: any, index: number) => (
                <div key={review.id || index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">{review.user_name || t('product_detail_anonymous')}</p>
                      <p className="text-xs text-gray-600">{new Date(review.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < (review.rating || 0)
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-700 text-sm">{review.comment}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">{t('product_detail_no_reviews_yet')}</p>
            </div>
          )}
        </div>

        {/* Views & Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 rounded-lg p-4 mb-12">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {product.views_count || 0}
            </p>
            <p className="text-xs text-gray-600">{t('product_detail_views')}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {product.sales_count || 0}
            </p>
            <p className="text-xs text-gray-600">{t('product_detail_sold')}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{rating}</p>
            <p className="text-xs text-gray-600">{t('product_detail_rating')}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{ratingCount}</p>
            <p className="text-xs text-gray-600">{t('product_detail_reviews')}</p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProductDetail;
