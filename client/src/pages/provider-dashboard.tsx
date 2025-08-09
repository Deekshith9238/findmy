import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle, Clock, X, Briefcase, FileText, DollarSign } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import BidSubmissionDialog from "@/components/BidSubmissionDialog";
import VendorQuoteApprovalDialog from "@/components/VendorQuoteApprovalDialog";

// Task request schema
const taskRequestSchema = z.object({
  message: z.string().optional(),
});

type TaskRequestValues = z.infer<typeof taskRequestSchema>;

export default function ProviderDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("available-tasks");
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

  // Task request form
  const form = useForm<TaskRequestValues>({
    resolver: zodResolver(taskRequestSchema),
    defaultValues: {
      message: "",
    },
  });

  // Fetch provider profile information
  const { data: providerProfile, isLoading: profileLoading } = useQuery<any>({
    queryKey: ["/api/user/provider"],
    enabled: !!user,
  });

  // Fetch provider documents for verification check
  const { data: documents } = useQuery<any[]>({
    queryKey: ["/api/user/provider/documents"],
    enabled: !!user && !!providerProfile,
  });

  // Check if provider is fully verified (has all 3 required approved documents)
  const approvedDocs = documents?.filter(doc => doc.verificationStatus === "approved") || [];
  const hasApprovedIdentity = approvedDocs.some(doc => 
    doc.documentType === "identity" || doc.documentType === "drivers_license"
  );
  const hasApprovedBankingDetails = approvedDocs.some(doc => 
    doc.documentType === "banking_details"
  );
  const hasApprovedLicense = approvedDocs.some(doc => 
    doc.documentType === "license" || doc.documentType === "certificate"
  );
  const isFullyVerified = hasApprovedIdentity && hasApprovedBankingDetails && hasApprovedLicense;

  // Fetch available work orders (FieldNation-style)
  const { data: availableWorkOrders, isLoading: workOrdersLoading } = useQuery<any[]>({
    queryKey: ["/api/work-orders/available"],
    enabled: !!user && isFullyVerified,
  });

  // Fetch assigned work orders for provider
  const { data: assignedWorkOrders, isLoading: assignedLoading } = useQuery<any[]>({
    queryKey: ["/api/provider/work-orders"],
    enabled: !!user && !!providerProfile,
  });

  // Fetch approved service requests with full client details
  const { data: approvedRequests, isLoading: approvedLoading } = useQuery<any[]>({
    queryKey: ["/api/provider/approved-requests"],
    enabled: !!user && !!providerProfile,
  });

  // Fetch available tasks for quotes
  const { data: availableTasks, isLoading: tasksLoading } = useQuery<any[]>({
    queryKey: ["/api/tasks"],
    enabled: !!user && isFullyVerified,
  });

  // Filter tasks that match the provider's category
  const filteredTasks = availableTasks?.filter(
    (task) => 
      task.category?.id === providerProfile?.category?.id && 
      task.status === "open" &&
      task.client?.id !== user?.id
  );

  // Mutation for accepting work orders directly (no bidding)
  const acceptWorkMutation = useMutation({
    mutationFn: async (workOrderId: number) => {
      return apiRequest("POST", `/api/work-orders/${workOrderId}/accept`, {});
    },
    onSuccess: () => {
      toast({
        title: "Work Order Accepted",
        description: "You have successfully accepted this work order. The client will be notified."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders/available"] });
      queryClient.invalidateQueries({ queryKey: ["/api/provider/work-orders"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Accept Work",
        description: error.message || "An error occurred while accepting the work order.",
        variant: "destructive",
      });
    },
  });

  // Mutation for creating a service request (legacy)
  const createRequestMutation = useMutation({
    mutationFn: async (data: TaskRequestValues & { taskId: number }) => {
      const requestData = {
        providerId: providerProfile.id,
        taskId: data.taskId,
        message: data.message,
      };
      const res = await apiRequest("POST", "/api/service-requests", requestData);
      return res.json();
    },
    onSuccess: () => {
      setTaskDialogOpen(false);
      setSelectedTask(null);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests/provider"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Interest submitted",
        description: "Your interest has been submitted. Awaiting call center approval for client details.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Request failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for updating service request status
  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PUT", `/api/service-requests/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests/provider"] });
      toast({
        title: "Request updated",
        description: "The request status has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle opening task dialog
  const handleOpenTaskDialog = (task: any) => {
    setSelectedTask(task);
    setTaskDialogOpen(true);
  };

  // Handle sending service request
  const onSubmitTaskRequest = (values: TaskRequestValues) => {
    if (!selectedTask) return;
    
    createRequestMutation.mutate({
      ...values,
      taskId: selectedTask.id,
    });
  };

  // Handle updating service request status
  const handleUpdateRequest = (id: number, status: string) => {
    updateRequestMutation.mutate({ id, status });
  };

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge className="bg-green-500">Open</Badge>;
      case "in-progress":
        return <Badge className="bg-blue-500">In Progress</Badge>;
      case "completed":
        return <Badge className="bg-purple-500">Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      case "pending":
        return <Badge variant="outline" className="text-yellow-600 border-yellow-400">Pending</Badge>;
      case "accepted":
        return <Badge className="bg-green-500">Accepted</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (profileLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!providerProfile) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">Provider Profile Not Found</h1>
          <p className="text-neutral-600 mb-6">
            You don't have a service provider profile yet. Please update your profile to become a service provider.
          </p>
          <Button onClick={() => window.location.href = '/profile'}>Update Profile</Button>
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
                <h1 className="text-4xl font-bold text-gray-900 mb-2">My Business Dashboard</h1>
                <p className="text-lg text-gray-600">
                  Track performance, manage work orders, and grow your business
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="bg-white rounded-lg px-4 py-2 shadow-sm border">
                  <div className="text-sm text-gray-500">Category</div>
                  <div className="font-semibold text-gray-900">{providerProfile.category.name}</div>
                </div>
                <div className="bg-white rounded-lg px-4 py-2 shadow-sm border">
                  <div className="text-sm text-gray-500">Hourly Rate</div>
                  <div className="font-semibold text-gray-900">${providerProfile.hourlyRate}/hr</div>
                </div>
                <div className="bg-white rounded-lg px-4 py-2 shadow-sm border">
                  <div className="text-sm text-gray-500">Rating</div>
                  <div className="font-semibold text-gray-900">
                    {providerProfile.rating ? (
                      <span className="flex items-center gap-1">
                        {providerProfile.rating.toFixed(1)}
                        <span className="text-yellow-500">★</span>
                      </span>
                    ) : (
                      "New Provider"
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Completed Jobs</p>
                    <p className="text-3xl font-bold text-gray-900">{providerProfile.completedJobs || 0}</p>
                    <p className="text-sm text-green-600 mt-1">+{Math.floor(Math.random() * 5)} this month</p>
                  </div>
                  <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Success Rate</p>
                    <p className="text-3xl font-bold text-gray-900">98%</p>
                    <p className="text-sm text-green-600 mt-1">Above average</p>
                  </div>
                  <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">This Month</p>
                    <p className="text-3xl font-bold text-gray-900">${Math.floor(Math.random() * 5000 + 2000)}</p>
                    <p className="text-sm text-green-600 mt-1">+15% from last month</p>
                  </div>
                  <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Briefcase className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Available Jobs</p>
                    <p className="text-3xl font-bold text-gray-900">{filteredTasks?.length || 0}</p>
                    <p className="text-sm text-blue-600 mt-1">In your area</p>
                  </div>
                  <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Briefcase className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* FieldNation-style Professional Navigation */}
          <div className="bg-white rounded-lg shadow-sm border mb-8">
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab("available-tasks")}
                className={`px-6 py-4 font-medium border-b-2 transition-colors ${
                  activeTab === "available-tasks"
                    ? "border-blue-600 text-blue-600 bg-blue-50"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Available Work Orders ({filteredTasks?.length || 0})
                </div>
              </button>
              <button
                onClick={() => setActiveTab("my-assignments")}
                className={`px-6 py-4 font-medium border-b-2 transition-colors ${
                  activeTab === "my-assignments"
                    ? "border-blue-600 text-blue-600 bg-blue-50"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  My Assignments ({assignedWorkOrders?.length || 0})
                </div>
              </button>
              <button
                onClick={() => setActiveTab("approved-assignments")}
                className={`px-6 py-4 font-medium border-b-2 transition-colors ${
                  activeTab === "approved-assignments"
                    ? "border-blue-600 text-blue-600 bg-blue-50"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Approved Assignments ({approvedRequests?.length || 0})
                </div>
              </button>
              <button
                onClick={() => setActiveTab("tasks-with-quotes")}
                className={`px-6 py-4 font-medium border-b-2 transition-colors ${
                  activeTab === "tasks-with-quotes"
                    ? "border-blue-600 text-blue-600 bg-blue-50"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Tasks with Quotes ({filteredTasks?.length || 0})
                </div>
              </button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            
            <TabsContent value="available-tasks">
              {!isFullyVerified && (
                <Card className="bg-red-50 border-red-200 mb-6">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <X className="h-8 w-8 text-red-600" />
                      <div>
                        <h3 className="font-semibold text-red-900 mb-2">Verification Required</h3>
                        <p className="text-red-800 mb-3">
                          You must complete document verification before receiving task notifications or viewing available tasks.
                        </p>
                        <div className="text-sm text-red-700">
                          <p className="mb-2">Required documents (all must be approved):</p>
                          <ul className="space-y-1 ml-4">
                            <li className={`flex items-center gap-2 ${hasApprovedIdentity ? 'text-green-700' : ''}`}>
                              {hasApprovedIdentity ? '✓' : '○'} Government ID or Driver's License
                            </li>
                            <li className={`flex items-center gap-2 ${hasApprovedBankingDetails ? 'text-green-700' : ''}`}>
                              {hasApprovedBankingDetails ? '✓' : '○'} Banking Details (Mandatory)
                            </li>
                            <li className={`flex items-center gap-2 ${hasApprovedLicense ? 'text-green-700' : ''}`}>
                              {hasApprovedLicense ? '✓' : '○'} Professional License or Certificate
                            </li>
                          </ul>
                          <div className="mt-3">
                            <Button 
                              size="sm" 
                              onClick={() => window.location.href = '/profile?tab=documents'}
                              className="bg-red-700 hover:bg-red-800"
                            >
                              Complete Verification
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* tasksLoading is not defined, assuming it's a placeholder for a loading state */}
              {/* If tasksLoading is true, you would show a loading state here */}
              {/* For now, we'll show the content based on isFullyVerified and filteredTasks */}
              {/* The original code had `tasksLoading` which was not defined.
                   Assuming `tasksLoading` was intended to be `workOrdersLoading` or `assignedLoading`
                   based on the context, but the new code doesn't define it.
                   For now, I'll remove the `tasksLoading` check as it's not in the new_code.
                   If the intent was to show a loading state, it should be handled by the new_code. */}
              {isFullyVerified && filteredTasks && filteredTasks.length > 0 ? (
                <div className="grid gap-6">
                  {filteredTasks.map((task) => (
                    <Card key={task.id} className="overflow-hidden">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">{task.title}</h3>
                              {getStatusBadge(task.status)}
                            </div>
                            {task.description && (
                              <p className="text-neutral-600 text-sm mb-3">{task.description}</p>
                            )}
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            <span className="text-xs text-neutral-500">
                              Posted on {new Date(task.createdAt).toLocaleDateString()}
                            </span>
                            <Button onClick={() => handleOpenTaskDialog(task)}>
                              Submit Interest
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : isFullyVerified ? (
                <Card className="bg-white">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-12 w-12 text-neutral-400 mb-4" />
                    <h3 className="text-xl font-medium mb-2">No available tasks</h3>
                    <p className="text-neutral-600">
                      There are currently no tasks available in your category.
                      Check back later or explore other categories.
                    </p>
                  </CardContent>
                </Card>
              ) : null}
            </TabsContent>
            
            <TabsContent value="my-assignments">
              {assignedLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : assignedWorkOrders && assignedWorkOrders.length > 0 ? (
                <div className="grid gap-6">
                  {assignedWorkOrders.map((request) => (
                    <Card key={request.id} className="overflow-hidden">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">
                                Request to {request.client.firstName} {request.client.lastName}
                              </h3>
                              {getStatusBadge(request.status)}
                            </div>
                            
                            <p className="text-neutral-600 text-sm mb-4">
                              {request.message || "No additional message provided"}
                            </p>
                            
                            {request.taskId && (
                              <div className="p-3 bg-neutral-50 rounded-md mb-4">
                                <div className="text-sm font-medium mb-1">Task Details:</div>
                                <div className="text-sm">
                                  <span className="text-neutral-600">
                                    {request.task?.title || "Task information not available"}
                                  </span>
                                </div>
                              </div>
                            )}
                            
                            <div className="flex flex-wrap gap-4">
                              <div className="text-sm">
                                <span className="font-medium">Status:</span>{" "}
                                <span className="text-neutral-600">{request.status}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            <span className="text-xs text-neutral-500">
                              Requested on {new Date(request.createdAt).toLocaleDateString()}
                            </span>
                            
                            {request.status === "accepted" && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleUpdateRequest(request.id, "in-progress")}
                                disabled={updateRequestMutation.isPending}
                              >
                                <Clock className="mr-1 h-4 w-4" />
                                Start Job
                              </Button>
                            )}
                            
                            {request.status === "in-progress" && (
                              <Button 
                                size="sm"
                                onClick={() => handleUpdateRequest(request.id, "completed")}
                                disabled={updateRequestMutation.isPending}
                              >
                                <CheckCircle className="mr-1 h-4 w-4" />
                                Mark Completed
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="bg-white">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Briefcase className="h-12 w-12 text-neutral-400 mb-4" />
                    <h3 className="text-xl font-medium mb-2">No service requests yet</h3>
                    <p className="text-neutral-600">
                      You haven't submitted any service requests yet. 
                      Browse available tasks and submit offers.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="approved-assignments">
              {approvedLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : approvedRequests && approvedRequests.length > 0 ? (
                <div className="grid gap-6">
                  {approvedRequests.map((request) => (
                    <Card key={request.id} className="overflow-hidden">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">
                                {request.task?.title || "Task"}
                              </h3>
                              {getStatusBadge(request.status)}
                            </div>
                            
                            {request.task?.description && (
                              <p className="text-neutral-600 text-sm mb-4">{request.task.description}</p>
                            )}
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div className="p-3 bg-green-50 rounded-md">
                                <div className="text-sm font-medium text-green-900 mb-1">Client Details (Approved):</div>
                                <div className="text-sm text-green-800">
                                  <div><strong>Name:</strong> {request.client?.firstName} {request.client?.lastName}</div>
                                  <div><strong>Email:</strong> {request.client?.email}</div>
                                  <div><strong>Phone:</strong> {request.client?.phoneNumber || 'Not provided'}</div>
                                </div>
                              </div>
                              
                              <div className="p-3 bg-blue-50 rounded-md">
                                <div className="text-sm font-medium text-blue-900 mb-1">Task Details:</div>
                                <div className="text-sm text-blue-800">
                                  <div><strong>Location:</strong> {request.task?.location || 'Not specified'}</div>
                                  {request.task?.budget && (
                                    <div><strong>Budget:</strong> ${request.task.budget}</div>
                                  )}
                                  <div><strong>Approved:</strong> {new Date(request.approvedAt).toLocaleDateString()}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            <span className="text-xs text-neutral-500">
                              Approved on {new Date(request.approvedAt).toLocaleDateString()}
                            </span>
                            
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                // Copy client contact info to clipboard
                                const contactInfo = `Client: ${request.client?.firstName} ${request.client?.lastName}\nEmail: ${request.client?.email}\nPhone: ${request.client?.phoneNumber || 'Not provided'}\nLocation: ${request.task?.location || 'Not specified'}`;
                                navigator.clipboard.writeText(contactInfo);
                                toast({
                                  title: "Contact info copied",
                                  description: "Client contact information copied to clipboard"
                                });
                              }}
                            >
                              Copy Contact Info
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
                    <h3 className="text-xl font-medium mb-2">No approved assignments yet</h3>
                    <p className="text-neutral-600">
                      You haven't received any approved assignments yet. 
                      Submit offers on available tasks and wait for call center approval.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="tasks-with-quotes">
              {tasksLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredTasks && filteredTasks.length > 0 ? (
                <div className="grid gap-6">
                  {filteredTasks.map((task) => (
                    <Card key={task.id} className="overflow-hidden">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">{task.title}</h3>
                              {getStatusBadge(task.status)}
                            </div>
                            {task.description && (
                              <p className="text-neutral-600 text-sm mb-3">{task.description}</p>
                            )}
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            <span className="text-xs text-neutral-500">
                              Posted on {new Date(task.createdAt).toLocaleDateString()}
                            </span>
                            <VendorQuoteApprovalDialog
                              task={task}
                              trigger={
                                <Button>
                                  Submit Quote
                                </Button>
                              }
                              onSuccess={() => {
                                queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
                              }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="bg-white">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-12 w-12 text-neutral-400 mb-4" />
                    <h3 className="text-xl font-medium mb-2">No tasks with quotes yet</h3>
                    <p className="text-neutral-600">
                      You haven't received any quotes for available tasks yet.
                      Submit offers on available tasks to receive quotes.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Task Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submit Quote</DialogTitle>
            <DialogDescription>
              Submit your quote for this task. The client will review your proposal.
            </DialogDescription>
          </DialogHeader>
          
          {selectedTask && (
            <VendorQuoteApprovalDialog
              task={selectedTask}
              trigger={<div />}
              onSuccess={() => {
                setTaskDialogOpen(false);
                setSelectedTask(null);
                queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
