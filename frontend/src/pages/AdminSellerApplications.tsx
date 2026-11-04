/**
 * Admin Seller Applications Review Page
 */
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import { Download, CheckCircle, XCircle } from 'lucide-react';
import adminService from '@/services/adminService';
import Layout from '@/app/components/layout/Layout';

interface SellerApplication {
  id: string;
  application_id: string;
  full_name: string;
  phone: string;
  email: string;
  shop_name: string;
  city: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at?: string;
  identity_document?: string;
  business_document?: string;
}

export const AdminSellerApplications: React.FC = () => {
  const [applications, setApplications] = useState<SellerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<SellerApplication | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(
    null
  );
  const [rejectionReason, setRejectionReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadApplications();
  }, [statusFilter]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const data = await adminService.getSellerApplications({
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      setApplications(data.results || data);
      setError(null);
    } catch (err) {
      setError('Failed to load applications');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedApp) return;
    try {
      await adminService.approveApplication(selectedApp.id);
      setSuccessMessage(`Application ${selectedApp.application_id} approved!`);
      setShowConfirmDialog(false);
      setSelectedApp(null);
      loadApplications();
    } catch (err) {
      setError('Failed to approve application');
    }
  };

  const handleReject = async () => {
    if (!selectedApp || !rejectionReason.trim()) return;
    if (rejectionReason.length < 10) {
      setError('Rejection reason must be at least 10 characters');
      return;
    }
    try {
      await adminService.rejectApplication(selectedApp.id, {
        reason: rejectionReason,
      });
      setSuccessMessage(`Application ${selectedApp.application_id} rejected!`);
      setShowConfirmDialog(false);
      setSelectedApp(null);
      setRejectionReason('');
      loadApplications();
    } catch (err) {
      setError('Failed to reject application');
    }
  };

  const statusColor = {
    pending: 'bg-yellow-50',
    approved: 'bg-green-50',
    rejected: 'bg-red-50',
  };

  const statusBadgeVariant = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };

  if (loading && applications.length === 0) {
    return (
      <Layout variant="admin" showFooter={false}>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading applications...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout variant="admin" showFooter={false}>
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Applications</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4 flex-wrap">
            <div className="w-48">
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
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
          </CardContent>
        </Card>

        {/* Messages */}
        {successMessage && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                <p>{successMessage}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-700">
                <XCircle className="h-5 w-5" />
                <p>{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Applications Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {statusFilter === 'pending' ? 'Pending' : statusFilter} Applications (
              {applications.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {applications.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">
                No applications found
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>App ID</TableHead>
                      <TableHead>Applicant</TableHead>
                      <TableHead>Shop Name</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.map((app) => (
                      <TableRow
                        key={app.id}
                        className={`cursor-pointer hover:${statusColor[app.status]}`}
                        onClick={() => setSelectedApp(app)}
                      >
                        <TableCell className="font-mono text-sm">
                          {app.application_id}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{app.full_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {app.phone}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{app.shop_name}</TableCell>
                        <TableCell>{app.city}</TableCell>
                        <TableCell>
                          <Badge className={statusBadgeVariant[app.status]}>
                            {app.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(app.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedApp(app);
                            }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Panel */}
        {selectedApp && (
          <Card>
            <CardHeader>
              <CardTitle>Application Details</CardTitle>
              <CardDescription>{selectedApp.application_id}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Applicant Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Full Name
                  </label>
                  <p className="text-lg font-medium mt-1">{selectedApp.full_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Email
                  </label>
                  <p className="text-lg font-medium mt-1">{selectedApp.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Phone
                  </label>
                  <p className="text-lg font-medium mt-1">{selectedApp.phone}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    City
                  </label>
                  <p className="text-lg font-medium mt-1">{selectedApp.city}</p>
                </div>
              </div>

              {/* Shop Info */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Shop Name
                </label>
                <p className="text-lg font-medium mt-1">{selectedApp.shop_name}</p>
              </div>

              {/* Documents */}
              {(selectedApp.identity_document || selectedApp.business_document) && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-3 block">
                    Documents
                  </label>
                  <div className="flex gap-4">
                    {selectedApp.identity_document && (
                      <a
                        href={selectedApp.identity_document}
                        download
                        className="flex items-center gap-2 text-blue-600 hover:underline"
                      >
                        <Download className="h-4 w-4" />
                        Identity Document
                      </a>
                    )}
                    {selectedApp.business_document && (
                      <a
                        href={selectedApp.business_document}
                        download
                        className="flex items-center gap-2 text-blue-600 hover:underline"
                      >
                        <Download className="h-4 w-4" />
                        Business Document
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              {selectedApp.status === 'pending' && (
                <div className="flex gap-3 mt-6 pt-6 border-t">
                  <Button
                    onClick={() => {
                      setConfirmAction('approve');
                      setShowConfirmDialog(true);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => {
                      setConfirmAction('reject');
                      setShowConfirmDialog(true);
                    }}
                    variant="destructive"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              )}

              {selectedApp.status !== 'pending' && (
                <div className="mt-4 p-3 bg-gray-50 rounded">
                  <p className="text-sm text-muted-foreground">
                    Status: <span className="font-medium">{selectedApp.status}</span>
                  </p>
                  {selectedApp.reviewed_at && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Reviewed:{' '}
                      <span className="font-medium">
                        {new Date(selectedApp.reviewed_at).toLocaleString()}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogTitle>
              {confirmAction === 'approve' ? 'Approve Application?' : 'Reject Application?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'approve'
                ? `You are about to approve application ${selectedApp?.application_id}. This will create a vendor account.`
                : `You are about to reject application ${selectedApp?.application_id}.`}
            </AlertDialogDescription>

            {confirmAction === 'reject' && (
              <div className="my-4">
                <label className="text-sm font-medium mb-2 block">
                  Rejection Reason (min 10 characters)
                </label>
                <Textarea
                  placeholder="Explain why this application is being rejected..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
              </div>
            )}

            <div className="flex gap-3">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (confirmAction === 'approve') handleApprove();
                  else handleReject();
                }}
                disabled={
                  confirmAction === 'reject' && rejectionReason.length < 10
                }
              >
                {confirmAction === 'approve' ? 'Approve' : 'Reject'}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

export default AdminSellerApplications;
