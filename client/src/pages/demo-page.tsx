import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Users, Bell, Phone, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function DemoPage() {
  const [selectedRole, setSelectedRole] = useState<string>('overview');

  const { data: notifications = [] } = useQuery({
    queryKey: ['/api/notifications'],
    refetchInterval: 5000 // Refresh every 5 seconds to show real-time updates
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['/api/tasks']
  });

  const { data: serviceRequests = [] } = useQuery({
    queryKey: ['/api/service-requests/client']
  });

  const testAccounts = [
    {
      role: 'Admin',
      email: 'findmyhelper2025@gmail.com',
      password: 'Fmh@2025',
      description: 'Full system administration access'
    },
    {
      role: 'Service Provider (Manhattan)',
      email: 'cleaner1@example.com',
      password: 'password123',
      description: 'Maria Rodriguez - Professional house cleaner in Manhattan'
    },
    {
      role: 'Service Provider (Brooklyn)',
      email: 'cleaner2@example.com',
      password: 'password123',
      description: 'James Wilson - Eco-friendly cleaning specialist in Brooklyn'
    },
    {
      role: 'Service Provider (Queens)',
      email: 'handyman1@example.com',
      password: 'password123',
      description: 'Carlos Martinez - Licensed handyman in Queens'
    },
    {
      role: 'Service Provider (Bronx)',
      email: 'plumber1@example.com',
      password: 'password123',
      description: 'Mike Thompson - Emergency plumbing services in Bronx'
    },
    {
      role: 'Call Center Staff 1',
      email: 'callcenter1@findmyhelper.com',
      password: 'password123',
      description: 'Sarah Johnson - Handles service request coordination'
    },
    {
      role: 'Call Center Staff 2',
      email: 'callcenter2@findmyhelper.com',
      password: 'password123',
      description: 'David Chen - Handles service request coordination'
    },
    {
      role: 'Test Client 1',
      email: 'client1@example.com',
      password: 'password123',
      description: 'Jennifer Smith - Located in Midtown Manhattan'
    },
    {
      role: 'Test Client 2',
      email: 'client2@example.com',
      password: 'password123',
      description: 'Robert Davis - Located in Park Slope, Brooklyn'
    }
  ];

  const workflowSteps = [
    {
      step: 1,
      title: 'Client Posts Task',
      description: 'Client creates a task with location (latitude/longitude)',
      icon: <MapPin className="w-5 h-5" />,
      color: 'bg-blue-500'
    },
    {
      step: 2,
      title: 'Location-Based Notifications',
      description: 'System finds service providers within 6-10km radius and sends real-time notifications',
      icon: <Bell className="w-5 h-5" />,
      color: 'bg-green-500'
    },
    {
      step: 3,
      title: 'Provider Responds',
      description: 'Service provider accepts task and creates service request',
      icon: <Users className="w-5 h-5" />,
      color: 'bg-purple-500'
    },
    {
      step: 4,
      title: 'Call Center Assignment',
      description: 'Service request automatically assigned to call center staff',
      icon: <Phone className="w-5 h-5" />,
      color: 'bg-orange-500'
    },
    {
      step: 5,
      title: 'Verification & Approval',
      description: 'Call center staff verifies and approves, client gets address',
      icon: <CheckCircle className="w-5 h-5" />,
      color: 'bg-emerald-500'
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🔔 Notification System Demo
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Experience real-time location-based notifications and call center workflow
          </p>
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            <Badge variant="secondary" className="px-3 py-1">
              📍 6-10km Location Radius
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              ⚡ Real-time WebSocket Updates
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              📞 Call Center Workflow
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              🌐 Browser Notifications
            </Badge>
          </div>
        </div>

        {/* Workflow Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              How the Notification System Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {workflowSteps.map((step, index) => (
                <div key={step.step} className="flex flex-col items-center text-center">
                  <div className={`${step.color} text-white p-3 rounded-full mb-3`}>
                    {step.icon}
                  </div>
                  <h3 className="font-semibold text-sm mb-2">{step.title}</h3>
                  <p className="text-xs text-gray-600">{step.description}</p>
                  {index < workflowSteps.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gray-300 transform translate-x-2"></div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Test Accounts */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Test Accounts Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {testAccounts.map((account, index) => (
                <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                  <h4 className="font-semibold text-sm mb-2">{account.role}</h4>
                  <div className="text-xs space-y-1">
                    <div className="font-mono bg-gray-100 p-1 rounded">
                      {account.email}
                    </div>
                    <div className="font-mono bg-gray-100 p-1 rounded">
                      {account.password}
                    </div>
                    <p className="text-gray-600 mt-2">{account.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Demo Instructions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>🚀 Try the Demo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <h4 className="font-semibold">Step 1: Login as a Client</h4>
                <p className="text-sm text-gray-600">
                  Use client1@example.com or client2@example.com to login and create tasks
                </p>
              </div>
              
              <div className="border-l-4 border-green-500 pl-4">
                <h4 className="font-semibold">Step 2: Create a Task with Location</h4>
                <p className="text-sm text-gray-600">
                  Go to "Post a Task" and use the geolocation button or enter coordinates manually.
                  Try: Latitude 40.7505, Longitude -73.9934 (Manhattan)
                </p>
              </div>
              
              <div className="border-l-4 border-purple-500 pl-4">
                <h4 className="font-semibold">Step 3: Login as Service Providers</h4>
                <p className="text-sm text-gray-600">
                  Switch to service provider accounts to see real-time notifications in the bell icon
                </p>
              </div>
              
              <div className="border-l-4 border-orange-500 pl-4">
                <h4 className="font-semibold">Step 4: Create Service Request</h4>
                <p className="text-sm text-gray-600">
                  As a provider, respond to tasks to trigger call center workflow
                </p>
              </div>
              
              <div className="border-l-4 border-emerald-500 pl-4">
                <h4 className="font-semibold">Step 5: Login as Call Center Staff</h4>
                <p className="text-sm text-gray-600">
                  See automatic assignments and handle provider verification
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sample Data Created */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>📊 Sample Data Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">Service Providers by Location</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Manhattan (Cleaning)</span>
                    <Badge variant="outline">Maria Rodriguez</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Brooklyn (Cleaning)</span>
                    <Badge variant="outline">James Wilson</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Queens (Handyman)</span>
                    <Badge variant="outline">Carlos Martinez</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Bronx (Plumbing)</span>
                    <Badge variant="outline">Mike Thompson</Badge>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3">Sample Task Created</h4>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <div className="font-medium">Deep House Cleaning Needed</div>
                  <div className="text-gray-600">Upper East Side, Manhattan</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Location: 40.7736, -73.9566
                  </div>
                  <div className="text-xs text-gray-500">
                    Budget: $150.00
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live System Status */}
        <Card>
          <CardHeader>
            <CardTitle>🔴 Live System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{tasks.length}</div>
                <div className="text-sm text-gray-600">Active Tasks</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{notifications.length}</div>
                <div className="text-sm text-gray-600">Total Notifications</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{serviceRequests.length}</div>
                <div className="text-sm text-gray-600">Service Requests</div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <h4 className="font-semibold text-yellow-800 mb-2">💡 Pro Tip</h4>
              <p className="text-sm text-yellow-700">
                Open multiple browser tabs with different user accounts to see real-time notifications 
                flowing between users. The notification bell will show unread counts and browser 
                notifications will appear when new alerts arrive.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}