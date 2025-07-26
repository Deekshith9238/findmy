import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import WorkOrderCard from '@/components/WorkOrderCard';
import BidSubmissionDialog from '@/components/BidSubmissionDialog';
import CreateWorkOrderForm from '@/components/CreateWorkOrderForm';
import { useAuth } from '@/hooks/use-auth';
import { 
  Search, 
  Filter, 
  MapPin, 
  Plus, 
  TrendingUp, 
  Clock, 
  DollarSign,
  Briefcase,
  Target
} from 'lucide-react';

interface WorkOrder {
  id: number;
  title: string;
  description: string;
  jobType: string;
  budget: number;
  isBudgetFlexible: boolean;
  siteAddress: string;
  siteCity: string;
  siteState: string;
  preferredStartDate?: string;
  estimatedDuration?: number;
  experienceLevel: string;
  status: string;
  createdAt: string;
  allowBidding: boolean;
  skillsRequired?: string;
  distance?: number;
  client?: {
    firstName: string;
    lastName: string;
  };
  category?: {
    name: string;
  };
  bids?: Array<{
    id: number;
    bidAmount: number;
    status: string;
  }>;
}

export default function WorkOrdersPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedJobType, setSelectedJobType] = useState<string>('');
  const [sortBy, setSortBy] = useState('newest');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Fetch available work orders for providers
  const { data: availableWorkOrders = [], isLoading: isLoadingAvailable } = useQuery<WorkOrder[]>({
    queryKey: ['/api/work-orders/available', selectedCategory],
    enabled: user?.role === 'service_provider',
  });

  // Fetch client's work orders
  const { data: clientWorkOrders = [], isLoading: isLoadingClient } = useQuery<WorkOrder[]>({
    queryKey: ['/api/work-orders/client'],
    enabled: user?.role === 'client',
  });

  // Fetch assigned work orders for providers
  const { data: assignedWorkOrders = [], isLoading: isLoadingAssigned } = useQuery<WorkOrder[]>({
    queryKey: ['/api/provider/work-orders'],
    enabled: user?.role === 'service_provider',
  });

  // Fetch categories for filtering
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
  });

  const jobTypes = [
    { value: 'installation', label: 'Installation' },
    { value: 'repair', label: 'Repair' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'setup', label: 'Setup' },
    { value: 'troubleshooting', label: 'Troubleshooting' },
    { value: 'inspection', label: 'Inspection' },
    { value: 'consultation', label: 'Consultation' },
  ];

  // Filter and sort work orders
  const filterWorkOrders = (workOrders: WorkOrder[]) => {
    let filtered = workOrders.filter(wo => {
      const matchesSearch = wo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          wo.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || wo.category?.name === selectedCategory;
      const matchesJobType = !selectedJobType || wo.jobType === selectedJobType;
      
      return matchesSearch && matchesCategory && matchesJobType;
    });

    // Sort work orders
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'budget-high':
        filtered.sort((a, b) => b.budget - a.budget);
        break;
      case 'budget-low':
        filtered.sort((a, b) => a.budget - b.budget);
        break;
      case 'distance':
        filtered.sort((a, b) => (a.distance || 999) - (b.distance || 999));
        break;
    }

    return filtered;
  };

  const filteredAvailable = filterWorkOrders(availableWorkOrders);
  const filteredClient = filterWorkOrders(clientWorkOrders);
  const filteredAssigned = filterWorkOrders(assignedWorkOrders);

  // Stats for dashboard
  const stats = {
    totalAvailable: availableWorkOrders.length,
    averageBudget: availableWorkOrders.length > 0 
      ? availableWorkOrders.reduce((sum, wo) => sum + wo.budget, 0) / availableWorkOrders.length 
      : 0,
    myActiveJobs: assignedWorkOrders.filter(wo => ['assigned', 'in_progress'].includes(wo.status)).length,
    pendingBids: clientWorkOrders.reduce((sum, wo) => sum + (wo.bids?.filter(b => b.status === 'pending').length || 0), 0),
  };

  if (showCreateForm) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Post New Work Order</h1>
          <Button variant="outline" onClick={() => setShowCreateForm(false)}>
            Back to Work Orders
          </Button>
        </div>
        <CreateWorkOrderForm onSuccess={() => setShowCreateForm(false)} />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Work Orders</h1>
          <p className="text-muted-foreground">
            {user?.role === 'service_provider' 
              ? 'Find and bid on work orders that match your skills'
              : 'Manage your posted work orders and review bids'
            }
          </p>
        </div>
        {user?.role === 'client' && (
          <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Post Work Order
          </Button>
        )}
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {user?.role === 'service_provider' ? 'Available Jobs' : 'Posted Jobs'}
            </CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {user?.role === 'service_provider' ? stats.totalAvailable : clientWorkOrders.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {user?.role === 'service_provider' ? 'Active Jobs' : 'Pending Bids'}
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {user?.role === 'service_provider' ? stats.myActiveJobs : stats.pendingBids}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.averageBudget.toFixed(0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {availableWorkOrders.filter(wo => 
                new Date(wo.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
              ).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search work orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                {categories.map((category: any) => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedJobType} onValueChange={setSelectedJobType}>
              <SelectTrigger>
                <SelectValue placeholder="All Job Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Job Types</SelectItem>
                {jobTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="budget-high">Highest Budget</SelectItem>
                <SelectItem value="budget-low">Lowest Budget</SelectItem>
                {user?.role === 'service_provider' && (
                  <SelectItem value="distance">Closest First</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Work Orders Tabs */}
      <Tabs defaultValue={user?.role === 'service_provider' ? 'available' : 'posted'} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          {user?.role === 'service_provider' && (
            <>
              <TabsTrigger value="available">
                Available Jobs ({filteredAvailable.length})
              </TabsTrigger>
              <TabsTrigger value="assigned">
                My Active Jobs ({filteredAssigned.length})
              </TabsTrigger>
              <TabsTrigger value="bids">
                My Bids
              </TabsTrigger>
            </>
          )}
          {user?.role === 'client' && (
            <>
              <TabsTrigger value="posted">
                Posted Jobs ({filteredClient.length})
              </TabsTrigger>
              <TabsTrigger value="active">
                Active Jobs
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed Jobs
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* Available Work Orders for Providers */}
        {user?.role === 'service_provider' && (
          <TabsContent value="available" className="space-y-6">
            {isLoadingAvailable ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : filteredAvailable.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Briefcase className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No work orders found</h3>
                  <p className="text-muted-foreground text-center">
                    {searchTerm || selectedCategory || selectedJobType 
                      ? "Try adjusting your filters to find more opportunities."
                      : "No work orders are currently available in your area."
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredAvailable.map((workOrder) => (
                  <BidSubmissionDialog
                    key={workOrder.id}
                    workOrder={workOrder}
                    trigger={
                      <div>
                        <WorkOrderCard
                          workOrder={workOrder}
                          showBidButton={true}
                          variant="provider"
                        />
                      </div>
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>
        )}

        {/* Assigned Work Orders for Providers */}
        {user?.role === 'service_provider' && (
          <TabsContent value="assigned" className="space-y-6">
            {isLoadingAssigned ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : filteredAssigned.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No active jobs</h3>
                  <p className="text-muted-foreground">
                    You don't have any assigned work orders at the moment.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredAssigned.map((workOrder) => (
                  <WorkOrderCard
                    key={workOrder.id}
                    workOrder={workOrder}
                    variant="provider"
                  />
                ))}
              </div>
            )}
          </TabsContent>
        )}

        {/* Posted Work Orders for Clients */}
        {user?.role === 'client' && (
          <TabsContent value="posted" className="space-y-6">
            {isLoadingClient ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : filteredClient.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Plus className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No work orders posted</h3>
                  <p className="text-muted-foreground mb-4">
                    Get started by posting your first work order.
                  </p>
                  <Button onClick={() => setShowCreateForm(true)}>
                    Post Work Order
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredClient.map((workOrder) => (
                  <WorkOrderCard
                    key={workOrder.id}
                    workOrder={workOrder}
                    variant="client"
                  />
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}