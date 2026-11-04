/**
 * Admin Product Moderation Page
 * Handle product approval/rejection workflow
 */
import React, { useState, useEffect } from 'react';
import useDebounce from '@/app/hooks/useDebounce';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
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
import { AlertCircle, CheckCircle, Package } from 'lucide-react';
import { getAbsoluteImageUrl } from '@/utils/imageUtils';
import adminService from '@/services/adminService';
import Layout from '@/app/components/layout/Layout';

interface Product {
  id: string;
  name: string;
  description?: string;
  vendor: {
    id: string;
    shop_name: string;
  };
  vendor_name?: string;
  category?: string;
  category_name?: string;
  price?: number | string;
  original_price?: number | string | null;
  images?: Array<{ id: string; image?: string | null; image_url?: string | null }>;
  product_attributes?: Array<{
    id: string;
    attribute_name?: string;
    value?: string;
  }>;
  status: 'pending' | 'approved' | 'rejected';
  stock_quantity: number;
  created_at: string;
  rejection_note?: string;
}

export const AdminProductModeration: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    status: 'pending',
    category: '',
    vendor: '',
    stock_status: '',
  });

  const debouncedCategory = useDebounce(filters.category, 300);
  const debouncedVendor = useDebounce(filters.vendor, 300);

  // Dialogs
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [bulkActionType, setBulkActionType] = useState<'approve' | 'reject' | null>(
    null
  );

  useEffect(() => {
    loadProducts();
  }, [filters.status, debouncedCategory, debouncedVendor, filters.stock_status]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const params = {
        status: filters.status,
        category: debouncedCategory,
        vendor: debouncedVendor,
        stock_status: filters.stock_status,
      };
      const cleanedParams = Object.entries(params).reduce(
        (acc, [key, value]) => {
          if (value !== undefined && value !== null && String(value).trim() !== '') {
            acc[key] = value;
          }
          return acc;
        },
        {} as Record<string, string>
      );
      const data = await adminService.getProductsForModeration(cleanedParams);
      setProducts(data.results || data);
      setError(null);
    } catch (err) {
      setError('Failed to load products for moderation');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (product: Product) => {
    try {
      await adminService.approveProduct(product.id);
      setSuccess(`Product "${product.name}" approved successfully`);
      setShowActionDialog(false);
      setSelectedProduct(null);
      loadProducts();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(`Failed to approve product: ${err}`);
    }
  };

  const handleReject = async (product: Product, note: string) => {
    if (!note || note.trim().length === 0) {
      setError('Rejection note is required');
      return;
    }
    if (note.length > 500) {
      setError('Rejection note cannot exceed 500 characters');
      return;
    }

    try {
      await adminService.rejectProduct(product.id, { note });
      setSuccess(`Product "${product.name}" rejected successfully`);
      setShowActionDialog(false);
      setSelectedProduct(null);
      setRejectionNote('');
      loadProducts();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(`Failed to reject product: ${err}`);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedProducts.length === 0) {
      setError('No products selected');
      return;
    }

    try {
      await adminService.bulkApproveProducts({
        product_ids: selectedProducts,
      });
      setSuccess(`${selectedProducts.length} products approved successfully`);
      setShowBulkDialog(false);
      setSelectedProducts([]);
      loadProducts();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(`Failed to bulk approve products: ${err}`);
    }
  };

  const handleBulkReject = async (note: string) => {
    if (selectedProducts.length === 0) {
      setError('No products selected');
      return;
    }
    if (!note || note.trim().length === 0) {
      setError('Rejection note is required');
      return;
    }
    if (note.length > 500) {
      setError('Rejection note cannot exceed 500 characters');
      return;
    }

    try {
      await adminService.bulkRejectProducts({
        product_ids: selectedProducts,
        note,
      });
      setSuccess(`${selectedProducts.length} products rejected successfully`);
      setShowBulkDialog(false);
      setSelectedProducts([]);
      setRejectionNote('');
      loadProducts();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(`Failed to bulk reject products: ${err}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const toNumber = (value?: number | string | null) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const formatMoney = (value?: number | string | null) =>
    toNumber(value).toLocaleString();

  const getPrimaryImage = (product?: Product | null) => {
    if (!product?.images || product.images.length === 0) {
      return null;
    }
    const first = product.images[0];
    return getAbsoluteImageUrl(first.image_url || first.image || null);
  };

  if (loading) {
    return (
      <Layout variant="admin" showFooter={false}>
        <div className="flex items-center justify-center h-screen">
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout variant="admin" showFooter={false}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Product Moderation</h1>
          <p className="text-muted-foreground">
            Review and approve/reject pending products
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

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select
                  value={filters.status}
                  onValueChange={(value) =>
                    setFilters({
                      ...filters,
                      status: value === 'all' ? '' : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Category
                </label>
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
                <label className="text-sm font-medium mb-2 block">
                  Stock Status
                </label>
                <Select
                  value={filters.stock_status}
                  onValueChange={(value) =>
                    setFilters({
                      ...filters,
                      stock_status: value === 'all' ? '' : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Stock</SelectItem>
                    <SelectItem value="in">In Stock</SelectItem>
                    <SelectItem value="out">Out of Stock</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedProducts.length > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <p className="text-blue-900">
                  {selectedProducts.length} product(s) selected
                </p>
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBulkActionType('approve');
                      setShowBulkDialog(true);
                    }}
                  >
                    Approve All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBulkActionType('reject');
                      setShowBulkDialog(true);
                    }}
                  >
                    Reject All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedProducts([])}
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Products Table */}
        <Card>
          <CardHeader>
            <CardTitle>Products ({products.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No products found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={
                          selectedProducts.length === products.length &&
                          products.length > 0
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProducts(products.map((p) => p.id));
                          } else {
                            setSelectedProducts([]);
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                    </TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProducts([
                                ...selectedProducts,
                                product.id,
                              ]);
                            } else {
                              setSelectedProducts(
                                selectedProducts.filter((id) => id !== product.id)
                              );
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>
                        {product.vendor?.shop_name || product.vendor_name || 'Unknown'}
                      </TableCell>
                      <TableCell>{product.category_name || product.category || '—'}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            product.stock_quantity > 10
                              ? 'default'
                              : product.stock_quantity > 0
                              ? 'secondary'
                              : 'destructive'
                          }
                        >
                          {product.stock_quantity} units
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(product.status)}>
                          {product.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(product.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedProduct(product);
                            setActionType(null);
                            setRejectionNote('');
                            setShowActionDialog(true);
                          }}
                        >
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedProduct ? selectedProduct.name : 'Product'}
            </DialogTitle>
            <DialogDescription>
              Vendor: {selectedProduct?.vendor.shop_name}
            </DialogDescription>
          </DialogHeader>

          {!actionType ? (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded border bg-gray-50 p-3">
                  {getPrimaryImage(selectedProduct) ? (
                    <img
                      src={getPrimaryImage(selectedProduct) || ''}
                      alt={selectedProduct?.name || 'Product image'}
                      className="h-48 w-full rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                      No image available
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">
                    Vendor:{' '}
                    <span className="font-medium text-foreground">
                      {selectedProduct?.vendor?.shop_name ||
                        selectedProduct?.vendor_name ||
                        'Unknown'}
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    Category:{' '}
                    <span className="font-medium text-foreground">
                      {selectedProduct?.category_name ||
                        selectedProduct?.category ||
                        '—'}
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    Price:{' '}
                    <span className="font-semibold text-foreground">
                      AFN {formatMoney(selectedProduct?.price)}
                    </span>
                  </p>
                  {selectedProduct?.original_price && (
                    <p className="text-muted-foreground">
                      Original Price:{' '}
                      <span className="line-through">
                        AFN {formatMoney(selectedProduct.original_price)}
                      </span>
                    </p>
                  )}
                  <p className="text-muted-foreground">
                    Stock:{' '}
                    <span className="font-medium text-foreground">
                      {selectedProduct?.stock_quantity ?? 0} units
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    Created:{' '}
                    <span className="font-medium text-foreground">
                      {new Date(selectedProduct?.created_at || '').toLocaleDateString()}
                    </span>
                  </p>
                </div>
              </div>

              {selectedProduct?.description && (
                <div>
                  <p className="text-sm font-medium mb-1">Description</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedProduct.description}
                  </p>
                </div>
              )}

              {selectedProduct?.product_attributes &&
                selectedProduct.product_attributes.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Attributes</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      {selectedProduct.product_attributes.map((attr) => (
                        <div key={attr.id} className="rounded bg-gray-50 px-3 py-2">
                          <span className="text-muted-foreground">
                            {attr.attribute_name || 'Attribute'}:
                          </span>{' '}
                          <span className="font-medium">
                            {attr.value || '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              {selectedProduct?.rejection_note && (
                <div className="bg-red-50 p-3 rounded">
                  <p className="text-sm font-medium text-red-900 mb-1">
                    Previous Rejection Note:
                  </p>
                  <p className="text-sm text-red-800">
                    {selectedProduct.rejection_note}
                  </p>
                </div>
              )}
              <div className="space-y-2 pt-4">
                <Button
                  className="w-full"
                  onClick={() => setActionType('approve')}
                >
                  Approve Product
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setActionType('reject')}
                >
                  Reject Product
                </Button>
              </div>
            </div>
          ) : actionType === 'approve' ? (
            <div className="space-y-4 py-4">
              <p className="text-sm">Are you sure you want to approve this product?</p>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setActionType(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (selectedProduct) handleApprove(selectedProduct);
                  }}
                >
                  Approve
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Rejection Note (required)
                </label>
                <Textarea
                  placeholder="Explain why this product is being rejected..."
                  value={rejectionNote}
                  onChange={(e) => setRejectionNote(e.target.value)}
                  className="min-h-24"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {rejectionNote.length}/500 characters
                </p>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setActionType(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (selectedProduct) handleReject(selectedProduct, rejectionNote);
                  }}
                >
                  Reject
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Action Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {bulkActionType === 'approve'
                ? 'Approve Products'
                : 'Reject Products'}
            </DialogTitle>
          </DialogHeader>

          {bulkActionType === 'reject' && (
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Rejection Note (required)
                </label>
                <Textarea
                  placeholder="Explain why these products are being rejected..."
                  value={rejectionNote}
                  onChange={(e) => setRejectionNote(e.target.value)}
                  className="min-h-24"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {rejectionNote.length}/500 characters
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2 py-4 bg-blue-50 p-3 rounded">
            <p className="text-sm text-blue-900">
              This will {bulkActionType === 'approve' ? 'approve' : 'reject'}{' '}
              {selectedProducts.length} product(s)
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowBulkDialog(false);
                setBulkActionType(null);
                setRejectionNote('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant={bulkActionType === 'approve' ? 'default' : 'destructive'}
              onClick={() => {
                if (bulkActionType === 'approve') {
                  handleBulkApprove();
                } else {
                  handleBulkReject(rejectionNote);
                }
              }}
            >
              {bulkActionType === 'approve' ? 'Approve All' : 'Reject All'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default AdminProductModeration;
