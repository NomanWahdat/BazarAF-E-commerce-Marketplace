/**
 * Admin Commission Management Page
 * Manage vendor commission rates and view payouts
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
import {
  AlertCircle,
  CheckCircle,
  DollarSign,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import adminService from '@/services/adminService';
import Layout from '@/app/components/layout/Layout';

interface Vendor {
  id: string;
  shop_name: string;
  commission_rate: number;
  pending_payout: number;
  sales_volume: number;
  status: string;
  created_at: string;
}

interface CommissionHistoryItem {
  id: string;
  old_rate: number;
  new_rate: number;
  effective_date: string;
  reason: string;
  changed_by: string;
  created_at: string;
}

export const AdminCommissionManagement: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dialogs
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [commissionHistory, setCommissionHistory] = useState<CommissionHistoryItem[]>([]);
  const [newRate, setNewRate] = useState('');
  const [reason, setReason] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [previewImpact, setPreviewImpact] = useState<any>(null);

  const toNumber = (value?: number | string | null) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const formatMoney = (value?: number | string | null) =>
    toNumber(value).toLocaleString();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');

  useEffect(() => {
    loadVendors();
  }, [searchTerm, ratingFilter]);

  const loadVendors = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (searchTerm) filters.search = searchTerm;
      if (ratingFilter) filters.rating = ratingFilter;

      const data = await adminService.getVendorsForCommission(filters);
      setVendors(data.results || data);
      setError(null);
    } catch (err) {
      setError('Failed to load vendors');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCommissionHistory = async (vendorId: string) => {
    try {
      const data = await adminService.getCommissionHistory(vendorId);
      setCommissionHistory(data || []);
    } catch (err) {
      setError('Failed to load commission history');
      console.error(err);
    }
  };

  const loadPreviewImpact = async (vendorId: string, newRateValue: string) => {
    if (!newRateValue || isNaN(Number(newRateValue))) {
      setError('Please enter a valid commission rate');
      return;
    }
    try {
      const data = await adminService.previewPayoutImpact(vendorId, {
        rate: Number(newRateValue),
      });
      setPreviewImpact(data);
    } catch (err) {
      setError('Failed to load preview impact');
      console.error(err);
    }
  };

  const handleUpdateCommission = async () => {
    if (!newRate || isNaN(Number(newRate))) {
      setError('Please enter a valid commission rate');
      return;
    }
    if (!selectedVendor) return;

    try {
      const data: any = {
        rate: Number(newRate),
      };
      if (reason) data.reason = reason;
      if (effectiveDate) data.effective_date = effectiveDate;

      await adminService.updateCommissionRate(selectedVendor.id, data);
      setSuccess(`Commission rate updated for ${selectedVendor.shop_name}`);
      setShowUpdateDialog(false);
      setNewRate('');
      setReason('');
      setEffectiveDate('');
      loadVendors();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(`Failed to update commission rate: ${err}`);
    }
  };

  if (loading) {
    return (
      <Layout variant="admin" showFooter={false}>
        <div className="flex items-center justify-center h-screen">
          <p className="text-muted-foreground">Loading vendors...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout variant="admin" showFooter={false}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Commission Management</h1>
          <p className="text-muted-foreground">
            Manage vendor commission rates and view payout impacts
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Search Vendor
                </label>
                <Input
                  placeholder="Search by shop name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Rating Range
                </label>
                <Select
                  value={ratingFilter}
                  onValueChange={(value) =>
                    setRatingFilter(value === 'all' ? '' : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All ratings" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4-5">4.0 - 5.0 stars</SelectItem>
                    <SelectItem value="3-4">3.0 - 4.0 stars</SelectItem>
                    <SelectItem value="below-3">Below 3.0 stars</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vendors Table */}
        <Card>
          <CardHeader>
            <CardTitle>Vendors ({vendors.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {vendors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No vendors found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shop Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Commission Rate</TableHead>
                    <TableHead>Sales Volume</TableHead>
                    <TableHead>Pending Payout</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.map((vendor) => (
                    <TableRow key={vendor.id}>
                      <TableCell className="font-medium">
                        {vendor.shop_name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            vendor.status === 'active'
                              ? 'default'
                              : vendor.status === 'suspended'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {vendor.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono font-medium">
                          {vendor.commission_rate}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          <span className="font-medium">
                            AFN {formatMoney(vendor.sales_volume)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-amber-600">
                          AFN {formatMoney(vendor.pending_payout)}
                        </span>
                      </TableCell>
                      <TableCell className="space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedVendor(vendor);
                            setNewRate(vendor.commission_rate.toString());
                            setShowUpdateDialog(true);
                          }}
                        >
                          Update Rate
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedVendor(vendor);
                            loadCommissionHistory(vendor.id);
                            setShowHistoryDialog(true);
                          }}
                        >
                          History
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

      {/* Update Commission Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Update Commission Rate</DialogTitle>
            <DialogDescription>
              {selectedVendor?.shop_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Current Rate
              </label>
              <div className="bg-gray-100 p-2 rounded text-sm font-mono">
                {selectedVendor?.commission_rate}%
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                New Rate (%)
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="0.00"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Reason (optional)
              </label>
              <Textarea
                placeholder="Why are you changing this rate?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-20"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Effective Date (optional)
              </label>
              <Input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                loadPreviewImpact(selectedVendor?.id || '', newRate);
                setShowPreviewDialog(true);
              }}
            >
              Preview Impact
            </Button>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUpdateDialog(false);
                setNewRate('');
                setReason('');
                setEffectiveDate('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateCommission}>
              Update Rate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Commission History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Commission History</DialogTitle>
            <DialogDescription>
              {selectedVendor?.shop_name}
            </DialogDescription>
          </DialogHeader>

          {commissionHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No commission history</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Old Rate</TableHead>
                  <TableHead>New Rate</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Changed By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissionHistory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-sm">
                      {new Date(item.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-mono">{item.old_rate}%</TableCell>
                    <TableCell className="font-mono font-bold">
                      {item.new_rate}%
                    </TableCell>
                    <TableCell className="text-sm">{item.reason}</TableCell>
                    <TableCell className="text-sm">{item.changed_by}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Impact Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payout Impact Preview</DialogTitle>
            <DialogDescription>
              {selectedVendor?.shop_name}
            </DialogDescription>
          </DialogHeader>

          {previewImpact && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded">
                  <p className="text-sm text-muted-foreground mb-1">
                    Current Rate
                  </p>
                  <p className="text-2xl font-bold">
                    {previewImpact.current_rate}%
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Estimated Monthly Payout
                  </p>
                  <p className="text-lg font-bold text-green-600">
                    AFN {previewImpact.current_payout?.toLocaleString()}
                  </p>
                </div>

                <div className="bg-blue-50 p-4 rounded border-2 border-blue-200">
                  <p className="text-sm text-muted-foreground mb-1">
                    New Rate
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {previewImpact.new_rate}%
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Estimated Monthly Payout
                  </p>
                  <p className="text-lg font-bold text-blue-600">
                    AFN {previewImpact.new_payout?.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 p-4 rounded border border-amber-200">
                <p className="text-sm font-medium text-amber-900 mb-1">
                  Impact
                </p>
                <p className="text-lg font-bold text-amber-700">
                  {previewImpact.change_direction === 'increase' ? '+' : '-'}AFN{' '}
                  {Math.abs(
                    previewImpact.new_payout - previewImpact.current_payout
                  ).toLocaleString()}{' '}
                  per month
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPreviewDialog(false)}
            >
              Close
            </Button>
            <Button onClick={handleUpdateCommission}>
              Confirm & Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default AdminCommissionManagement;
