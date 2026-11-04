import React, { useState, useEffect } from 'react';
import { Star, Loader2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { toast } from 'sonner';
import { productsAPI, Product as ProductType } from '@/services/productsAPI';
import api from '@/services/api';

interface Order {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
}

interface ReviewFormProps {
  product: ProductType;
  onReviewSubmitted?: (review: any) => void;
  onCancel?: () => void;
  existingReview?: any; // For edit mode
}

export const ReviewForm: React.FC<ReviewFormProps> = ({
  product,
  onReviewSubmitted,
  onCancel,
  existingReview,
}) => {
  const { t } = useTranslation();
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState(existingReview?.order?.id || '');
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [error, setError] = useState('');

  // Load user's delivered orders for this product
  useEffect(() => {
    loadOrders();
  }, [product.id]);

  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      // Fetch user's orders from the API
      const response = await api.get('/user/orders/');
      
      // Filter for delivered orders only and this product
      const deliveredOrders = (response.data.results || response.data).filter(
        (order: any) => order.status === 'delivered'
      );
      
      setOrders(deliveredOrders);
      
      // Auto-select first order if not in edit mode
      if (deliveredOrders.length > 0 && !existingReview) {
        setSelectedOrderId(deliveredOrders[0].id);
      }
    } catch (err) {
      console.error('Error loading orders:', err);
      setError(t('review_form_load_orders_error'));
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!rating) {
      toast.error(t('review_form_rating_required'));
      return;
    }
    
    if (comment.trim().length < 10) {
      toast.error(t('review_form_comment_required'));
      return;
    }
    
    if (!selectedOrderId) {
      toast.error(t('review_form_order_required'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      let result;
      
      if (existingReview) {
        // Update existing review
        result = await productsAPI.updateReview(existingReview.id, {
          rating,
          comment,
        });
        toast.success(t('review_form_update_success'));
      } else {
        // Create new review
        result = await productsAPI.createReview({
          product_id: product.id,
          order_id: selectedOrderId,
          rating,
          comment,
        });
        toast.success(t('review_form_submit_success'));
      }
      
      // Reset form
      setRating(0);
      setComment('');
      
      // Notify parent
      if (onReviewSubmitted) {
        onReviewSubmitted(result.data || result);
      }
      
    } catch (err: any) {
      const errorMsg = err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.detail ||
        (typeof err.response?.data === 'string' ? err.response.data : t('review_form_submit_error'));
      
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (loadingOrders) {
    return (
      <Card className="p-4 md:p-6 bg-white">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-teal-600 mr-2" />
          <p className="text-gray-600">Loading your orders...</p>
        </div>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card className="p-4 md:p-6 bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
        <div className="flex gap-3">
          <div className="flex-1">
            <h4 className="font-semibold text-orange-900 mb-1">Cannot Leave Review</h4>
            <p className="text-sm text-orange-800">
              You can only review products from delivered orders. Make sure you've purchased and received this product.
            </p>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-orange-600 hover:text-orange-700"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 md:p-6 bg-white">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-lg md:text-xl font-bold">
            {existingReview ? 'Edit Review' : 'Write a Review'}
          </h3>
          <p className="text-sm text-gray-600 mt-1">{product.name}</p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Rating Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('review_form_your_rating')}
          </label>
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setRating(i + 1)}
                onMouseEnter={() => setHoverRating(i + 1)}
                onMouseLeave={() => setHoverRating(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 ${
                    i < (hoverRating || rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-sm text-teal-600 mt-1">{t('review_form_rating_out_of', { rating })}</p>
          )}
        </div>

        {/* Order Selection (if multiple eligible orders) */}
        {orders.length > 1 && (
          <div>
            <label htmlFor="order-select" className="block text-sm font-medium text-gray-700 mb-2">
              {t('review_form_select_order')}
            </label>
            <select
              id="order-select"
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm"
            >
              <option value="">{t('review_form_select_order_placeholder')}</option>
              {orders.map((order) => (
                <option key={order.id} value={order.id}>
                  Order #{order.order_number} - {new Date(order.created_at).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Hidden select if only one order (auto-select it) */}
        {orders.length === 1 && (
          <div>
            <p className="text-sm text-gray-600">
              {t('review_form_order_label', {
                orderNumber: orders[0].order_number,
                date: new Date(orders[0].created_at).toLocaleDateString()
              })}
            </p>
          </div>
        )}

        {/* Comment Textarea */}
        <div>
          <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
            {t('review_form_your_review')}
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
              setError('');
            }}
            placeholder={t('review_form_write_review_placeholder')}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm resize-none"
          />
          <p className={`text-xs mt-1 ${
            comment.length < 10 ? 'text-red-600' : 'text-green-600'
          }`}>
            {comment.length}/10 characters minimum
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button
            type="submit"
            disabled={loading}
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {existingReview ? t('review_form_updating') : t('review_form_submitting')}
              </>
            ) : (
              <>{existingReview ? t('review_form_update') : t('review_form_submit')}</>
            )}
          </Button>
          
          {onCancel && (
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
              className="flex-1"
              disabled={loading}
            >
              {t('review_form_cancel')}
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
};

export default ReviewForm;
