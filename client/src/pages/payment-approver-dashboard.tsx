import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  DollarSign, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  FileText,
  TrendingUp,
  Users,
  Calendar,
  ArrowLeft
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import PaymentApprovalDashboard from "@/components/PaymentApprovalDashboard";

export default function PaymentApproverDashboard() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("pending");

  // Redirect if not payment approver
  useEffect(() => {
    if (!isLoading && (!user || (user.role !== 'payment_approver' && user.role !== 'admin'))) {
      navigate('/');
    }
  }, [user, isLoading, navigate]);

  // Fetch payment statistics
  const { data: paymentStats } = useQuery({
    queryKey: ['/api/payments/stats'],
    enabled: !!user && (user.role === 'payment_approver' || user.role === 'admin'),
  });

  // Fetch recent activity
  const { data: recentActivity } = useQuery({
    queryKey: ['/api/payments/recent-activity'],
    enabled: !!user && (user.role === 'payment_approver' || user.role === 'admin'),
  });

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
            <div className="flex items-center gap-3 mb-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Button>
              <Shield className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Payment Approver Dashboard</h1>
                <p className="text-muted-foreground">
                  Welcome, {user.firstName}! Manage payment approvals and transaction oversight.
                </p>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Clock className="h-8 w-8 text-orange-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Pending Approvals</p>
                      <p className="text-2xl font-bold">{paymentStats?.pending || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Approved Today</p>
                      <p className="text-2xl font-bold">{paymentStats?.approvedToday || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Approved</p>
                      <p className="text-2xl font-bold">${paymentStats?.totalApproved || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">This Month</p>
                      <p className="text-2xl font-bold">{paymentStats?.thisMonth || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Role Information */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Payment Approver Responsibilities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="font-semibold">Review Work Completion</div>
                    <p className="text-muted-foreground">
                      Verify provider work photos and completion documentation
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="font-semibold">Approve Payments</div>
                    <p className="text-muted-foreground">
                      Release escrowed funds to service providers after verification
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="font-semibold">Handle Disputes</div>
                    <p className="text-muted-foreground">
                      Resolve payment disputes and quality issues between clients and providers
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending">Pending Approvals</TabsTrigger>
              <TabsTrigger value="history">Approval History</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Pending Payment Approvals</h2>
                <Badge variant="outline" className="text-orange-600">
                  {paymentStats?.pending || 0} pending
                </Badge>
              </div>
              <PaymentApprovalDashboard />
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Approval History</h2>
              </div>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Payment History</h3>
                    <p className="text-muted-foreground">View all your approved and rejected payments</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Payment Analytics</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Monthly Trends
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Payment trend analytics coming soon</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Provider Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Provider performance metrics coming soon</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}