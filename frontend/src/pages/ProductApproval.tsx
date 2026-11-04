import React, { useState, useEffect } from 'react';
import Layout from '../app/components/layout/Layout';
import { productAPI } from '@/services/categoryApi';
import { Product } from '@/types/category';
import {
  Check,
  X,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { getAbsoluteImageUrl } from '@/utils/imageUtils';

/**
 * ProductApproval Page (Admin)
 * Review and approve/reject pending products
 */
const ProductApproval: React.FC = () => {
  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [actioningId, setActioningId] = useState<string | null>(null);

  // Load pending products
  useEffect(() => {
    loadPendingProducts();
  }, [currentPage]);

  const loadPendingProducts = async () => {
    setLoading(true);
    setError('');

    try {
      // Fetch products with pending status
      const data = await productAPI.getProducts(
        {
          status: 'pending',
          page: currentPage,
        },
        currentPage
      );

      setProducts(data.results || []);
      setTotalCount(data.count || 0);
    } catch (err) {
      setError('Failed to load pending products');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (productId: string) => {
    setActioningId(productId);
    setError('');

    try {
      await productAPI.approveProduct(productId);
      setSuccess('Product approved successfully');
      loadPendingProducts();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err?.message || 'Failed to approve product');
      console.error(err);
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (productId: string) => {
    const reason = prompt(
      'Enter rejection reason (optional):'
    );
    if (reason === null) return;

    setActioningId(productId);
    setError('');

    try {
      await productAPI.rejectProduct(productId, reason);
      setSuccess('Product rejected successfully');
      loadPendingProducts();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err?.message || 'Failed to reject product');
      console.error(err);
    } finally {
      setActioningId(null);
    }
  };

  const totalPages = Math.ceil(totalCount / 20);

  return (
    <Layout variant="admin">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Product Approval Queue
          </h1>
          <p className="text-gray-600 mt-1">
            Review and approve pending product listings
          </p>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600">Pending Products</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{totalCount}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600">Current Page</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {currentPage} / {totalPages || 1}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600">Shown Products</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {products.length}
            </p>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-900 font-semibold">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-green-900 font-semibold">{success}</p>
          </div>
        )}

        {/* Products List */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          </div>
        ) : products.length > 0 ? (
          <>
            <div className="space-y-4 mb-8">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="flex gap-4 p-4">
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      {product.primary_image ? (
                        <img
                          src={getAbsoluteImageUrl(product.primary_image)}
                          alt={product.name}
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center">
                          <Eye className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-lg truncate">
                        {product.name}
                      </h3>

                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {product.description}
                      </p>

                      <div className="flex items-center gap-4 mt-3">
                        <span className="text-lg font-bold text-teal-600">
                          AFN {product.price.toLocaleString()}
                        </span>
                        {product.original_price && (
                          <span className="text-sm text-gray-500 line-through">
                            AFN {product.original_price.toLocaleString()}
                          </span>
                        )}
                        <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                          Pending
                        </span>

                        {product.in_stock ? (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            In Stock
                          </span>
                        ) : (
                          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                            Out of Stock
                          </span>
                        )}
                      </div>

                      {/* Vendor & Category */}
                      <div className="text-xs text-gray-600 mt-3 space-y-1">
                        <p>
                          <strong>Vendor:</strong> {product.vendor_name}
                          {product.vendor_verified && (
                            <span className="ml-1 text-green-600">✓ Verified</span>
                          )}
                        </p>
                        <p>
                          <strong>Category:</strong> {product.category_name}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleApprove(product.id)}
                        disabled={actioningId === product.id}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {actioningId === product.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(product.id)}
                        disabled={actioningId === product.id}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {actioningId === product.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                        currentPage === i + 1
                          ? 'bg-teal-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <Check className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              All clear!
            </h3>
            <p className="text-gray-600">
              {totalCount === 0
                ? 'No pending products to review'
                : 'You have reviewed all pending products'}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ProductApproval;
