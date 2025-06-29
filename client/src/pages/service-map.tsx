import MainLayout from '@/components/MainLayout';
import ServiceMap from '@/components/ServiceMap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Users, Briefcase, Lock, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';

export default function ServiceMapPage() {
  const { user } = useAuth();
  
  // Check if user is an approved service provider with access to addresses
  const { data: serviceProvider } = useQuery({
    queryKey: ['/api/providers/me'],
    enabled: user?.role === 'service_provider'
  });

  // Check for approved service requests that give map access
  const { data: approvedRequests } = useQuery({
    queryKey: ['/api/service-requests/approved'],
    enabled: user?.role === 'service_provider'
  });

  const hasMapAccess = user?.role === 'service_provider' && 
    serviceProvider?.verificationStatus === 'verified' &&
    (approvedRequests && approvedRequests.length > 0);

  // If not a service provider or not approved, show access denied
  if (!user) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <Card>
              <CardContent className="p-8">
                <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold mb-4">Authentication Required</h2>
                <p className="text-gray-600 mb-6">
                  Please sign in to access the service map.
                </p>
                <Button onClick={() => window.location.href = '/auth'}>
                  Sign In
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (user.role !== 'service_provider' || !hasMapAccess) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <Card>
              <CardContent className="p-8">
                <Shield className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold mb-4">Map Access Restricted</h2>
                <p className="text-gray-600 mb-6">
                  {user.role !== 'service_provider' 
                    ? "Map access is only available to verified service providers who have been approved for tasks."
                    : serviceProvider?.verificationStatus !== 'verified'
                    ? "Your service provider account is pending verification. Map access will be available once verified."
                    : "Map access is granted only after call center approval for specific tasks. You'll receive exact addresses via notifications once approved."
                  }
                </p>
                {user.role !== 'service_provider' && (
                  <Button onClick={() => window.location.href = '/profile'}>
                    Become a Service Provider
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-3">
              <MapPin className="w-8 h-8 text-blue-600" />
              Service Map
            </h1>
            <p className="text-xl text-gray-600 mb-6">
              Discover service providers and available tasks in your area
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-md mx-auto">
              <div className="flex items-center gap-2 text-green-700">
                <Shield className="w-5 h-5" />
                <span className="font-medium">Approved Provider Access</span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                You have access to view exact locations for approved tasks
              </p>
            </div>
          </div>

          {/* How to Use */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="w-5 h-5" />
                How to Use the Map
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="bg-green-100 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Find Service Providers</h3>
                  <p className="text-sm text-gray-600">
                    Green pins show active service providers. Click to see their details, ratings, and hourly rates.
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="bg-blue-100 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <Briefcase className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-2">View Available Tasks</h3>
                  <p className="text-sm text-gray-600">
                    Blue pins show tasks posted by clients. Click to see task details, budget, and location.
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="bg-red-100 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="font-semibold mb-2">See Your Location</h3>
                  <p className="text-sm text-gray-600">
                    Red pin shows your current location. Use this to find nearby services and calculate distances.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interactive Map */}
          <ServiceMap height="600px" />

          {/* Tips */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Map Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Filter by Category</h4>
                  <p className="text-sm text-gray-600">
                    Use the category dropdown to filter services by type (cleaning, plumbing, handyman, etc.).
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Toggle Layers</h4>
                  <p className="text-sm text-gray-600">
                    Use the switches to show or hide service providers and tasks on the map.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Distance Calculation</h4>
                  <p className="text-sm text-gray-600">
                    When you click on a pin, you'll see the distance from your location to that service or task.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Real-time Updates</h4>
                  <p className="text-sm text-gray-600">
                    The map updates automatically as new services are added or tasks are posted.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}