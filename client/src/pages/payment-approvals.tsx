import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { useEffect } from 'react';
import PaymentApprovalDashboard from '@/components/PaymentApprovalDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, AlertCircle } from 'lucide-react';

export default function PaymentApprovalsPage() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && (!user || (user.role !== 'payment_approver' && user.role !== 'admin'))) {
      navigate('/dashboard');
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || (user.role !== 'payment_approver' && user.role !== 'admin')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Payment Approvals</h1>
                <p className="text-muted-foreground">
                  Review and approve service completion payments
                </p>
              </div>
            </div>
            
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertCircle className="w-5 h-5" />
                  Payment Approval Process
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="font-semibold">1. Service Completion</div>
                    <p className="text-muted-foreground">
                      Provider submits work photos and completion details
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="font-semibold">2. Review & Approval</div>
                    <p className="text-muted-foreground">
                      Review work quality and approve or reject payment
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="font-semibold">3. Payment Release</div>
                    <p className="text-muted-foreground">
                      Approved payments are released to provider's bank account
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Approval Dashboard */}
          <PaymentApprovalDashboard />
        </div>
      </div>
    </div>
  );
}