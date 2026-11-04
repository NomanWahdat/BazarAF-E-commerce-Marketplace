/**
 * Utility functions for handling image URLs across the application
 */

/**
 * Get the API base URL dynamically for media files
 * Removes '/api' from the full API URL to get the backend base URL
 */
const getApiBaseUrl = (): string => {
  const defaultApiUrl = import.meta.env.PROD
    ? 'https://bazaraf-production.up.railway.app/api'
    : 'http://localhost:8000/api';
  const apiUrl = import.meta.env.VITE_API_URL || defaultApiUrl;

  // Remove '/api' suffix to get backend base URL (for /media files)
  return apiUrl.replace(/\/api\/?$/, '');
};

/**
 * Convert relative image URLs to absolute URLs
 * Handles both relative paths (/media/...) and already absolute URLs
 * @param url - Image URL (relative or absolute)
 * @returns Absolute URL or fallback image path
 */
export function getAbsoluteImageUrl(url: string | null | undefined): string {
  if (!url) {
    return '/placeholder.svg';
  }

  // Already an absolute URL (includes R2 cloud storage URLs)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url.replace('http://', 'https://');
  }

  // Relative URL - prepend API base URL
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}${url}`;
}

/**
 * Extract and normalize image URLs from a product image object
 * @param img - Product image object with image and image_url properties
 * @returns Absolute image URL
 */
export function getProductImageUrl(img: any): string {
  if (!img) {
    console.warn('⚠️ Image object is null/undefined');
    return '/placeholder.svg';
  }
  
  // Try image_url first (should be absolute from backend)
  // Fall back to image field if image_url is not available
  const url = img.image_url || img.image;
  
  if (!url) {
    console.warn('⚠️ Image URL not found in object:', img);
    return '/placeholder.svg';
  }

  return getAbsoluteImageUrl(url);
}

/**
 * Get multiple product images as absolute URLs
 * @param images - Array of product image objects
 * @returns Array of absolute image URLs
 */
export function getProductImageUrls(images: any[]): string[] {
  if (!Array.isArray(images) || images.length === 0) {
    return ['/placeholder.svg'];
  }

  return images.map(getProductImageUrl);
}
