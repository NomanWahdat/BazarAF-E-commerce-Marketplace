import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Package, ShoppingBag, DollarSign, TrendingUp,
  Plus, Edit, Eye, Image as ImageIcon, AlertCircle,
  Search, RefreshCw,
  Trash2,
  X, ChevronLeft, ChevronRight, Tag, Zap
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Alert, AlertDescription } from '../components/ui/alert';
import Layout from '../components/layout/Layout';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  getVendorDashboard,
  getVendorProducts,
  getVendorOrders,

  getVendorPayouts,
  confirmOrder,
  toggleProductActive,
  updateProduct,
  deleteProduct,
  uploadProductImages,
} from '../../services/vendorAPI';
import { getAbsoluteImageUrl, getProductImageUrl } from '../../utils/imageUtils';

const DEFAULT_PRODUCT_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240' viewBox='0 0 240 240'%3E%3Crect width='240' height='240' fill='%23f3f4f6'/%3E%3Cpath d='M72 160l28-34 18 22 22-28 28 40H72z' fill='%23cbd5e1'/%3E%3Ccircle cx='96' cy='92' r='12' fill='%23cbd5e1'/%3E%3C/svg%3E";

// ─────────────────────────────────────────────
// Cache Utility with TTL (5 minutes)
// ─────────────────────────────────────────────
const API_CACHE: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedData(key: string): any | null {
  const cached = API_CACHE[key];
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    delete API_CACHE[key];
    return null;
  }
  return cached.data;
}

function setCachedData(key: string, data: any): void {
  API_CACHE[key] = { data, timestamp: Date.now() };
}

export function clearCache(key?: string): void {
  if (key) {
    delete API_CACHE[key];
  } else {
    Object.keys(API_CACHE).forEach(k => delete API_CACHE[k]);
  }
}

// Debug mode: set to true for console logs during development
const DEBUG_MODE = localStorage.getItem('DEBUG_DASHBOARD') === 'true';

function debugLog(..._args: any[]) {
  // debug logging disabled in production
}

function debugError(...args: any[]) {
  if (DEBUG_MODE) console.error('[Dashboard]', ...args);
}

// ─────────────────────────────────────────────
// Shimmer CSS Animation
// ─────────────────────────────────────────────
const shimmerStyle = `
  @keyframes shimmer {
    0% {
      background-position: -1000px 0;
    }
    100% {
      background-position: 1000px 0;
    }
  }
  .skeleton-loading {
    background: linear-gradient(
      90deg,
      #f3f4f6 25%,
      #e5e7eb 50%,
      #f3f4f6 75%
    );
    background-size: 800px 100%;
    animation: shimmer 2s infinite;
  }
`;

// Inject shimmer styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = shimmerStyle;
  document.head.appendChild(style);
}

// ─────────────────────────────────────────────
// Custom Hooks
// ─────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// ─────────────────────────────────────────────
// Accessibility Hooks
// ─────────────────────────────────────────────
function useKeyboardEscape(onEscape: () => void) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onEscape();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onEscape]);
}

export function useKeyboardEnter(onEnter: () => void, enabled: boolean = true) {
  return useCallback((e: React.KeyboardEvent) => {
    if (enabled && (e.key === 'Enter' || e.code === 'Space')) {
      e.preventDefault();
      onEnter();
    }
  }, [onEnter, enabled]);
}

// ─────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────
export function useInterval(callback: () => void, interval: number | null) {
  useEffect(() => {
    if (interval === null) return;

    const id = setInterval(callback, interval);
    return () => clearInterval(id);
  }, [callback, interval]);
}

function getTimeSince(timestamp: number | null): string {
  if (!timestamp) return 'Never';
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return 'A long time ago';
}

// ─────────────────────────────────────────────
// Optimistic Update Hook
// ─────────────────────────────────────────────
export function useOptimisticUpdate<T>(
  updateFn: () => Promise<T>,
  revertFn: () => void,
) {
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await updateFn();
      return result;
    } catch (error) {
      revertFn();
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [updateFn, revertFn]);

  return { execute, isLoading };
}

// ─────────────────────────────────────────────
// Skeleton Components
// ─────────────────────────────────────────────
function SkeletonCard() {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="skeleton-loading h-4 w-24 rounded mb-3" />
          <div className="skeleton-loading h-8 w-12 rounded mb-2" />
          <div className="skeleton-loading h-3 w-32 rounded" />
        </div>
        <div className="skeleton-loading w-12 h-12 rounded-lg" />
      </div>
    </Card>
  );
}

export function SkeletonText({ lines = 1, widths = [] }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton-loading h-4 rounded"
          style={{ width: widths[i] || '100%' }}
        />
      ))}
    </div>
  );
}

function SkeletonTableRow() {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="skeleton-loading w-12 h-12 rounded-lg" />
          <div className="space-y-2 flex-1">
            <div className="skeleton-loading h-4 w-32 rounded" />
            <div className="skeleton-loading h-3 w-24 rounded" />
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="skeleton-loading h-4 w-20 rounded" />
      </TableCell>
      <TableCell>
        <div className="skeleton-loading h-4 w-16 rounded" />
      </TableCell>
      <TableCell>
        <div className="skeleton-loading h-4 w-20 rounded" />
      </TableCell>
      <TableCell>
        <div className="skeleton-loading h-6 w-16 rounded" />
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          <div className="skeleton-loading w-8 h-8 rounded" />
          <div className="skeleton-loading w-8 h-8 rounded" />
          <div className="skeleton-loading w-8 h-8 rounded" />
        </div>
      </TableCell>
    </TableRow>
  );
}

function SkeletonOrderCard() {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex-1">
        <div className="skeleton-loading h-4 w-24 rounded mb-2" />
        <div className="skeleton-loading h-3 w-48 rounded" />
      </div>
      <div className="space-y-2">
        <div className="skeleton-loading h-3 w-20 rounded" />
        <div className="skeleton-loading h-8 w-16 rounded" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Skeleton Components
// ─────────────────────────────────────────────
export function ProductTableSkeleton() {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <TableRow key={i} className="animate-pulse">
          <TableCell>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-200 rounded-lg" />
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-32" />
                <div className="h-3 bg-gray-200 rounded w-24" />
              </div>
            </div>
          </TableCell>
          <TableCell>
            <div className="h-4 bg-gray-200 rounded w-24" />
          </TableCell>
          <TableCell>
            <div className="h-4 bg-gray-200 rounded w-20" />
          </TableCell>
          <TableCell>
            <div className="h-4 bg-gray-200 rounded w-20" />
          </TableCell>
          <TableCell>
            <div className="h-6 bg-gray-200 rounded w-16" />
          </TableCell>
          <TableCell>
            <div className="flex justify-end gap-2">
              <div className="h-8 w-8 bg-gray-200 rounded" />
              <div className="h-8 w-8 bg-gray-200 rounded" />
              <div className="h-8 w-8 bg-gray-200 rounded" />
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export function CardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-24 mb-2" />
      <div className="h-6 bg-gray-200 rounded w-16 mb-3" />
      <div className="h-4 bg-gray-200 rounded w-32" />
    </div>
  );
}

