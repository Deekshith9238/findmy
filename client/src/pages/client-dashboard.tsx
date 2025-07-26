import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Task, ServiceRequest } from "@shared/schema";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, FileText, CheckCircle, Clock, X, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import CreateTaskForm from "@/components/CreateTaskForm";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ClientDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("tasks");
  const [createTaskDialogOpen, setCreateTaskDialogOpen] = useState(false);

  // Fetch client work orders (FieldNation-style)
  const { data: workOrders, isLoading: workOrdersLoading } = useQuery<any[]>({
    queryKey: ["/api/work-orders/client"],
    enabled: !!user,
  });

  // Fetch work order bids for client
  const { data: workOrderBids, isLoading: bidsLoading } = useQuery<any[]>({
    queryKey: ["/api/work-orders/client/bids"],
    enabled: !!user,
  });

  // Mutation for updating request status
  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PUT", `/api/service-requests/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests/client"] });
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

  const handleCloseDialog = () => {
    setCreateTaskDialogOpen(false);
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

  return (
    <MainLayout>
      <div className="bg-gray-50 min-h-screen">
        <div className="container mx-auto px-6 py-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Work Order Management</h1>
                <p className="text-lg text-gray-600">
                  Create, track, and manage your field service work orders
                </p>
              </div>
              
              <Dialog open={createTaskDialogOpen} onOpenChange={setCreateTaskDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3">
                    <Plus className="mr-2 h-5 w-5" />
                    Create Work Order
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[550px]">
                  <DialogHeader>
                    <DialogTitle>Create New Work Order</DialogTitle>
                  </DialogHeader>
                  <CreateTaskForm onSuccess={handleCloseDialog} />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Work Orders</p>
                    <p className="text-3xl font-bold text-gray-900">{workOrders?.filter(wo => wo.status === 'open' || wo.status === 'in_progress').length || 0}</p>
                    <p className="text-sm text-blue-600 mt-1">In progress</p>
                  </div>
                  <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Clock className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Completed Jobs</p>
                    <p className="text-3xl font-bold text-gray-900">{workOrders?.filter(wo => wo.status === 'completed').length || 0}</p>
                    <p className="text-sm text-green-600 mt-1">This month</p>
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
                    <p className="text-3xl font-bold text-gray-900">96%</p>
                    <p className="text-sm text-green-600 mt-1">Above average</p>
                  </div>
                  <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                    <p className="text-3xl font-bold text-gray-900">{workOrderBids?.filter(b => b.status === 'pending').length || 0}</p>
                    <p className="text-sm text-orange-600 mt-1">Need attention</p>
                  </div>
                  <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* FieldNation-style Professional Navigation */}
          <div className="bg-white rounded-lg shadow-sm border mb-8">
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab("tasks")}
                className={`px-6 py-4 font-medium border-b-2 transition-colors ${
                  activeTab === "tasks"
                    ? "border-blue-600 text-blue-600 bg-blue-50"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Work Orders ({workOrders?.length || 0})
                </div>
              </button>
              <button
                onClick={() => setActiveTab("requests")}
                className={`px-6 py-4 font-medium border-b-2 transition-colors ${
                  activeTab === "requests"
                    ? "border-blue-600 text-blue-600 bg-blue-50"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Bids & Assignments ({workOrderBids?.length || 0})
                </div>
              </button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            
            <TabsContent value="tasks">
              {tasksLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : tasks && tasks.length > 0 ? (
                <div className="grid gap-6">
                  {tasks.map((task) => (
                    <Card key={task.id} className="overflow-hidden">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">{task.title}</h3>
                              {getStatusBadge(task.status)}
                            </div>
                            <p className="text-neutral-600 text-sm mb-4">{task.description}</p>
                            <div className="flex flex-wrap gap-4">
                              <div className="text-sm">
                                <span className="font-medium">Category:</span>{" "}
                                <span className="text-neutral-600">{task.category.name}</span>
                              </div>
                              <div className="text-sm">
                                <span className="font-medium">Location:</span>{" "}
                                <span className="text-neutral-600">{task.location}</span>
                              </div>
                              {task.budget && (
                                <div className="text-sm">
                                  <span className="font-medium">Budget:</span>{" "}
                                  <span className="text-neutral-600">${task.budget}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex md:flex-col gap-2 justify-end">
                            <span className="text-xs text-neutral-500">
                              Posted on {new Date(task.createdAt).toLocaleDateString()}
                            </span>
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
                    <h3 className="text-xl font-medium mb-2">No tasks yet</h3>
                    <p className="text-neutral-600 mb-6">Create your first task to find service providers</p>
                    <Button 
                      onClick={() => setCreateTaskDialogOpen(true)} 
                      className="px-6"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Task
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="requests">
              {requestsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : serviceRequests && serviceRequests.length > 0 ? (
                <div className="grid gap-6">
                  {serviceRequests.map((request) => (
                    <Card key={request.id} className="overflow-hidden">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">
                                Service Request from{" "}
                                {request.provider.user.firstName} {request.provider.user.lastName}
                              </h3>
                              {getStatusBadge(request.status)}
                            </div>
                            
                            <p className="text-neutral-600 text-sm mb-4">{request.message || "No additional message provided"}</p>
                            
                            <div className="flex flex-wrap gap-4">
                              <div className="text-sm">
                                <span className="font-medium">Service:</span>{" "}
                                <span className="text-neutral-600">{request.provider.category.name}</span>
                              </div>
                              <div className="text-sm">
                                <span className="font-medium">Rate:</span>{" "}
                                <span className="text-neutral-600">${request.provider.hourlyRate}/hr</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            <div className="text-xs text-neutral-500 mb-2">
                              Requested on {new Date(request.createdAt).toLocaleDateString()}
                            </div>
                            
                            {request.status === "pending" && (
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="default"
                                  onClick={() => handleUpdateRequest(request.id, "accepted")}
                                  disabled={updateRequestMutation.isPending}
                                >
                                  <CheckCircle className="mr-1 h-4 w-4" />
                                  Accept
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => handleUpdateRequest(request.id, "rejected")}
                                  disabled={updateRequestMutation.isPending}
                                >
                                  <X className="mr-1 h-4 w-4" />
                                  Decline
                                </Button>
                              </div>
                            )}
                            
                            {request.status === "accepted" && (
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  onClick={() => handleUpdateRequest(request.id, "completed")}
                                  disabled={updateRequestMutation.isPending}
                                >
                                  <CheckCircle className="mr-1 h-4 w-4" />
                                  Mark Completed
                                </Button>
                              </div>
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
                    <Clock className="h-12 w-12 text-neutral-400 mb-4" />
                    <h3 className="text-xl font-medium mb-2">No service requests yet</h3>
                    <p className="text-neutral-600">
                      Service requests will appear here when providers respond to your tasks
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}
