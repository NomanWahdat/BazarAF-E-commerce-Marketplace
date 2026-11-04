// File 3: frontend/src/pages/Wishlist.tsx

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Heart, ShoppingCart, Trash2, Star } from 'lucide-react';
import Layout from '../app/components/layout/Layout';
import { toast } from 'sonner';
import {
  clearWishlistItems,
  getWishlistItems,
  removeWishlistItem,
  wishlistEventName,
  WishlistStorageItem,
} from '@/utils/wishlist';

interface WishlistItem {
  id: string;
  product_id: string;
  product_name: string;
  product_image: string;
  price: number;
  original_price?: number;
  discount?: number;
  rating: number;
  in_stock: boolean;
  vendor_name: string;
  slug?: string;
}

const Wishlist: React.FC = () => {
  const { t } = useTranslation();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWishlist();

    const handleWishlistUpdated = () => loadWishlist();
    window.addEventListener(wishlistEventName, handleWishlistUpdated);
    return () => window.removeEventListener(wishlistEventName, handleWishlistUpdated);
  }, []);

  const mapWishlistItem = (item: WishlistStorageItem): WishlistItem => ({
    id: item.id,
    product_id: item.id,
    product_name: item.name,
    product_image: item.image,
    price: item.price,
    original_price: item.original_price,
    discount:
      item.original_price && item.original_price > item.price
        ? Math.round(((item.original_price - item.price) / item.original_price) * 100)
        : 0,
    rating: item.rating || 0,
    in_stock: item.in_stock,
    vendor_name: item.vendor_name,
    slug: item.slug,
  });

  const loadWishlist = () => {
    setLoading(true);
    const items = getWishlistItems();
    setWishlist(items.map(mapWishlistItem));
    setLoading(false);
  };

  const removeFromWishlist = (id: string) => {
    removeWishlistItem(id);
    setWishlist(wishlist.filter(item => item.id !== id));
    toast.success(t('wishlist_removed'));
  };

  const moveToCart = (item: WishlistItem) => {
    try {
      const existingCart = localStorage.getItem('cart');
      const cart = existingCart ? JSON.parse(existingCart) : [];
      const existingItem = cart.find((cartItem: any) => cartItem.id === item.product_id);

      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        cart.push({
          id: item.product_id,
          name: item.product_name,
          price: item.price,
          image: item.product_image || '/placeholder.svg',
          quantity: 1,
          slug: item.slug,
          seller: {
            name: item.vendor_name,
          },
        });
      }

      localStorage.setItem('cart', JSON.stringify(cart));
      window.dispatchEvent(new CustomEvent('cartUpdated', { detail: cart }));

      removeFromWishlist(item.id);
      toast.success(t('product_moved_to_cart'));
    } catch (error) {
      console.error('Error moving to cart:', error);
      toast.error(t('product_move_to_cart_failed'));
    }
  };

  return (
    <Layout variant="customer" cartItemCount={0}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('wishlist_heading')}</h1>
          <p className="text-gray-600">
            {t('wishlist_item_count', { count: wishlist.length })}
          </p>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">{t('wishlist_loading')}</p>
          </div>
        ) : wishlist.length === 0 ? (
          /* Empty State */
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('wishlist_empty_title')}</h3>
            <p className="text-gray-600 mb-6">{t('wishlist_empty_description')}</p>
            <button
              onClick={() => window.location.href = '/home'}
              className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors"
            >
              {t('wishlist_start_shopping')}
            </button>
          </div>
        ) : (
          /* Wishlist Grid */
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {wishlist.map((item) => (
              <div key={item.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden group">
                {/* Product Image */}
                <div className="relative aspect-square overflow-hidden bg-gray-100">
                  <img
                    src={item.product_image || '/placeholder.svg'}
                    alt={item.product_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  
                  {/* Discount Badge */}
                  {item.discount && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-sm font-semibold">
                      {item.discount}% OFF
                    </div>
                  )}

                  {/* Stock Status */}
                  {!item.in_stock && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <span className="bg-white text-gray-900 px-4 py-2 rounded-lg font-semibold">
                        {t('product_out_of_stock')}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => removeFromWishlist(item.id)}
                    className="absolute top-2 right-2 bg-white text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors shadow-md"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                    {item.product_name}
                  </h3>
                  
                  <p className="text-sm text-gray-600 mb-2">{item.vendor_name}</p>

                  {/* Rating */}
                  <div className="flex items-center gap-1 mb-2">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">{item.rating.toFixed(1)}</span>
                  </div>

                  {/* Price */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg font-bold text-gray-900">AFN {Math.round(item.price).toLocaleString()}</span>
                    {item.original_price && (
                      <span className="text-sm text-gray-500 line-through">
                        AFN {Math.round(item.original_price).toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* Add to Cart Button */}
                  <button
                    onClick={() => moveToCart(item)}
                    disabled={!item.in_stock}
                    className={`w-full py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                      item.in_stock
                        ? 'bg-teal-600 text-white hover:bg-teal-700'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    {item.in_stock ? t('wishlist_move_to_cart') : t('product_out_of_stock')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Clear All Button */}
        {wishlist.length > 0 && (
          <div className="mt-8 text-center">
            <button
              onClick={() => {
                if (confirm(t('wishlist_clear_confirm'))) {
                  clearWishlistItems();
                  setWishlist([]);
                  toast.success(t('wishlist_cleared'));
                }
              }}
              className="text-red-600 hover:text-red-700 font-medium"
            >
              {t('wishlist_clear_all')}
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Wishlist;