// ─────────────────────────────────────────────
// Pagination Component
// ─────────────────────────────────────────────
function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  isLoading,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
}) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    
    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-1 mt-6" role="navigation" aria-label="Pagination navigation">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1 || isLoading}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Previous page"
        aria-disabled={currentPage === 1 || isLoading}
      >
        Previous
      </button>
      
      {getPageNumbers().map((page, idx) => (
        page === '...' ? (
          <span key={`ellipsis-${idx}`} className="px-2 text-gray-500" aria-hidden="true">…</span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page as number)}
            disabled={isLoading}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentPage === page
                ? 'bg-primary text-white'
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            } disabled:opacity-50`}
            aria-label={`Go to page ${page}`}
            aria-current={currentPage === page ? 'page' : undefined}
            aria-disabled={isLoading}
          >
            {page}
          </button>
        )
      ))}
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages || isLoading}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Next page"
        aria-disabled={currentPage === totalPages || isLoading}
      >
        Next
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function getProductStatusBadge(status: string) {
  const statusConfig: Record<string, { color: string; label: string }> = {
    draft: { color: 'bg-gray-100 text-gray-700 border-gray-200', label: 'Draft' },
    'pending approval': { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Pending Approval' },
    approved: { color: 'bg-green-100 text-green-700 border-green-200', label: 'Approved' },
    rejected: { color: 'bg-red-100 text-red-700 border-red-200', label: 'Rejected' },
    inactive: { color: 'bg-slate-100 text-slate-700 border-slate-200', label: 'Inactive' },
  };
  return statusConfig[status?.toLowerCase()] || {
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    label: status || 'Unknown',
  };
}

function getProductDisplayImage(product: any): string {
  if (product?.primary_image) {
    return getAbsoluteImageUrl(product.primary_image);
  }

  if (Array.isArray(product?.images) && product.images.length > 0) {
    const firstImage = product.images[0];
    if (typeof firstImage === 'string') {
      return getAbsoluteImageUrl(firstImage);
    }
    return getProductImageUrl(firstImage);
  }

  return DEFAULT_PRODUCT_IMAGE;
}

function getDialogImageUrl(image: any): string {
  if (!image) {
    return DEFAULT_PRODUCT_IMAGE;
  }
  if (typeof image === 'string') {
    return getAbsoluteImageUrl(image);
  }
  return getProductImageUrl(image);
}

function getApiErrorMessage(err: any, fallback: string): string {
  const data = err?.response?.data;
  if (!data) {
    return err?.message || fallback;
  }

  if (typeof data === 'string') {
    return data;
  }

  if (typeof data?.error === 'string') {
    return data.error;
  }

  if (typeof data?.message === 'string') {
    return data.message;
  }

  if (typeof data?.detail === 'string') {
    return data.detail;
  }

  if (typeof data?.non_field_errors === 'object' && Array.isArray(data.non_field_errors)) {
    return String(data.non_field_errors[0]);
  }

  const firstKey = Object.keys(data)[0];
  const firstValue = firstKey ? data[firstKey] : null;
  if (Array.isArray(firstValue) && firstValue.length > 0) {
    return String(firstValue[0]);
  }
  if (typeof firstValue === 'string') {
    return firstValue;
  }

  return fallback;
}

// ─────────────────────────────────────────────
// Security Helpers
// ─────────────────────────────────────────────
function verifyProductOwnership(product: any, currentVendorId: string | number): boolean {
  if (!product || !currentVendorId) {
    return false;
  }
  const productVendorId = String(product.vendor_id || product.vendor?.id || '');
  const currentId = String(currentVendorId);
  return productVendorId === currentId;
}

function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  // Remove potentially dangerous characters while preserving content
  return input.trim().replace(/[<>"'`]/g, '');
}

function logSecurityEvent(eventType: string, details: any) {
  debugLog(`[SECURITY] ${eventType}:`, details);
}

// ─────────────────────────────────────────────
// Retry Logic with Exponential Backoff
// ─────────────────────────────────────────────
interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
}

