/**
 * Admin Review Moderation Page
 * Flag and manage inappropriate reviews
 */
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import {
  AlertCircle,
  CheckCircle,
  MessageSquare,
  Flag,
  Star,
  Trash2,
} from 'lucide-react';
import adminService from '@/services/adminService';
import Layout from '@/app/components/layout/Layout';

interface Review {
  id: string;
  review_id?: string;
  review_text: string;
  rating: number;
  product_name: string;
  customer_name: string;
  vendor_name: string;
  category: string;
  is_flagged: boolean;
  flag_category?: string;
  vendor_response?: string;
  created_at: string;
}

const FLAG_CATEGORIES = [
  { value: 'spam', label: 'Spam' },
  { value: 'fake', label: 'Fake/Duplicate' },
  { value: 'offensive', label: 'Offensive Language' },
  { value: 'irrelevant', label: 'Irrelevant to Product' },
  { value: 'other', label: 'Other' },
];

export const AdminReviewModeration: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    rating: '',
    category: '',
    vendor: '',
    flagged_status: 'all',
  });

  // Dialogs
  const [showFlagDialog, setShowFlagDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [flagCategory, setFlagCategory] = useState('');
  const [flagReason, setFlagReason] = useState('');
  const [deleteReason, setDeleteReason] = useState('');

  // Stats
  const [flaggedCounts, setFlaggedCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadReviews();
  }, [filters]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const data = await adminService.getReviewsForModeration(filters);
      const results = data.results || data;
      const mappedReviews: Review[] = results.map((item: any) => {
        const reviewData = item.review_data || {};
        return {
          id: item.id,
          review_id: reviewData.id || item.review || item.review_id,
          review_text: reviewData.comment || item.review_text || '',
          rating: reviewData.rating ?? item.rating ?? 0,
          product_name: reviewData.product_name || item.product_name || 'Unknown',
          customer_name: reviewData.user_name || item.customer_name || '',
          vendor_name: reviewData.vendor_name || item.vendor_name || '',
          category: reviewData.category || item.category || '',
          is_flagged: item.is_flagged ?? false,
          flag_category: item.flag_category,
          vendor_response: item.vendor_response || reviewData.vendor_response || '',
          created_at: reviewData.created_at || item.created_at || '',
        };
      });
      setReviews(mappedReviews);
      
      // Calculate flagged counts
      const counts: Record<string, number> = {};
      FLAG_CATEGORIES.forEach((cat) => {
        counts[cat.value] = mappedReviews.filter(
          (r) => r.is_flagged && r.flag_category === cat.value
        ).length;
      });
      setFlaggedCounts(counts);
      
      setError(null);
    } catch (err) {
      setError('Failed to load reviews');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFlagReview = async () => {
    if (!flagCategory) {
      setError('Please select a flag category');
      return;
    }
    if (!selectedReview) return;

    try {
      const reviewId = selectedReview.review_id || selectedReview.id;
      await adminService.flagReview(reviewId, {
        category: flagCategory,
        reason: flagReason,
      });
      setSuccess(`Review flagged as ${flagCategory}`);
      setShowFlagDialog(false);
      setFlagCategory('');
      setFlagReason('');
      setSelectedReview(null);
      loadReviews();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(`Failed to flag review: ${err}`);
    }
  };

  const handleUnflagReview = async (review: Review) => {
    try {
      await adminService.unflagReview(review.id);
      setSuccess('Review unflagged successfully');
      loadReviews();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(`Failed to unflag review: ${err}`);
    }
  };

  const handleDeleteReview = async () => {
    if (!deleteReason || deleteReason.trim().length === 0) {
      setError('Deletion reason is required');
      return;
    }
    if (!selectedReview) return;

    try {
      await adminService.deleteReview(selectedReview.id, { reason: deleteReason });
      setSuccess('Review deleted successfully');
      setShowDeleteDialog(false);
      setDeleteReason('');
      setSelectedReview(null);
      loadReviews();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(`Failed to delete review: ${err}`);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <Layout variant="admin" showFooter={false}>
        <div className="flex items-center justify-center h-screen">
          <p className="text-muted-foreground">Loading reviews...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout variant="admin" showFooter={false}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Review Moderation</h1>
          <p className="text-muted-foreground">
            Monitor and manage product reviews for quality control
          </p>
        </div>

        {/* Messages */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5" />
                <p>{error}</p>
              </div>
            </CardContent>
          </Card>
        )}
        {success && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                <p>{success}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Flagged Reviews Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Flagged Reviews by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {FLAG_CATEGORIES.map((cat) => (
                <div key={cat.value} className="text-center p-3 bg-gray-50 rounded">
                  <p className="text-sm text-muted-foreground mb-1">{cat.label}</p>
                  <p className="text-2xl font-bold">
                    {flaggedCounts[cat.value] || 0}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Rating</label>
                <Select
                  value={filters.rating}
                  onValueChange={(value) =>
                    setFilters({
                      ...filters,
                      rating: value === 'all' ? '' : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All ratings" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Star</SelectItem>
                    <SelectItem value="2">2 Stars</SelectItem>
                    <SelectItem value="3">3 Stars</SelectItem>
                    <SelectItem value="4">4 Stars</SelectItem>
                    <SelectItem value="5">5 Stars</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <Input
                  placeholder="Search category..."
                  value={filters.category}
                  onChange={(e) =>
                    setFilters({ ...filters, category: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Vendor</label>
                <Input
                  placeholder="Search vendor..."
                  value={filters.vendor}
                  onChange={(e) =>
                    setFilters({ ...filters, vendor: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select
                  value={filters.flagged_status}
                  onValueChange={(value) =>
                    setFilters({ ...filters, flagged_status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="flagged">Flagged</SelectItem>
                    <SelectItem value="unflagged">Unflagged</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reviews Table */}
        <Card>
          <CardHeader>
            <CardTitle>Reviews ({reviews.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {reviews.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No reviews found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">{review.product_name}</p>
                          {review.is_flagged && (
                            <Badge variant="destructive" className="gap-1">
                              <Flag className="h-3 w-3" />
                              {review.flag_category}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {review.customer_name} on {review.vendor_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="mb-1">{renderStars(review.rating)}</div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <p className="text-sm bg-gray-50 p-3 rounded mb-3 text-gray-700">
                      "{review.review_text}"
                    </p>

                    {review.vendor_response && (
                      <div className="mb-3 bg-blue-50 p-3 rounded border-l-2 border-blue-400">
                        <p className="text-xs font-medium text-blue-900 mb-1">
                          Vendor Response:
                        </p>
                        <p className="text-sm text-blue-800">
                          {review.vendor_response}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {review.is_flagged ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnflagReview(review)}
                          >
                            Unflag
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setSelectedReview(review);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedReview(review);
                            setShowFlagDialog(true);
                          }}
                        >
                          <Flag className="h-4 w-4 mr-1" />
                          Flag
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Flag Review Dialog */}
      <Dialog open={showFlagDialog} onOpenChange={setShowFlagDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Flag Review</DialogTitle>
            <DialogDescription>
              Product: {selectedReview?.product_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-sm text-muted-foreground mb-2">Review Text:</p>
              <p className="text-sm">"{selectedReview?.review_text}"</p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Flag Category (required)
              </label>
              <Select value={flagCategory} onValueChange={setFlagCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {FLAG_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Reason (optional)
              </label>
              <Textarea
                placeholder="Explain why you are flagging this review..."
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                className="min-h-20"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowFlagDialog(false);
                setFlagCategory('');
                setFlagReason('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleFlagReview}>
              Flag Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Review Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Delete Review</DialogTitle>
            <DialogDescription>
              This action cannot be undone
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-red-50 p-3 rounded border border-red-200">
              <p className="text-sm text-red-900">
                Product: {selectedReview?.product_name}
              </p>
              <p className="text-sm text-red-800 mt-1">
                Customer: {selectedReview?.customer_name}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Deletion Reason (required)
              </label>
              <Textarea
                placeholder="Explain why this review must be deleted..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="min-h-20"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setDeleteReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteReview}
            >
              Delete Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default AdminReviewModeration;
