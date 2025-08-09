import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, Clock, X, User, MapPin, DollarSign } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function CallCenterDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch pending service requests that need call center approval
  const { data: pendingRequests, isLoading } = useQuery<any[]>({
    queryKey: ["/api/call-center/pending-requests"],
    enabled: !!user && (user.role === 'call_center' || user.role === 'admin'),
  });

  // Mutation for approving service requests
  const approveRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      return apiRequest("POST", `/api/call-center/service-requests/${requestId}/approve`, {});
    },
    onSuccess: () => {
      toast({
        title: "Request Approved",
        description: "Service request approved. Client details released to provider."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/call-center/pending-requests"] });
    },
    onError: (error: any) => {
      toast({
        title: "Approval Failed",
        description: error.message || "An error occurred while approving the request.",
        variant: "destructive",
      });
    },
  });

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "assigned_to_call_center":
        return <Badge className="bg-yellow-500">Pending Approval</Badge>;
      case "approved":
        return <Badge className="bg-green-500">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="bg-gray-50 min-h-screen">
        <div className="container mx-auto px-6 py-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Call Center Dashboard</h1>
                <p className="text-lg text-gray-600">
                  Review and approve service provider requests for client details
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="bg-white rounded-lg px-4 py-2 shadow-sm border">
                  <div className="text-sm text-gray-500">Pending Requests</div>
                  <div className="font-semibold text-gray-900">{pendingRequests?.length || 0}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Pending Requests */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900">Pending Approvals</h2>
            
            {pendingRequests && pendingRequests.length > 0 ? (
              <div className="grid gap-6">
                {pendingRequests.map((request) => (
                  <Card key={request.id} className="overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-4">
                            <h3 className="font-semibold text-lg">{request.task?.title || "Task"}</h3>
                            {getStatusBadge(request.status)}
                          </div>
                          
                          {request.task?.description && (
                            <p className="text-neutral-600 text-sm mb-4">{request.task.description}</p>
                          )}
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="p-3 bg-blue-50 rounded-md">
                              <div className="text-sm font-medium text-blue-900 mb-1">Provider Details:</div>
                              <div className="text-sm text-blue-800">
                                <div><strong>Name:</strong> {request.provider?.user?.firstName} {request.provider?.user?.lastName}</div>
                                <div><strong>Category:</strong> {request.provider?.category?.name}</div>
                                <div><strong>Hourly Rate:</strong> ${request.provider?.hourlyRate}/hr</div>
                              </div>
                            </div>
                            
                            <div className="p-3 bg-green-50 rounded-md">
                              <div className="text-sm font-medium text-green-900 mb-1">Client Details:</div>
                              <div className="text-sm text-green-800">
                                <div><strong>Name:</strong> {request.client?.firstName} {request.client?.lastName}</div>
                                <div><strong>Email:</strong> {request.client?.email}</div>
                                <div><strong>Phone:</strong> {request.client?.phoneNumber || 'Not provided'}</div>
                              </div>
                            </div>
                            
                            <div className="p-3 bg-purple-50 rounded-md">
                              <div className="text-sm font-medium text-purple-900 mb-1">Task Details:</div>
                              <div className="text-sm text-purple-800">
                                <div><strong>Location:</strong> {request.task?.location || 'Not specified'}</div>
                                {request.task?.budget && (
                                  <div><strong>Budget:</strong> ${request.task.budget}</div>
                                )}
                                {request.task?.estimatedHours && (
                                  <div><strong>Estimated Hours:</strong> {request.task.estimatedHours} hours</div>
                                )}
                                <div><strong>Posted:</strong> {new Date(request.task?.createdAt).toLocaleDateString()}</div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Additional Task Details */}
                          {(request.task?.toolsRequired || request.task?.skillsRequired) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              {request.task?.toolsRequired && (
                                <div className="p-3 bg-orange-50 rounded-md">
                                  <div className="text-sm font-medium text-orange-900 mb-1">Tools Required:</div>
                                  <div className="text-sm text-orange-800">{request.task.toolsRequired}</div>
                                </div>
                              )}
                              
                              {request.task?.skillsRequired && (
                                <div className="p-3 bg-indigo-50 rounded-md">
                                  <div className="text-sm font-medium text-indigo-900 mb-1">Skills Required:</div>
                                  <div className="text-sm text-indigo-800">{request.task.skillsRequired}</div>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {request.message && (
                            <div className="p-3 bg-gray-50 rounded-md mb-4">
                              <div className="text-sm font-medium mb-1">Provider Message:</div>
                              <div className="text-sm text-gray-700">{request.message}</div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <span className="text-xs text-neutral-500">
                            Requested on {new Date(request.createdAt).toLocaleDateString()}
                          </span>
                          
                          <Button 
                            onClick={() => approveRequestMutation.mutate(request.id)}
                            disabled={approveRequestMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {approveRequestMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Approving...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Approve & Release Details
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-white">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="h-12 w-12 text-neutral-400 mb-4" />
                  <h3 className="text-xl font-medium mb-2">No pending approvals</h3>
                  <p className="text-neutral-600">
                    All service provider requests have been processed.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 