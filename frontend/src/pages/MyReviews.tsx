// File 4: frontend/src/pages/MyReviews.tsx

import React, { useState, useEffect } from 'react';
import { Star, Edit, Trash2, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Layout from '../app/components/layout/Layout';
import { ReviewForm } from '../app/components/ReviewForm';
import { Button } from '../app/components/ui/button';
import { Card } from '../app/components/ui/card';
import { productsAPI, type Product as ProductType } from '../services/productsAPI';
import { toast } from 'sonner';

interface Review {
  id: string;
  product: string;
  product_name: string;
  product_image: string;
  rating: number;
  comment: string;
  created_at: string;
  order_number: string;
}

const MyReviews: React.FC = () => {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewReviewForm, setShowNewReviewForm] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [products, setProducts] = useState<ProductType[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductType | null>(null);

  useEffect(() => {
    loadReviews();
    loadProducts();
  }, []);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const data = await productsAPI.getMyReviews();
      setReviews(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      console.error('Error loading reviews:', error);
      toast.error(t('my_reviews_load_failed'));
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await productsAPI.getProducts({ page: 1 });
      setProducts(data.results || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (!window.confirm(t('my_reviews_delete_confirm'))) return;

    try {
      await productsAPI.deleteReview(id);
      setReviews(reviews.filter(review => review.id !== id));
      toast.success(t('my_reviews_delete_success'));
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error(t('my_reviews_delete_failed'));
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  const handleReviewSubmitted = () => {
    setShowNewReviewForm(false);
    setEditingReview(null);
    setSelectedProduct(null);
    loadReviews();
  };

  return (
    <Layout variant="customer" cartItemCount={0}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('my_reviews_heading')}</h1>
            <p className="text-gray-600">{t('my_reviews_description')}</p>
          </div>
          <Button
            onClick={() => {
              setShowNewReviewForm(true);
              setEditingReview(null);
            }}
            className="mt-4 md:mt-0 bg-teal-600 hover:bg-teal-700 text-white w-full md:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('my_reviews_write_new')}
          </Button>
        </div>

        {/* New Review Form Modal */}
        {showNewReviewForm && (
          <div className="mb-8 bg-gradient-to-r from-teal-50 to-blue-50 p-6 rounded-lg border border-teal-200">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('my_reviews_select_product')}
              </label>
              <select
                value={selectedProduct?.id || ''}
                onChange={(e) => {
                  const productId = e.target.value;
                  const product = products.find(p => p.id === productId);
                  setSelectedProduct(product || null);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="">{t('my_reviews_select_product_placeholder')}</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <>
                <ReviewForm
                  product={selectedProduct}
                  onReviewSubmitted={handleReviewSubmitted}
                  onCancel={() => {
                    setShowNewReviewForm(false);
                    setSelectedProduct(null);
                  }}
                />
              </>
            )}
          </div>
        )}

        {/* Edit Review Form */}
        {editingReview && (
          <div className="mb-8 bg-gradient-to-r from-blue-50 to-teal-50 p-6 rounded-lg border border-blue-200">
            <ReviewForm
              product={{
                id: editingReview.product,
                name: editingReview.product_name,
                price: '0',
                images: editingReview.product_image ? [{ image: editingReview.product_image }] : [],
                description: '',
                original_price: '',
                category_name: '',
                vendor: { user: { phone: '' }, shop_name: '', is_verified: false },
                stock_quantity: 0,
                average_rating: 0,
                review_count: 0,
              } as ProductType}
              existingReview={editingReview}
              onReviewSubmitted={handleReviewSubmitted}
              onCancel={() => setEditingReview(null)}
            />
          </div>
        )}

        {/* Reviews List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">{t('my_reviews_loading')}</p>
          </div>
        ) : reviews.length === 0 ? (
          <Card className="text-center py-12 bg-white">
            <Star className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('my_reviews_no_reviews')}</h3>
            <p className="text-gray-600 mb-6">{t('my_reviews_start_reviewing')}</p>
            <Button
              onClick={() => setShowNewReviewForm(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('my_reviews_write_first')}
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.id} className="p-4 md:p-6 bg-white hover:shadow-md transition-shadow">
                <div className="flex gap-4 flex-col md:flex-row">
                  {/* Product Image */}
                  {review.product_image && (
                    <img
                      src={review.product_image}
                      alt={review.product_name}
                      className="w-full md:w-24 h-24 object-cover rounded"
                    />
                  )}

                  {/* Review Details */}
                  <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 md:gap-4 mb-3">
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">{review.product_name}</h3>
                        <p className="text-sm text-gray-600">{t('my_reviews_order_number')}{review.order_number}</p>
                      </div>
                      
                      {/* Rating */}
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          {renderStars(review.rating)}
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {t('my_reviews_rating_out_of', { rating: review.rating })}
                        </span>
                      </div>
                    </div>

                    {/* Comment */}
                    <p className="text-gray-700 mb-3 leading-relaxed">{review.comment}</p>

                    {/* Date */}
                    <p className="text-xs text-gray-500 mb-4">
                      {t('my_reviews_reviewed_on', { date: new Date(review.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      }) })}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 md:flex-col">
                    <Button
                      onClick={() => setEditingReview(review)}
                      variant="outline"
                      size="sm"
                      className="flex-1 md:flex-none text-teal-600 border-teal-300 hover:bg-teal-50"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      {t('my_reviews_edit')}
                    </Button>
                    <Button
                      onClick={() => handleDeleteReview(review.id)}
                      variant="outline"
                      size="sm"
                      className="flex-1 md:flex-none text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t('my_reviews_delete')}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MyReviews;