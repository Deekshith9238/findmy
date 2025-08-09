import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  User,
  Calendar,
  Eye,
  X,
  Check,
  Loader2
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ServiceVerifierDashboard() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("pending");
  const { toast } = useToast();

  // Redirect if not service verifier
  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'service_verifier')) {
      navigate('/');
    }
  }, [user, isLoading, navigate]);

  // Fetch providers needing verification
  const { data: pendingProviders, isLoading: pendingLoading, refetch: refetchPending } = useQuery({
    queryKey: ['/api/providers/pending-verification'],
    enabled: !!user && user.role === 'service_verifier',
  });

  // Fetch recently verified providers
  const { data: recentlyVerified, isLoading: verifiedLoading, refetch: refetchRecent, error: recentError } = useQuery({
    queryKey: ['/api/providers/recently-verified'],
    enabled: !!user && user.role === 'service_verifier',
    onSuccess: (data) => {
      if (data && data.length > 0) {
      }
    },
    onError: (error) => {
      console.error('❌ Error fetching recently verified providers:', error);
    }
  });

  // Fetch verification statistics
  const { data: verificationStats } = useQuery({
    queryKey: ['/api/verification/stats'],
    enabled: !!user && user.role === 'service_verifier',
  });

  // Handle document verification
  const handleVerifyDocument = async (documentId: number, status: 'approved' | 'rejected', notes?: string) => {
    try {
      await apiRequest('PUT', `/api/verification/documents/${documentId}`, {
        verificationStatus: status,
        notes: notes || '',
        verifiedBy: user?.id,
        verifiedAt: new Date().toISOString()
      });

      toast({
        title: "Document verification updated",
        description: `Document ${status} successfully`,
      });

      refetchPending();
      refetchRecent();
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Handle provider verification
  const handleVerifyProvider = async (providerId: number, status: 'verified' | 'rejected', reason?: string) => {
    try {
      await apiRequest('PUT', `/api/providers/${providerId}/verification`, {
        verificationStatus: status,
        rejectionReason: reason || '',
        verifiedBy: user?.id,
        verifiedAt: new Date().toISOString()
      });

      toast({
        title: "Provider verification updated",
        description: `Provider ${status} successfully`,
      });

      refetchPending();
      refetchRecent();
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Handle document viewing
  const handleViewDocument = (documentUrl: string, documentType: string, documentId: number) => {
    if (!documentUrl) {
      toast({
        title: "Document not available",
        description: "This document URL is not available",
        variant: "destructive",
      });
      return;
    }

    // Use the new document serving endpoint
    const documentViewUrl = `/api/documents/${documentId}/view`;
    window.open(documentViewUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || user.role !== 'service_verifier') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Service Verifier Dashboard</h1>
              <p className="text-gray-600 mt-1">Review and verify service provider documents</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Welcome back,</p>
                <p className="font-semibold">{user.firstName} {user.lastName}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
                {user.firstName[0]}{user.lastName[0]}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Verification</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {verificationStats?.pending || 0}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Verified Today</p>
                  <p className="text-2xl font-bold text-green-600">
                    {verificationStats?.verifiedToday || 0}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Verified</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {verificationStats?.totalVerified || 0}
                  </p>
                </div>
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">
                    {verificationStats?.rejected || 0}
                  </p>
                </div>
                <X className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending" className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Pending Verification</span>
              {pendingProviders && pendingProviders.length > 0 && (
                <Badge variant="secondary">{pendingProviders.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="recent" className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4" />
              <span>Recently Verified</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-6">
            {pendingLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : pendingProviders && pendingProviders.length > 0 ? (
              <div className="grid gap-6">
                {pendingProviders.map((provider: any) => (
                  <Card key={provider.id} className="border-l-4 border-l-orange-500">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
                            {provider.user?.firstName?.[0] || '?'}{provider.user?.lastName?.[0] || '?'}
                          </div>
                          <div>
                            <CardTitle className="text-lg">
                              {provider.user?.firstName || 'Unknown'} {provider.user?.lastName || 'User'}
                            </CardTitle>
                            <p className="text-gray-600">{provider.user?.email || 'No email'}</p>
                            <p className="text-sm text-gray-500">
                              Category: {provider.category?.name || 'Unknown'} • Rate: ${provider.hourlyRate || 0}/hr
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-orange-600 border-orange-600">
                            Pending Verification
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold mb-2">Documents Submitted:</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {provider.documents && provider.documents.length > 0 ? (
                              provider.documents.map((doc: any) => (
                                <div key={doc.id} className="border rounded-lg p-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium capitalize">
                                      {doc.documentType?.replace('_', ' ') || 'Unknown Document'}
                                    </span>
                                    <Badge variant={doc.verificationStatus === 'pending' ? 'secondary' : 'default'}>
                                      {doc.verificationStatus || 'pending'}
                                    </Badge>
                                  </div>
                                  {doc.documentUrl && (
                                    <div className="mb-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleViewDocument(doc.documentUrl, doc.documentType, doc.id)}
                                      >
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Document
                                      </Button>
                                    </div>
                                  )}
                                  <div className="flex space-x-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleVerifyDocument(doc.id, 'approved')}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      <Check className="h-4 w-4 mr-1" />
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        const reason = prompt('Rejection reason:');
                                        if (reason) {
                                          handleVerifyDocument(doc.id, 'rejected', reason);
                                        }
                                      }}
                                    >
                                      <X className="h-4 w-4 mr-1" />
                                      Reject
                                    </Button>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="col-span-2 text-center py-4 text-gray-500">
                                No documents found for this provider
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex justify-end space-x-2 pt-4 border-t">
                          <Button
                            onClick={() => handleVerifyProvider(provider.id, 'verified')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Verify Provider
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              const reason = prompt('Rejection reason:');
                              if (reason) {
                                handleVerifyProvider(provider.id, 'rejected', reason);
                              }
                            }}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Reject Provider
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Pending Verifications</h3>
                  <p className="text-gray-600">All service providers have been reviewed!</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="recent" className="space-y-6">
            {verifiedLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : recentlyVerified && recentlyVerified.length > 0 ? (
              <div className="grid gap-4">
                {recentlyVerified.map((provider: any) => (
                  <Card key={provider.id} className="border-l-4 border-l-green-500">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
                            {provider.user.firstName[0]}{provider.user.lastName[0]}
                          </div>
                          <div>
                            <h4 className="font-semibold">
                              {provider.user.firstName} {provider.user.lastName}
                            </h4>
                            <p className="text-gray-600">{provider.user.email}</p>
                            <p className="text-sm text-gray-500">
                              Verified on {new Date(provider.verifiedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant="default" className="bg-green-600">
                          Verified
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Recent Verifications</h3>
                  <p className="text-gray-600">No providers have been verified recently.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 