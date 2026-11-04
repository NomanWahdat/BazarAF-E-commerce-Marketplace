import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, MessageSquare, Search, Star } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { Button } from '../../components/ui/button';
import { getVendorReviews, VendorReviewItem } from '../../../services/vendorAPI';
import { toast } from 'sonner';

const VendorReviewsPage: React.FC = () => {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<VendorReviewItem[]>([]);
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState<'all' | '5' | '4' | '3' | '2' | '1'>('all');

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const data = await getVendorReviews();
      setReviews(data);
    } catch {
      toast.error('Failed to load reviews');
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const filteredReviews = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reviews.filter((review) => {
      const matchesSearch =
        !query ||
        review.product_name.toLowerCase().includes(query) ||
        review.user_name.toLowerCase().includes(query) ||
        review.comment.toLowerCase().includes(query);

      const matchesRating = ratingFilter === 'all' || String(review.rating) === ratingFilter;
      return matchesSearch && matchesRating;
    });
  }, [reviews, search, ratingFilter]);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return total / reviews.length;
  }, [reviews]);

  return (
    <Layout variant="vendor">
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Product Reviews</h1>
              <p className="text-gray-600 mt-1">See and track customer feedback for your products</p>
            </div>
            <Button onClick={fetchReviews} variant="outline">Refresh</Button>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">Total Reviews</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{reviews.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">Average Rating</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-2xl font-bold text-slate-900">{averageRating.toFixed(1)}</p>
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">Low Ratings (1-2)</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {reviews.filter((r) => r.rating <= 2).length}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by product, customer, or comment"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">All ratings</option>
              <option value="5">5 stars</option>
              <option value="4">4 stars</option>
              <option value="3">3 stars</option>
              <option value="2">2 stars</option>
              <option value="1">1 star</option>
            </select>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-600">Loading reviews...</div>
            ) : filteredReviews.length === 0 ? (
              <div className="p-10 text-center">
                <MessageSquare className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-700 font-medium">No reviews found</p>
                <p className="text-sm text-slate-500 mt-1">Once customers leave feedback, it will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredReviews.map((review) => (
                  <div key={review.id} className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{review.product_name}</p>
                        <p className="text-xs text-slate-500 mt-1">By {review.user_name}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={`${review.id}-star-${i}`}
                              className={`w-4 h-4 ${i < review.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {review.created_at ? new Date(review.created_at).toLocaleDateString() : 'Unknown date'}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 mt-3 whitespace-pre-wrap">
                      {review.comment || 'No comment provided.'}
                    </p>
                    <div className="mt-3">
                      <button
                        onClick={() => navigate('/vendor?tab=products')}
                        className="text-xs text-emerald-700 hover:text-emerald-800 font-medium"
                      >
                        Manage product →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <span>
              Reviews are currently read-only for vendors. Use this screen to monitor product feedback and improve listings.
            </span>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default VendorReviewsPage;
