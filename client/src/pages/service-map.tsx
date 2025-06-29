import MainLayout from '@/components/MainLayout';
import ServiceMap from '@/components/ServiceMap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Navigation, Users, Briefcase } from 'lucide-react';

export default function ServiceMapPage() {
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