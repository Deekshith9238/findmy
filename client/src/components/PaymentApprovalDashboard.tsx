import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Eye, DollarSign, Clock, User, MapPin, Calendar, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiRequest } from '@/lib/queryClient';

interface PaymentApproval {
  id: number;
  serviceRequestId: number;
  amount: number;
  platformFee: number;
  tax: number;
  totalAmount: number;
  payoutAmount: number;
  status: string;
  createdAt: string;
  serviceRequest: {
    id: number;
    title: string;
    description: string;
    location: string;
    status: string;
    createdAt: string;
  };
  client: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  provider: {
    id: number;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
    hourlyRate: number;
  };
  photos: Array<{
    id: number;
    photoUrl: string;
    originalName: string;
    description: string;
    createdAt: string;
  }>;
}

export default function PaymentApprovalDashboard() {
  const [selectedPayment, setSelectedPayment] = useState<PaymentApproval | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pendingPayments, isLoading } = useQuery({
    queryKey: ['/api/payments/pending'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const approvePaymentMutation = useMutation({
    mutationFn: async (paymentId: number) => {
      return await apiRequest('POST', '/api/payments/approve', { paymentId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payments/pending'] });
      toast({
        title: "Payment Approved",
        description: "Payment has been released to the service provider",
      });
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Approval Error",
        description: error.message || "Failed to approve payment",
        variant: "destructive",
      });
    },
  });

  const rejectPaymentMutation = useMutation({
    mutationFn: async ({ paymentId, reason }: { paymentId: number; reason: string }) => {
      return await apiRequest('POST', '/api/payments/reject', { paymentId, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payments/pending'] });
      toast({
        title: "Payment Rejected",
        description: "Payment has been refunded to the client",
      });
      setIsDialogOpen(false);
      setRejectionReason('');
    },
    onError: (error) => {
      toast({
        title: "Rejection Error",
        description: error.message || "Failed to reject payment",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (paymentId: number) => {
    approvePaymentMutation.mutate(paymentId);
  };

  const handleReject = (paymentId: number, reason: string) => {
    if (!reason.trim()) {
      toast({
        title: "Rejection Reason Required",
        description: "Please provide a reason for rejecting the payment",
        variant: "destructive",
      });
      return;
    }
    rejectPaymentMutation.mutate({ paymentId, reason });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'held': return 'bg-blue-500';
      case 'approved': return 'bg-green-500';
      case 'released': return 'bg-emerald-500';
      case 'refunded': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Payment Approvals</h2>
          <p className="text-muted-foreground">Review and approve work completion payments</p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {pendingPayments?.length || 0} Pending
        </Badge>
      </div>

      {!pendingPayments || pendingPayments.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No Pending Approvals</h3>
              <p className="text-muted-foreground">All payments have been processed</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {pendingPayments.map((payment: PaymentApproval) => (
            <Card key={payment.id} className="border-2">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{payment.serviceRequest.title}</CardTitle>
                    <CardDescription className="mt-1">
                      Request #{payment.serviceRequestId} • {payment.serviceRequest.location}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(payment.status)}>
                    {payment.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Client and Provider Info */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Client
                    </h4>
                    <p className="text-sm">
                      {payment.client.firstName} {payment.client.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">{payment.client.email}</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Service Provider
                    </h4>
                    <p className="text-sm">
                      {payment.provider.user.firstName} {payment.provider.user.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">{payment.provider.user.email}</p>
                    <p className="text-sm text-muted-foreground">
                      Rate: ${payment.provider.hourlyRate}/hour
                    </p>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Payment Details
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Service Amount</p>
                      <p className="font-semibold">${payment.amount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Platform Fee</p>
                      <p className="font-semibold">${payment.platformFee.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tax</p>
                      <p className="font-semibold">${payment.tax.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Provider Payout</p>
                      <p className="font-semibold text-green-600">${payment.payoutAmount.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* Work Photos */}
                {payment.photos && payment.photos.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Work Completion Photos ({payment.photos.length})
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {payment.photos.map((photo, index) => (
                        <div key={photo.id} className="relative group">
                          <img
                            src={photo.photoUrl}
                            alt={`Work photo ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-75 transition-opacity"
                            onClick={() => window.open(photo.photoUrl, '_blank')}
                          />
                          {photo.description && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <p className="text-white text-xs text-center p-2">{photo.description}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Service Request Details */}
                <div className="space-y-2">
                  <h4 className="font-semibold">Service Description</h4>
                  <p className="text-sm text-muted-foreground">{payment.serviceRequest.description}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4">
                  <Button
                    onClick={() => handleApprove(payment.id)}
                    disabled={approvePaymentMutation.isPending}
                    className="flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve & Release Payment
                  </Button>
                  
                  <Dialog open={isDialogOpen && selectedPayment?.id === payment.id} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="destructive"
                        onClick={() => setSelectedPayment(payment)}
                        disabled={rejectPaymentMutation.isPending}
                        className="flex-1"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject & Refund
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Reject Payment</DialogTitle>
                        <DialogDescription>
                          This will refund the full payment to the client. Please provide a reason for rejection.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="reason">Rejection Reason</Label>
                          <Textarea
                            id="reason"
                            placeholder="Explain why this payment is being rejected..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            rows={4}
                          />
                        </div>
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            This action cannot be undone. The client will be refunded ${payment.totalAmount.toFixed(2)}.
                          </AlertDescription>
                        </Alert>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleReject(payment.id, rejectionReason)}
                            disabled={rejectPaymentMutation.isPending}
                          >
                            Reject & Refund
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}