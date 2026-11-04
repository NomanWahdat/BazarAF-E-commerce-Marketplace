import { Product } from '@/types/category';
import { getAbsoluteImageUrl } from '@/utils/imageUtils';

export interface WishlistStorageItem {
  id: string;
  name: string;
  slug?: string;
  image: string;
  price: number;
  original_price?: number;
  rating: number;
  in_stock: boolean;
  vendor_name: string;
}

const WISHLIST_KEY = 'wishlist';
const WISHLIST_EVENT = 'wishlistUpdated';

const emitWishlistUpdated = (items: WishlistStorageItem[]) => {
  const event = new CustomEvent(WISHLIST_EVENT, { detail: items });
  window.dispatchEvent(event);
};

export const getWishlistItems = (): WishlistStorageItem[] => {
  try {
    const saved = localStorage.getItem(WISHLIST_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Failed to parse wishlist from localStorage:', error);
    return [];
  }
};

export const saveWishlistItems = (items: WishlistStorageItem[]) => {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
  emitWishlistUpdated(items);
};

export const isInWishlist = (productId: string): boolean => {
  return getWishlistItems().some((item) => item.id === productId);
};

export const toggleWishlistProduct = (product: Product): { added: boolean; items: WishlistStorageItem[] } => {
  const items = getWishlistItems();
  const existingIndex = items.findIndex((item) => item.id === product.id);

  if (existingIndex >= 0) {
    const updated = items.filter((item) => item.id !== product.id);
    saveWishlistItems(updated);
    return { added: false, items: updated };
  }

  const newItem: WishlistStorageItem = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    image: getAbsoluteImageUrl(product.primary_image || '/placeholder.svg'),
    price: typeof product.price === 'string' ? parseFloat(product.price) : product.price,
    original_price: product.original_price,
    rating: product.average_rating || 0,
    in_stock: product.in_stock,
    vendor_name: product.vendor?.shop_name || product.vendor_name || 'Unknown Vendor',
  };

  const updated = [newItem, ...items];
  saveWishlistItems(updated);
  return { added: true, items: updated };
};

export const removeWishlistItem = (productId: string) => {
  const updated = getWishlistItems().filter((item) => item.id !== productId);
  saveWishlistItems(updated);
};

export const clearWishlistItems = () => {
  saveWishlistItems([]);
};

export const wishlistEventName = WISHLIST_EVENT;