async function retryableApiCall<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 3, initialDelay = 1000 } = options;
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s, etc.
        const delay = initialDelay * Math.pow(2, attempt);
        debugLog(`[RETRY] Attempt ${attempt + 1}/${maxRetries + 1} failed. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// ─────────────────────────────────────────────
// Confirmation Dialog Component
// ─────────────────────────────────────────────
function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  isLoading = false,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const handleEscape = useCallback(() => {
    if (!isLoading) {
      onCancel();
    }
  }, [isLoading, onCancel]);

  useKeyboardEscape(handleEscape);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
      role="presentation"
      aria-hidden={!isOpen}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
      >
        <div>
          <h3 id="dialog-title" className="text-lg font-semibold text-gray-900">{title}</h3>
          <p id="dialog-description" className="text-sm text-gray-600 mt-2">{description}</p>
        </div>
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isLoading}
            aria-label={cancelText}
          >
            {cancelText}
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
            aria-busy={isLoading}
            aria-label={isLoading ? 'Processing...' : confirmText}
            className={variant === 'destructive' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
          >
            {isLoading ? 'Processing...' : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Form Validation
// ─────────────────────────────────────────────
interface FormErrors {
  name?: string;
  description?: string;
  price?: string;
  original_price?: string;
  stock_quantity?: string;
}

function validateForm(formData: any): FormErrors {
  const errors: FormErrors = {};

  // Name validation
  if (!formData.name || formData.name.trim() === '') {
    errors.name = 'Product name is required';
  } else if (formData.name.length < 3) {
    errors.name = 'Product name must be at least 3 characters';
  } else if (formData.name.length > 255) {
    errors.name = 'Product name must not exceed 255 characters';
  }

  // Description validation
  if (!formData.description || formData.description.trim() === '') {
    errors.description = 'Description is required';
  } else if (formData.description.length < 10) {
    errors.description = 'Description must be at least 10 characters';
  } else if (formData.description.length > 5000) {
    errors.description = 'Description must not exceed 5000 characters';
  }

  // Price validation
  const price = parseFloat(formData.price);
  if (!formData.price || formData.price === '') {
    errors.price = 'Price is required';
  } else if (isNaN(price)) {
    errors.price = 'Price must be a valid number';
  } else if (price <= 0) {
    errors.price = 'Price must be greater than 0';
  } else if (price > 999999999) {
    errors.price = 'Price must not exceed 999,999,999';
  }

  // Original price validation (optional)
  if (formData.original_price && formData.original_price !== '') {
    const originalPrice = parseFloat(formData.original_price);
    if (isNaN(originalPrice)) {
      errors.original_price = 'Original price must be a valid number';
    } else if (originalPrice <= price) {
      errors.original_price = 'Original price must be greater than sale price';
    } else if (originalPrice > 999999999) {
      errors.original_price = 'Original price must not exceed 999,999,999';
    }
  }

  // Stock quantity validation
  const stock = parseInt(formData.stock_quantity);
  if (isNaN(stock) || stock < 0) {
    errors.stock_quantity = 'Stock quantity must be 0 or greater';
  } else if (stock > 999999) {
    errors.stock_quantity = 'Stock quantity must not exceed 999,999';
  }

  return errors;
}

// ─────────────────────────────────────────────
// Product Dialog — shared View + Edit in one modal
// ─────────────────────────────────────────────
function ProductDialog({
  product,
  onClose,
  onSave,
  mode: initialMode,
}: {
  product: any;
  onClose: () => void;
  onSave: (updated: any) => void;
  mode: 'view' | 'edit';
}) {
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
  const [form, setForm] = useState({
    name: product.name || '',
    description: product.description || '',
    price: product.price || '',
    original_price: product.original_price || '',
    stock_quantity: product.stock_quantity || 0,
    category_name: product.category?.name || product.category_name || '',
  });
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [newImages, setNewImages] = useState<File[]>([]);
  const [currentImage, setCurrentImage] = useState(0);
  const images = product.images || [];
  const statusBadge = getProductStatusBadge(product.status);

  // Validate form validity
  const isFormValid = Object.keys(validateForm(form)).length === 0;

  const handleChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear this field's error when user starts correcting it
    if (formErrors[field as keyof FormErrors]) {
      setFormErrors((prev) => {
        const updated = { ...prev };
        delete updated[field as keyof FormErrors];
        return updated;
      });
    }
  };

  const handleFieldBlur = (field: string) => {
    // Validate field on blur
    const fieldErrors = validateForm(form);
    if (fieldErrors[field as keyof FormErrors]) {
      setFormErrors((prev) => ({
        ...prev,
        [field]: fieldErrors[field as keyof FormErrors],
      }));
    }
  };

  const handleSave = async () => {
    // Validate entire form before saving
    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    // Clear errors if validation passed
    setFormErrors({});

    setSaving(true);
    try {
      await onSave({ ...product, ...form, __newImages: newImages });
      setMode('view');
      setNewImages([]);
    } finally {
      setSaving(false);
    }
  };

  const handleImagesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const MAX_IMAGES = 5;
    
    // Check max images limit
    if (newImages.length + selectedFiles.length > MAX_IMAGES) {
      toast.error(`Maximum ${MAX_IMAGES} images allowed per product. You can upload ${MAX_IMAGES - newImages.length} more.`);
      return;
    }
    
    // Validate each file
    const validFiles = selectedFiles.filter((file) => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds 5MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
        return false;
      }
      return true;
    });
    
    if (validFiles.length > 0) {
      setNewImages((prev) => [...prev, ...validFiles]);
    }
    event.target.value = '';
  };

  const handleRemoveNewImage = (indexToRemove: number) => {
    setNewImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleEscape = useCallback(() => {
    if (!saving) {
      onClose();
    }
  }, [saving, onClose]);

  useKeyboardEscape(handleEscape);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="presentation"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-dialog-title"
        aria-describedby="product-dialog-description"
      >

        {/* Dialog Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Package size={16} className="text-white" />
            </div>
            <div>
              <h2 id="product-dialog-title" className="font-semibold text-gray-900 text-sm">
                {mode === 'edit' ? 'Edit Product' : 'Product Details'}
              </h2>
              <p id="product-dialog-description" className="text-xs text-gray-400">
                {mode === 'edit' ? 'Update product information' : 'View product information'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {mode === 'view' ? (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5"
                onClick={() => setMode('edit')}
                aria-label="Edit product"
              >
                <Edit size={12} /> Edit
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-gray-500"
                onClick={() => setMode('view')}
                aria-label="Cancel editing"
              >
                Cancel
              </Button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
              aria-label="Close product dialog"
            >
              <X size={16} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1">

          {/* Image Gallery */}
          {images.length > 0 ? (
            <div className="relative bg-gray-50 h-52 flex items-center justify-center overflow-hidden">
              <img
                src={getDialogImageUrl(images[currentImage])}
                alt={product.name}
                width={416}
                height={208}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                }}
                className="h-full w-full object-contain"
              />
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentImage((p) => (p - 1 + images.length) % images.length)}
                    className="absolute left-3 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center hover:bg-gray-100 transition"
                    aria-label={`Previous image, showing image ${currentImage + 1} of ${images.length}`}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => setCurrentImage((p) => (p + 1) % images.length)}
                    className="absolute right-3 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center hover:bg-gray-100 transition"
                    aria-label={`Next image, showing image ${currentImage + 1} of ${images.length}`}
                  >
                    <ChevronRight size={14} />
                  </button>
                  <div className="absolute bottom-3 flex gap-1.5" role="group" aria-label="Image thumbnails">
                    {images.map((_: any, i: number) => (
                      <button
                        key={i}
                        onClick={() => setCurrentImage(i)}
                        className={`w-1.5 h-1.5 rounded-full transition-colors ${i === currentImage ? 'bg-gray-800' : 'bg-gray-300'
                          }`}
                        aria-label={`Show image ${i + 1} of ${images.length}`}
                        aria-current={i === currentImage ? 'true' : undefined}
                      />
                    ))}
                  </div>
                </>
              )}
              <div className="absolute top-3 right-3">
                <Badge className={statusBadge.color} aria-label={`Status: ${statusBadge.label}`}>{statusBadge.label}</Badge>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 h-36 flex flex-col items-center justify-center gap-2">
              <ImageIcon size={28} className="text-gray-300" />
              <span className="text-xs text-gray-400">No images uploaded</span>
            </div>
          )}

          {/* Fields */}
          <div className="p-6 space-y-5">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">Product Name</label>
              {mode === 'edit' ? (
                <>
                  <input
                    id="product-name-input"
                    value={form.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    onBlur={() => handleFieldBlur('name')}
                    className={`w-full border rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:border-transparent ${
                      formErrors.name
                        ? 'border-red-300 focus:ring-red-500'
                        : 'border-gray-200 focus:ring-primary'
                    }`}
                    placeholder="Enter product name (3-255 characters)"
                    aria-label="Product name"
                    aria-describedby={formErrors.name ? 'product-name-error' : 'product-name-help'}
                    aria-invalid={!!formErrors.name}
                  />
                  {formErrors.name && (
                    <p id="product-name-error" className="text-xs text-red-600 mt-1 flex items-center gap-1" role="alert">
                      <AlertCircle size={12} /> {formErrors.name}
                    </p>
                  )}
                  <p id="product-name-help" className="text-xs text-gray-400 mt-1">{form.name.length}/255 characters</p>
                </>
              ) : (
                <p className="text-sm font-medium text-gray-800">{form.name}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">Description</label>
              {mode === 'edit' ? (
                <>
                  <textarea
                    id="product-description-input"
                    value={form.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    onBlur={() => handleFieldBlur('description')}
                    rows={3}
                    className={`w-full border rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:border-transparent resize-none ${
                      formErrors.description
                        ? 'border-red-300 focus:ring-red-500'
                        : 'border-gray-200 focus:ring-primary'
                    }`}
                    placeholder="Enter detailed product description (10-5000 characters)"
                    aria-label="Product description"
                    aria-describedby={formErrors.description ? 'product-description-error' : 'product-description-help'}
                    aria-invalid={!!formErrors.description}
                  />
                  {formErrors.description && (
                    <p id="product-description-error" className="text-xs text-red-600 mt-1 flex items-center gap-1" role="alert">
                      <AlertCircle size={12} /> {formErrors.description}
                    </p>
                  )}
                  <p id="product-description-help" className="text-xs text-gray-400 mt-1">{form.description.length}/5000 characters</p>
                </>
              ) : (
                <p className="text-sm text-gray-600 leading-relaxed">{form.description}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">Sale Price (AFN)</label>
                {mode === 'edit' ? (
                  <>
                    <input
                      id="product-price-input"
                      type="number"
                      value={form.price}
                      onChange={(e) => handleChange('price', e.target.value)}
                      onBlur={() => handleFieldBlur('price')}
                      className={`w-full border rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:border-transparent ${
                        formErrors.price
                          ? 'border-red-300 focus:ring-red-500'
                          : 'border-gray-200 focus:ring-primary'
                      }`}
                      placeholder="0"
                      min="0"
                      max="999999999"
                      aria-label="Sale price"
                      aria-describedby={formErrors.price ? 'product-price-error' : undefined}
                      aria-invalid={!!formErrors.price}
                    />
                    {formErrors.price && (
                      <p id="product-price-error" className="text-xs text-red-600 mt-1 flex items-center gap-1" role="alert">
                        <AlertCircle size={12} /> {formErrors.price}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm font-semibold text-gray-800">
                    AFN {parseFloat(form.price).toLocaleString()}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">Original Price (AFN)</label>
                {mode === 'edit' ? (
                  <>
                    <input
                      id="product-original-price-input"
                      type="number"
                      value={form.original_price}
                      onChange={(e) => handleChange('original_price', e.target.value)}
                      onBlur={() => handleFieldBlur('original_price')}
                      className={`w-full border rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:border-transparent ${
                        formErrors.original_price
                          ? 'border-red-300 focus:ring-red-500'
                          : 'border-gray-200 focus:ring-primary'
                      }`}
                      placeholder="Optional - leave blank if no discount"
                      aria-label="Original price"
                      aria-describedby={formErrors.original_price ? 'product-original-price-error' : undefined}
                      aria-invalid={!!formErrors.original_price}
                      min="0"
                      max="999999999"
                    />
                    {formErrors.original_price && (
                      <p id="product-original-price-error" className="text-xs text-red-600 mt-1 flex items-center gap-1" role="alert">
                        <AlertCircle size={12} /> {formErrors.original_price}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500 line-through">
                    {form.original_price ? `AFN ${parseFloat(form.original_price).toLocaleString()}` : '—'}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="product-stock-input" className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">Stock Quantity</label>
                {mode === 'edit' ? (
                  <>
                    <input
                      id="product-stock-input"
                      type="number"
                      value={form.stock_quantity}
                      onChange={(e) => handleChange('stock_quantity', parseInt(e.target.value) || 0)}
                      onBlur={() => handleFieldBlur('stock_quantity')}
                      className={`w-full border rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:border-transparent ${
                        formErrors.stock_quantity
                          ? 'border-red-300 focus:ring-red-500'
                          : 'border-gray-200 focus:ring-primary'
                      }`}
                      placeholder="0"
                      min="0"
                      max="999999"
                      aria-label="Stock quantity"
                      aria-describedby={formErrors.stock_quantity ? 'product-stock-error' : undefined}
                      aria-invalid={!!formErrors.stock_quantity}
                    />
                    {formErrors.stock_quantity && (
                      <p id="product-stock-error" className="text-xs text-red-600 mt-1 flex items-center gap-1" role="alert">
                        <AlertCircle size={12} /> {formErrors.stock_quantity}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${form.stock_quantity > 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {form.stock_quantity > 0 ? form.stock_quantity : 'Out of Stock'}
                    </span>
                    {form.stock_quantity > 0 && <span className="text-xs text-gray-400">units</span>}
                  </div>
                )}
              </div>
              <div>
                <label htmlFor="product-category-input" className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">Category</label>
                {mode === 'edit' ? (
                  <input
                    id="product-category-input"
                    value={form.category_name}
                    onChange={(e) => handleChange('category_name', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    aria-label="Product category"
                  />
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Tag size={12} className="text-gray-400" />
                    <span className="text-sm text-gray-700">{form.category_name || 'Uncategorized'}</span>
                  </div>
                )}
              </div>
            </div>

            {mode === 'edit' && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">Product Images</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImagesChange}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Add new images here. Product images are managed only in Create and Edit.
                  <br />
                  <strong>Max 5 MB per image, up to 5 images total.</strong>
                </p>
                {newImages.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {newImages.map((file, idx) => (
                      <div key={`${file.name}-${idx}`} className="flex items-center justify-between text-sm text-gray-700 bg-gray-50 rounded-md px-3 py-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="truncate">{file.name}</span>
                          <span className="text-xs text-gray-500 flex-shrink-0">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveNewImage(idx)}
                          className="text-red-600 hover:text-red-700 flex-shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Dialog Footer — edit mode only */}
        {mode === 'edit' && (
          <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center bg-gray-50/60">
            <div className="text-xs text-gray-500">
              {Object.keys(formErrors).length > 0 && (
                <p className="flex items-center gap-1 text-red-600">
                  <AlertCircle size={14} /> {Object.keys(formErrors).length} validation error(s)
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setMode('view')}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={saving || !isFormValid}>
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main VendorDashboard
// ─────────────────────────────────────────────
export function VendorDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const validTabs = ['overview', 'products', 'orders', 'earnings'] as const;
  type DashboardTab = (typeof validTabs)[number];
  const isValidTab = (tab: string | null): tab is (typeof validTabs)[number] =>
    !!tab && validTabs.includes(tab as (typeof validTabs)[number]);
  const tabParam = searchParams.get('tab');
  const headerSearchParam = searchParams.get('q') || '';
  const activeTab: DashboardTab = isValidTab(tabParam)
    ? tabParam
    : 'overview';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Dialog state
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit'>('view');

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'default' | 'destructive';
    isLoading?: boolean;
    onConfirm?: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
  });

  // Retry state
  const [_isRetrying, _setIsRetrying] = useState<string | null>(null);

  // Auto-refresh state
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<30000 | 60000>(30000); // 30 seconds default
  const [refreshing, setRefreshing] = useState(false);

  // Search state with debounce
  const [productSearchInput, setProductSearchInput] = useState('');
  const productSearch = useDebounce(productSearchInput, 300);
  const [isSearching, setIsSearching] = useState(false);

  // Dashboard data state
  const [vendorInfo, setVendorInfo] = useState<any>(null);
  const [stats, setStats] = useState({
    total_products: 0,
    active_products: 0,
    total_sales: 0,
    total_paid: 0,
    total_pending: 0,
  });
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [productStatusFilter, setProductStatusFilter] = useState('all');
  
  // Pagination state
  const [paginationPage, setPaginationPage] = useState(1);
  const [paginationPageSize, setPaginationPageSize] = useState(25);
  const [paginationTotal, setPaginationTotal] = useState(0);
  const [orders, setOrders] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any>({ summary: null, payouts: [] });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [payoutsLoaded, setPayoutsLoaded] = useState(false); // Lazy load earnings tab

  // ── Data fetching ──────────────────────────
  useEffect(() => { fetchDashboardData(); }, []);

  const handleTabChange = (tab: string) => {
    if (isValidTab(tab) && tab !== activeTab) {
      setSearchParams({ tab }, { replace: true });
    }
  };

  // Debounce feedback
  useEffect(() => {
    if (productSearchInput === '') {
      setIsSearching(false);
    } else if (productSearchInput !== productSearch) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
    }
  }, [productSearchInput, productSearch]);

  // Sync vendor header quick-search query into products tab search field.
  useEffect(() => {
    if (activeTab !== 'products') return;
    if (headerSearchParam === productSearchInput) return;
    setProductSearchInput(headerSearchParam);
  }, [activeTab, headerSearchParam, productSearchInput]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      // Try to use cached dashboard data
      let dashboardData = getCachedData('dashboard');
      if (!dashboardData) {
        dashboardData = await getVendorDashboard();
        setCachedData('dashboard', dashboardData);
      }
      setVendorInfo(dashboardData.vendor);
      setStats(dashboardData.stats);
      setRecentOrders(dashboardData.recent_orders || []);
    } catch (err: any) {
      debugError('Error fetching dashboard data:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setProductsLoading(true);
      setProductsError(null);
      // Cache products by page
      const cacheKey = `products_page_${paginationPage}_size_${paginationPageSize}`;
      let productsData = getCachedData(cacheKey);
      if (!productsData) {
        productsData = await getVendorProducts({ page: paginationPage, page_size: paginationPageSize });
        setCachedData(cacheKey, productsData);
      }
      setProducts(productsData.results);
      setPaginationTotal(productsData.count || 0);
    } catch (err: any) {
      debugError('Error fetching products:', err);
      setProductsError(err?.response?.data?.error || 'Failed to load products');
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      // Try cached orders first
      let ordersData = getCachedData('orders');
      if (!ordersData) {
        ordersData = await getVendorOrders({ page: 1 });
        setCachedData('orders', ordersData);
      }
      setOrders(Array.isArray(ordersData) ? ordersData : ordersData.results || []);
    } catch (err) { debugError('Error fetching orders:', err); }
  };

  const fetchPayouts = async () => {
    try {
      // Try cached payouts first
      let payoutsData = getCachedData('payouts');
      if (!payoutsData) {
        payoutsData = await getVendorPayouts();
        setCachedData('payouts', payoutsData);
      }
      setPayouts(payoutsData);
      setPayoutsLoaded(true); // Mark as loaded
    } catch (err) { debugError('Error fetching payouts:', err); }
  };

  useEffect(() => {
    if (activeTab === 'products') {
      setPaginationPage(1);
      fetchProducts();
    } else if (activeTab === 'orders' && orders.length === 0) fetchOrders();
    else if (activeTab === 'earnings' && !payoutsLoaded) fetchPayouts(); // Lazy load earnings only once
  }, [activeTab]);

  // Fetch products when pagination changes
  useEffect(() => {
    if (activeTab === 'products' && (paginationPage > 1 || paginationPageSize !== 25)) {
      fetchProducts();
    }
  }, [paginationPage, paginationPageSize]);

  // Auto-refresh effect based on active tab
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const refreshCallback = async () => {
      setRefreshing(true);
      try {
        if (activeTab === 'overview') {
          await fetchDashboardData();
        } else if (activeTab === 'products') {
          await fetchProducts();
        } else if (activeTab === 'orders') {
          await fetchOrders();
        } else if (activeTab === 'earnings') {
          await fetchPayouts();
        }
      } catch (err) {
        debugLog('Auto-refresh skipped due to error');
      } finally {
        setRefreshing(false);
        setLastRefresh(Date.now());
      }
    };

    const timer = setInterval(refreshCallback, refreshInterval);
    return () => clearInterval(timer);
  }, [activeTab, autoRefreshEnabled, refreshInterval, fetchDashboardData, fetchProducts, fetchOrders, fetchPayouts]);

  // ── Actions ────────────────────────────────
  const handleConfirmOrder = useCallback(async (orderId: string) => {
    try {
      setActionLoading(orderId);
      await confirmOrder(orderId);
      await fetchOrders();
      await fetchDashboardData();
      toast.success('Order confirmed successfully');
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Failed to confirm order'));
    } finally {
      setActionLoading(null);
    }
  }, []);

  /**
   * Toggles product between 'approved' ↔ 'inactive'.
   * Only available for products already in one of those two states.
   */
  const handleToggleProduct = useCallback(async (product: any) => {
    // Verify ownership before toggling
    if (vendorInfo?.id && !verifyProductOwnership(product, vendorInfo.id)) {
      logSecurityEvent('UNAUTHORIZED_TOGGLE_ATTEMPT', { productId: product.id, vendorId: vendorInfo.id });
      toast.error('You do not have permission to modify this product');
      return;
    }

    const newStatus = product.status?.toLowerCase() === 'approved' ? 'Deactivate' : 'Activate';
    const description = product.status?.toLowerCase() === 'approved'
      ? `This will deactivate "${product.name}" and it will no longer be visible to customers.`
      : `This will activate "${product.name}" and make it visible to customers.`;

    setConfirmDialog({
      isOpen: true,
      title: `${newStatus} Product`,
      description,
      confirmText: newStatus,
      cancelText: 'Keep as is',
      variant: 'default',
      isLoading: false,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isLoading: true }));
        const productId = product.id;
        const identifier = product.id;
        
        // Store original state for optimistic revert
        const originalProducts = products;
        const originalStats = { ...stats };
        
        try {
          setActionLoading(productId);
          
          // Compute new status optimistically
          const optimisticStatus = product.status?.toLowerCase() === 'approved' ? 'Inactive' : 'Approved';
          
          // Optimistically update UI immediately
          setProducts((prev) =>
            prev.map((p) =>
              p.id === productId ? { ...p, status: optimisticStatus } : p
            )
          );
          
          // Update stats optimistically
          if (optimisticStatus.toLowerCase() === 'approved') {
            setStats((prev) => ({ ...prev, active_products: prev.active_products + 1 }));
          } else {
            setStats((prev) => ({ ...prev, active_products: Math.max(0, prev.active_products - 1) }));
          }

          // Now call the API
          const updatedProduct = await retryableApiCall(
            () => toggleProductActive(identifier, product.slug),
            { maxRetries: 3 }
          );

          // Verify and update with actual API response
          setProducts((prev) =>
            prev.map((p) =>
              p.id === productId ? { ...p, ...updatedProduct } : p
            )
          );
          await fetchDashboardData();
          logSecurityEvent('PRODUCT_STATUS_CHANGED', { productId: product.id, newStatus: updatedProduct?.status });
          toast.success('Product status updated successfully');
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          // Revert to original state on failure
          setProducts(originalProducts);
          setStats(originalStats);
          toast.error(getApiErrorMessage(err, 'Failed to toggle product status. Please try again.'));
        } finally {
          setActionLoading(null);
          setConfirmDialog((prev) => ({ ...prev, isLoading: false }));
        }
      },
    });
  }, [vendorInfo?.id, products, stats]);

  const handleDeleteProduct = useCallback(async (product: any) => {
    // Verify ownership before deleting
    if (vendorInfo?.id && !verifyProductOwnership(product, vendorInfo.id)) {
      logSecurityEvent('UNAUTHORIZED_DELETE_ATTEMPT', { productId: product.id, vendorId: vendorInfo.id });
      toast.error('You do not have permission to delete this product');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Product',
      description: `Are you sure you want to delete "${product.name}"? This action cannot be undone and all product data will be permanently removed.`,
      confirmText: 'Delete permanently',
      cancelText: 'Keep product',
      variant: 'destructive',
      isLoading: false,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isLoading: true }));
        const loadingKey = `delete-${product.id}`;
        
        // Store original state for optimistic revert
        const originalProducts = products;
        const originalStats = { ...stats };
        
        try {
          setActionLoading(loadingKey);

          // Optimistically remove from UI immediately
          setProducts((prev) => prev.filter((p) => p.id !== product.id));
          
          // Optimistically update stats
          setStats((prev) => ({
            ...prev,
            total_products: Math.max(0, prev.total_products - 1),
            active_products: product.status?.toLowerCase() === 'approved' 
              ? Math.max(0, prev.active_products - 1) 
              : prev.active_products,
          }));

          // Now call the API
          await retryableApiCall(
            () => deleteProduct(product.id, product.slug),
            { maxRetries: 3 }
          );

          await fetchDashboardData();
          logSecurityEvent('PRODUCT_DELETED', { productId: product.id, productName: product.name });
          toast.success('Product deleted successfully');
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          // Revert to original state on failure
          setProducts(originalProducts);
          setStats(originalStats);
          toast.error(getApiErrorMessage(err, 'Failed to delete product. Please try again.'));
        } finally {
          setActionLoading(null);
          setConfirmDialog((prev) => ({ ...prev, isLoading: false }));
        }
      },
    });
  }, [vendorInfo?.id, products, stats]);

  const openProductDialog = (product: any, mode: 'view' | 'edit') => {
    // Verify ownership before opening dialog for edit mode
    if (mode === 'edit' && vendorInfo?.id) {
      if (!verifyProductOwnership(product, vendorInfo.id)) {
        logSecurityEvent('UNAUTHORIZED_EDIT_ATTEMPT', { productId: product.id, vendorId: vendorInfo.id });
        toast.error('You do not have permission to edit this product');
        return;
      }
    }
    setSelectedProduct(product);
    setDialogMode(mode);
  };
  const closeProductDialog = () => setSelectedProduct(null);

  const handleProductSave = async (updated: any) => {
    // Verify ownership before saving
    if (vendorInfo?.id && !verifyProductOwnership(updated, vendorInfo.id)) {
      logSecurityEvent('UNAUTHORIZED_UPDATE_ATTEMPT', { productId: updated.id, vendorId: vendorInfo.id });
      toast.error('You do not have permission to update this product');
      closeProductDialog();
      return;
    }

    const identifier = updated.id;

    // Sanitize inputs
    const payload = {
      name: sanitizeInput(updated.name),
      description: sanitizeInput(updated.description),
      price: Number(updated.price),
      original_price: updated.original_price ? Number(updated.original_price) : null,
      stock_quantity: Number(updated.stock_quantity),
      category_name: sanitizeInput(updated.category_name),
    };

    try {
      const savedProduct = await updateProduct(identifier, { ...payload, slug: updated.slug });

      if (updated.__newImages && Array.isArray(updated.__newImages) && updated.__newImages.length > 0) {
        await uploadProductImages(identifier, updated.__newImages, updated.slug);
      }

      if (!savedProduct) {
        throw new Error('Empty response from product update API');
      }

      setProducts((prev) => prev.map((p) => (p.id === savedProduct.id ? { ...p, ...savedProduct } : p)));
      setSelectedProduct(savedProduct);
      await fetchProducts();
      await fetchDashboardData();
      logSecurityEvent('PRODUCT_UPDATED', { productId: updated.id, fields: Object.keys(payload) });
      toast.success('Product updated successfully');
      closeProductDialog();
    } catch (err: any) {
      const apiError = err?.response?.data;
      if (apiError && typeof apiError === 'object') {
        const firstKey = Object.keys(apiError)[0];
        const firstError = Array.isArray(apiError[firstKey]) ? apiError[firstKey][0] : apiError[firstKey];
        toast.error(firstError || 'Failed to update product');
      } else {
        toast.error(err?.message || 'Failed to update product');
      }
      return;
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((product: any) => {
      const matchesSearch = !productSearch.trim()
        || product.name?.toLowerCase().includes(productSearch.toLowerCase())
        || (product.category?.name || product.category_name || '').toLowerCase().includes(productSearch.toLowerCase());

      const matchesStatus = productStatusFilter === 'all'
        || (product.status || '').toLowerCase() === productStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [products, productSearch, productStatusFilter]);

  // ── Status helpers ─────────────────────────
  const getOrderStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'confirmed': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'processing': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'picked':
      case 'shipped': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'delivered': return 'bg-green-100 text-green-700 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  }, []);

  // Only 'approved' or 'inactive' products show the toggle button
  const canToggleProduct = useCallback((status: string) =>
    status?.toLowerCase() === 'approved' || status?.toLowerCase() === 'inactive',
  []);

  const getToggleButtonText = useCallback((status: string) => {
    if (status?.toLowerCase() === 'approved') return 'Deactivate';
    if (status?.toLowerCase() === 'inactive') return 'Activate';
    return 'Toggle';
  }, []);

  const pendingCount = useMemo(() => 
    recentOrders.filter((o: any) => o.status === 'pending').length,
  [recentOrders]);

  // ── Loading state ──────────────────────────
  if (loading) {
    return (
      <Layout
        variant="vendor"
        storeName={vendorInfo?.shop_name}
      >
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-primary animate-pulse" />
            <p className="text-lg text-gray-600">Loading your dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // ── Error state ────────────────────────────
  if (error) {
    return (
      <Layout
        variant="vendor"
        storeName={vendorInfo?.shop_name}
      >
        <div className="flex items-center justify-center min-h-screen">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold mb-2">Error Loading Dashboard</div>
              <div className="mb-4">{error}</div>
              <Button onClick={() => fetchDashboardData()} variant="outline">
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  // ── Main render ────────────────────────────
  return (
    <Layout
      variant="vendor"
      storeName={vendorInfo?.shop_name}
    >
      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        variant={confirmDialog.variant as 'default' | 'destructive'}
        isLoading={confirmDialog.isLoading}
        onConfirm={() => confirmDialog.onConfirm?.()}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Product dialog — shared view + edit */}
      {selectedProduct && (
        <ProductDialog
          product={selectedProduct}
          mode={dialogMode}
          onClose={closeProductDialog}
          onSave={handleProductSave}
        />
      )}

      <div className="p-6 space-y-6">

        {/* ── Welcome Banner ── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-800 text-white shadow-2xl">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full -ml-36 -mb-36" />
          
          <div className="relative p-8 flex items-center justify-between">
            <div className="flex-1">
              <div className="inline-block mb-3">
                <span className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-medium text-emerald-50">
                  <div className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                  Store Active
                </span>
              </div>
              <h1 className="text-4xl font-bold mb-2">
                Welcome back, {vendorInfo?.shop_name}!
              </h1>
              <p className="text-emerald-100 mb-4 text-lg">
                Here's an overview of your store performance today
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                    <span className="text-emerald-300">✓</span>
                  </div>
                  <span className="text-emerald-100">{stats.active_products} active products</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                    <span className="text-emerald-300">✓</span>
                  </div>
                  <span className="text-emerald-100">{recentOrders.length} recent orders</span>
                </div>
              </div>
            </div>
            <div className="hidden md:block ml-8">
              <div className="w-24 h-24 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20">
                <Package className="w-12 h-12 text-emerald-200" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="products">
              Products
              {products.length > 0 && (
                <Badge variant="secondary" className="ml-2">{products.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="orders">
              Orders
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-2">{pendingCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
          </TabsList>

          {/* ── Refresh Controls ── */}
          <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    id="auto-refresh-checkbox"
                    type="checkbox"
                    checked={autoRefreshEnabled}
                    onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary cursor-pointer"
                    aria-label="Enable automatic data refresh"
                  />
                  <span className="text-sm font-medium text-gray-700">Auto-refresh</span>
                </label>
              </div>
              
              {autoRefreshEnabled && (
                <select
                  id="refresh-interval-select"
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(parseInt(e.target.value) as 30000 | 60000)}
                  className="text-sm border border-gray-200 rounded px-2 py-1 text-gray-700 bg-white"
                  aria-label="Select refresh interval"
                >
                  <option value={30000}>Every 30s</option>
                  <option value={60000}>Every 60s</option>
                </select>
              )}

              <span className="text-xs text-gray-500" role="status" aria-live="polite" aria-atomic="true">
                Last updated: {getTimeSince(lastRefresh)}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                setRefreshing(true);
                try {
                  if (activeTab === 'overview') await fetchDashboardData();
                  else if (activeTab === 'products') await fetchProducts();
                  else if (activeTab === 'orders') await fetchOrders();
                  else if (activeTab === 'earnings') await fetchPayouts();
                  setLastRefresh(Date.now());
                  toast.success('Data refreshed');
                } catch (err) {
                  toast.error('Failed to refresh');
                } finally {
                  setRefreshing(false);
                }
              }}
              disabled={refreshing}
              aria-label={refreshing ? 'Refreshing data...' : 'Refresh data now'}
              aria-busy={refreshing}
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh now'}
            </Button>
          </div>

          {/* ════════════ OVERVIEW ════════════ */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div
              className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
              aria-busy={loading}
              aria-label="Dashboard statistics cards"
              role="region"
            >
              {loading ? (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              ) : (
                <>
                  {/* Total Products Card - Professional Green Theme */}
                  <div className="group relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-6 shadow-sm hover:shadow-lg transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Total Products</p>
                        <div className="mt-3 flex items-baseline gap-2">
                          <p className="text-4xl font-bold text-emerald-900">{stats.total_products}</p>
                          <span className="text-xs text-emerald-600 font-medium">items</span>
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <p className="text-xs text-emerald-700">{stats.active_products} active • {stats.total_products - stats.active_products} inactive</p>
                        </div>
                      </div>
                      <div className="rounded-xl bg-emerald-200/30 p-3 ring-1 ring-emerald-200">
                        <Package className="w-8 h-8 text-emerald-600" />
                      </div>
                    </div>
                  </div>

                  {/* Recent Orders Card - Professional Blue Theme */}
                  <div className="group relative overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 shadow-sm hover:shadow-lg transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Recent Orders</p>
                        <div className="mt-3 flex items-baseline gap-2">
                          <p className="text-4xl font-bold text-blue-900">{recentOrders.length}</p>
                          <span className="text-xs text-blue-600 font-medium">orders</span>
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                          {pendingCount > 0 && (
                            <>
                              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                              <p className="text-xs text-amber-700 font-medium">{pendingCount} pending action</p>
                            </>
                          )}
                          {pendingCount === 0 && (
                            <>
                              <div className="w-2 h-2 rounded-full bg-blue-500" />
                              <p className="text-xs text-blue-700">All caught up!</p>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="rounded-xl bg-blue-200/30 p-3 ring-1 ring-blue-200">
                        <ShoppingBag className="w-8 h-8 text-blue-600" />
                      </div>
                    </div>
                  </div>

                  {/* Total Sales Card - Professional Purple Theme */}
                  <div className="group relative overflow-hidden rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50 p-6 shadow-sm hover:shadow-lg transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-purple-700 uppercase tracking-wider">Total Sales</p>
                        <div className="mt-3 flex items-baseline gap-2">
                          <p className="text-3xl font-bold text-purple-900">
                            AFN {parseFloat(stats.total_sales as any || '0').toLocaleString()}
                          </p>
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-purple-500" />
                          <p className="text-xs text-purple-700">Lifetime revenue</p>
                        </div>
                      </div>
                      <div className="rounded-xl bg-purple-200/30 p-3 ring-1 ring-purple-200">
                        <DollarSign className="w-8 h-8 text-purple-600" />
                      </div>
                    </div>
                  </div>

                  {/* Pending Payout Card - Professional Orange Theme */}
                  <div className="group relative overflow-hidden rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100/50 p-6 shadow-sm hover:shadow-lg transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-orange-700 uppercase tracking-wider">Pending Payout</p>
                        <div className="mt-3 flex items-baseline gap-2">
                          <p className="text-3xl font-bold text-orange-900">
                            AFN {parseFloat(stats.total_pending as any || '0').toLocaleString()}
                          </p>
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-orange-500" />
                          <p className="text-xs text-orange-700">Next settlement in 14 days</p>
                        </div>
                      </div>
                      <div className="rounded-xl bg-orange-200/30 p-3 ring-1 ring-orange-200">
                        <TrendingUp className="w-8 h-8 text-orange-600" />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Quick Actions */}
              <div className="lg:col-span-1">
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">Quick Actions</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Common tasks</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <button
                      onClick={() => navigate('/vendor/add-product')}
                      className="w-full group relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 p-3 text-white font-medium transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-105 active:scale-95"
                      aria-label="Navigate to add new product"
                    >
                      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative flex items-center justify-center gap-2">
                        <Plus className="w-4 h-4" />
                        <span>Add Product</span>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => handleTabChange('products')}
                      className="w-full group relative overflow-hidden rounded-xl border border-emerald-200 bg-white p-3 text-emerald-700 font-medium transition-all duration-300 hover:bg-emerald-50 hover:border-emerald-300 active:scale-95"
                      aria-label="View all products"
                    >
                      <div className="relative flex items-center justify-center gap-2">
                        <Package className="w-4 h-4" />
                        <span>View Products</span>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => handleTabChange('orders')}
                      className="w-full group relative overflow-hidden rounded-xl border border-blue-200 bg-white p-3 text-blue-700 font-medium transition-all duration-300 hover:bg-blue-50 hover:border-blue-300 active:scale-95"
                      aria-label="View and manage orders"
                    >
                      <div className="relative flex items-center justify-center gap-2">
                        <ShoppingBag className="w-4 h-4" />
                        <span>Manage Orders</span>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => handleTabChange('earnings')}
                      className="w-full group relative overflow-hidden rounded-xl border border-purple-200 bg-white p-3 text-purple-700 font-medium transition-all duration-300 hover:bg-purple-50 hover:border-purple-300 active:scale-95"
                      aria-label="View earnings and payouts"
                    >
                      <div className="relative flex items-center justify-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        <span>View Earnings</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Recent Orders */}
              <div className="lg:col-span-2">
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <ShoppingBag className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">Recent Orders</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Last 5 orders</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleTabChange('orders')} 
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      View All →
                    </button>
                  </div>
                  <div className="p-6">
                    {loading ? (
                      <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                          <SkeletonOrderCard key={i} />
                        ))}
                      </div>
                    ) : recentOrders.length > 0 ? (
                      <div className="space-y-3">
                        {recentOrders.slice(0, 5).map((order: any) => {
                          const orderStatusColor = getOrderStatusColor(order.status);
                          const statusBgClass = order.status === 'pending' ? 'bg-amber-50 border-amber-200' :
                                               order.status === 'completed' ? 'bg-emerald-50 border-emerald-200' :
                                               order.status === 'shipped' ? 'bg-blue-50 border-blue-200' :
                                               'bg-slate-50 border-slate-200';
                          return (
                            <div
                              key={order.id}
                              className={`flex items-start justify-between p-4 border rounded-xl transition-all duration-200 hover:shadow-md ${statusBgClass}`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-3">
                                  <div className="font-semibold text-slate-900">
                                    #{order.order_id || order.id.slice(0, 8).toUpperCase()}
                                  </div>
                                  <span className="text-xs text-slate-500">
                                    {new Date(order.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="text-sm text-slate-600 mt-1.5">
                                  <p className="font-medium">{order.customer?.full_name || order.customer_name || 'Guest'}</p>
                                  <p className="text-xs text-slate-500 mt-0.5">{order.items?.length || 0} item(s)</p>
                                </div>
                              </div>
                              <div className="text-right mr-4 ml-4 flex-shrink-0">
                                <div className="font-bold text-slate-900">
                                  AFN {parseFloat(order.total_amount).toLocaleString()}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <div className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${orderStatusColor}`}>
                                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                </div>
                                {order.status === 'pending' && (
                                  <button
                                    onClick={() => handleConfirmOrder(order.id)}
                                    disabled={actionLoading === order.id}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                    aria-label={`Confirm order ${order.id}`}
                                    aria-busy={actionLoading === order.id}
                                  >
                                    {actionLoading === order.id ? 'Confirming...' : 'Confirm'}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <ShoppingBag className="w-16 h-16 mx-auto text-slate-200 mb-4" />
                        <p className="text-slate-600 font-medium">No orders yet</p>
                        <p className="text-sm text-slate-500 mt-1">
                          Orders will appear here when customers make purchases
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ════════════ PRODUCTS ════════════ */}
          <TabsContent value="products" className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">My Products</h2>
                  <p className="text-gray-600 mt-1">Manage your product inventory</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={fetchProducts} disabled={productsLoading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${productsLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button onClick={() => navigate('/vendor/add-product')} size="lg">
                    <Plus className="w-4 h-4 mr-2" />Add New Product
                  </Button>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-3 mb-6">
                <div className="relative md:col-span-2">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                  <input
                    id="product-search-input"
                    value={productSearchInput}
                    onChange={(e) => setProductSearchInput(e.target.value)}
                    placeholder="Search by product name or category"
                    className="w-full border border-gray-300 rounded-lg pl-9 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    maxLength={100}
                    aria-label="Search products"
                    aria-describedby="product-search-help"
                    role="searchbox"
                  />
                  {productSearchInput && (
                    <button
                      onClick={() => setProductSearchInput('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      title="Clear search"
                      aria-label="Clear search input"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <div id="product-search-help" className="absolute right-3 bottom-0.5 text-xs text-gray-400 pointer-events-none translate-y-full mt-1">
                    {productSearchInput.length}/100{isSearching && (
                      <span className="ml-2 text-primary animate-pulse" aria-live="polite">searching...</span>
                    )}
                  </div>
                </div>
                <select
                  id="product-status-filter"
                  value={productStatusFilter}
                  onChange={(e) => setProductStatusFilter(e.target.value)}
                  aria-label="Filter by product status"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All Statuses</option>
                  <option value="approved">Approved</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                  <option value="draft">Draft</option>
                </select>
              </div>

              {/* Pagination info and page size selector */}
              <div className="flex items-center justify-between mb-6">
                <div className="text-sm text-gray-600">
                  {paginationTotal > 0 ? (
                    <>
                      Showing {((paginationPage - 1) * paginationPageSize) + 1}-{Math.min(paginationPage * paginationPageSize, paginationTotal)} of {paginationTotal} products
                    </>
                  ) : (
                    <>No products</>
                  )}
                </div>
                <select
                  value={paginationPageSize}
                  onChange={(e) => {
                    setPaginationPageSize(Number(e.target.value));
                    setPaginationPage(1);
                  }}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="10">10 per page</option>
                  <option value="25">25 per page</option>
                  <option value="50">50 per page</option>
                  <option value="100">100 per page</option>
                </select>
              </div>

              {productsError && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{productsError}</AlertDescription>
                </Alert>
              )}

              {productsLoading ? (
                <Table aria-busy="true" aria-label="Loading products table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(5)].map((_, i) => (
                      <SkeletonTableRow key={i} />
                    ))}
                  </TableBody>
                </Table>
              ) : filteredProducts.length === 0 && !loading ? (
                <div className="text-center py-12">
                  <Package className="w-20 h-20 mx-auto text-gray-300 mb-4" />
                  {products.length === 0 ? (
                    <>
                      <h3 className="text-xl font-semibold text-gray-700 mb-2">No Products Yet</h3>
                      <p className="text-gray-500 mb-6">Start by adding your first product to your store</p>
                      <Button onClick={() => navigate('/vendor/add-product')} size="lg">
                        <Plus className="w-4 h-4 mr-2" />Add Your First Product
                      </Button>
                    </>
                  ) : (
                    <>
                      <h3 className="text-xl font-semibold text-gray-700 mb-2">No Matching Products</h3>
                      <p className="text-gray-500 mb-6">Try changing search text or status filter</p>
                    </>
                  )}
                </div>
              ) : (
                <Table aria-label="Products list with details" role="grid">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product: any) => {
                      const statusBadge = getProductStatusBadge(product.status);
                      const hasProductImage = Boolean(product.primary_image) || (Array.isArray(product.images) && product.images.length > 0);
                      return (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                {hasProductImage ? (
                                  <img
                                    src={getProductDisplayImage(product)}
                                    alt={product.name}
                                    width={48}
                                    height={48}
                                    loading="lazy"
                                    onError={(e) => {
                                      e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                                    }}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon className="w-6 h-6 text-gray-400" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="font-medium">{product.name}</div>
                                <div className="text-sm text-gray-500">
                                  {product.description
                                    ? `${product.description.slice(0, 50)}${product.description.length > 50 ? '...' : ''}`
                                    : 'No description'}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {product.category?.name || product.category_name || 'Uncategorized'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold">
                              AFN {parseFloat(product.price).toLocaleString()}
                            </div>
                            {product.original_price && (
                              <div className="text-sm text-gray-500 line-through">
                                AFN {parseFloat(product.original_price).toLocaleString()}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                product.stock_quantity > 0
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : 'bg-red-50 text-red-700 border-red-200'
                              }
                            >
                              {product.stock_quantity > 0
                                ? `${product.stock_quantity} in stock`
                                : 'Out of Stock'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusBadge.color} aria-label={`Product status: ${statusBadge.label}`}>{statusBadge.label}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openProductDialog(product, 'view')}
                                title="View product details"
                                disabled={actionLoading === product.id}
                                aria-label={`View details for ${product.name}`}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openProductDialog(product, 'edit')}
                                title="Edit product"
                                disabled={actionLoading === product.id}
                                aria-label={`Edit product ${product.name}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>

                              {/* Toggle only shown for 'approved' or 'inactive' products */}
                              {canToggleProduct(product.status) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleToggleProduct(product)}
                                  disabled={actionLoading === product.id}
                                  aria-label={`${getToggleButtonText(product.status)} product ${product.name}`}
                                  aria-busy={actionLoading === product.id}
                                  data-loading={actionLoading === product.id}
                                >
                                  {actionLoading === product.id ? 'Updating...' : getToggleButtonText(product.status)}
                                </Button>
                              )}

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteProduct(product)}
                                disabled={actionLoading === `delete-${product.id}`}
                                aria-label={`Delete product ${product.name}`}
                                aria-busy={actionLoading === `delete-${product.id}`}
                                data-loading={actionLoading === `delete-${product.id}`}
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                title="Delete product"
                              >
                                {actionLoading === `delete-${product.id}` ? 'Deleting...' : <Trash2 className="w-4 h-4" />}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}

              {/* Pagination controls */}
              {!productsLoading && filteredProducts.length > 0 && (
                <Pagination
                  currentPage={paginationPage}
                  totalPages={Math.ceil(paginationTotal / paginationPageSize)}
                  onPageChange={setPaginationPage}
                  isLoading={productsLoading}
                />
              )}
            </Card>
          </TabsContent>

          {/* ════════════ ORDERS ════════════ */}
          <TabsContent value="orders" className="space-y-4">
            <Card className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold">Order Management</h2>
                <p className="text-gray-600 mt-1">Track and manage all your orders</p>
              </div>
              {orders.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag className="w-20 h-20 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No Orders Yet</h3>
                  <p className="text-gray-500">Orders from customers will appear here</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order: any) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          #{order.order_id || order.id.slice(0, 8).toUpperCase()}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {order.customer?.full_name || order.customer_name || 'Guest'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {order.customer?.phone || order.customer_phone}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{order.items?.length || 0} item(s)</Badge>
                        </TableCell>
                        <TableCell className="font-semibold">
                          AFN {parseFloat(order.total_amount).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge className={getOrderStatusColor(order.status)}>{order.status}</Badge>
                        </TableCell>
                        <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            {order.status === 'pending' && (
                              <Button
                                size="sm"
                                onClick={() => handleConfirmOrder(order.id)}
                                disabled={actionLoading === order.id}
                                aria-label={`Confirm order ${order.id}`}
                                aria-busy={actionLoading === order.id}
                              >
                                {actionLoading === order.id ? 'Confirming...' : 'Confirm'}
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/vendor/orders/${order.id}`)}
                              aria-label={`View details for order ${order.id}`}
                            >
                              <Eye className="w-4 h-4 mr-1" />View Details
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          {/* ════════════ EARNINGS ════════════ */}
          <TabsContent value="earnings" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-1">Earnings & Payouts</h2>
              <p className="text-gray-600 mb-6">Track your earnings and payout history</p>

              <div className="grid gap-4 md:grid-cols-3 mb-8">
                <div className="p-6 border rounded-lg bg-gradient-to-br from-green-50 to-green-100/50">
                  <div className="text-sm text-green-700 font-medium mb-2">Total Paid</div>
                  <div className="text-3xl font-bold text-green-900">
                    AFN {parseFloat(stats.total_paid as any || '0').toLocaleString()}
                  </div>
                  <div className="text-xs text-green-600 mt-1">All time earnings</div>
                </div>
                <div className="p-6 border rounded-lg bg-gradient-to-br from-yellow-50 to-yellow-100/50">
                  <div className="text-sm text-yellow-700 font-medium mb-2">Pending Payout</div>
                  <div className="text-3xl font-bold text-yellow-900">
                    AFN {parseFloat(stats.total_pending as any || '0').toLocaleString()}
                  </div>
                  <div className="text-xs text-yellow-600 mt-1">Awaiting settlement</div>
                </div>
                <div className="p-6 border rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50">
                  <div className="text-sm text-blue-700 font-medium mb-2">Total Sales</div>
                  <div className="text-3xl font-bold text-blue-900">
                    AFN {parseFloat(stats.total_sales as any || '0').toLocaleString()}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">Lifetime sales</div>
                </div>
              </div>

              <h3 className="text-lg font-semibold mb-4">Payout History</h3>

              {payouts.payouts && payouts.payouts.length > 0 ? (
                <div className="space-y-3">
                  {payouts.payouts.map((payout: any) => (
                    <div
                      key={payout.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="font-medium">
                          Payout #{payout.id.slice(0, 8).toUpperCase()}
                        </div>
                        <div className="text-sm text-gray-600">
                          {new Date(payout.period_start).toLocaleDateString()} -{' '}
                          {new Date(payout.period_end).toLocaleDateString()}
                        </div>
                        {payout.paid_at && (
                          <div className="text-xs text-green-600 mt-1">
                            Paid on {new Date(payout.paid_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <div className="text-right mr-4">
                        <div className="text-xl font-bold">
                          AFN {parseFloat(payout.amount).toLocaleString()}
                        </div>
                      </div>
                      <Badge className={getOrderStatusColor(payout.status)}>{payout.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border rounded-lg">
                  <DollarSign className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-600 font-medium">No payout history yet</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Payouts will appear here after your first settlement
                  </p>
                </div>
              )}

              <Alert className="mt-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Payout Information:</strong> Payouts are processed every 15 days. Contact
                  admin for specific payout schedule or questions about your earnings.
                </AlertDescription>
              </Alert>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
