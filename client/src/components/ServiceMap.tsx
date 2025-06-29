import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, User, Briefcase, Star, Phone, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MapPin {
  id: string;
  type: 'provider' | 'task' | 'user';
  latitude: number;
  longitude: number;
  title: string;
  description: string;
  data: any;
}

interface ServiceMapProps {
  showProviders?: boolean;
  showTasks?: boolean;
  showUserLocation?: boolean;
  selectedCategory?: number;
  height?: string;
}

export default function ServiceMap({ 
  showProviders = true, 
  showTasks = true, 
  showUserLocation = true,
  selectedCategory,
  height = '500px'
}: ServiceMapProps) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const [mapPins, setMapPins] = useState<MapPin[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>(selectedCategory?.toString() || 'all');
  const [showProvidersLocal, setShowProvidersLocal] = useState(showProviders);
  const [showTasksLocal, setShowTasksLocal] = useState(showTasks);

  const { data: providers = [] } = useQuery({
    queryKey: ['/api/providers'],
    enabled: showProvidersLocal,
    refetchInterval: 10000 // Refresh every 10 seconds for real-time updates
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['/api/tasks'],
    enabled: showTasksLocal,
    refetchInterval: 10000 // Refresh every 10 seconds for real-time updates
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories']
  });

  // Get user's current location
  useEffect(() => {
    if (showUserLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('Geolocation error:', error);
          // Default to NYC center if geolocation fails
          setUserLocation({ lat: 40.7128, lng: -74.0060 });
        }
      );
    } else {
      // Default to NYC center
      setUserLocation({ lat: 40.7128, lng: -74.0060 });
    }
  }, [showUserLocation]);

  // Generate map pins from data
  useEffect(() => {
    const pins: MapPin[] = [];

    // Add provider pins
    if (showProvidersLocal && Array.isArray(providers)) {
      providers.forEach((provider: any) => {
        if (provider.user?.latitude && provider.user?.longitude) {
          if (categoryFilter === 'all' || provider.categoryId?.toString() === categoryFilter) {
            pins.push({
              id: `provider-${provider.id}`,
              type: 'provider',
              latitude: provider.user.latitude,
              longitude: provider.user.longitude,
              title: `${provider.user.firstName} ${provider.user.lastName}`,
              description: provider.bio || 'Service Provider',
              data: provider
            });
          }
        }
      });
    }

    // Add task pins
    if (showTasksLocal && Array.isArray(tasks)) {
      tasks.forEach((task: any) => {
        if (task.latitude && task.longitude) {
          if (categoryFilter === 'all' || task.categoryId?.toString() === categoryFilter) {
            pins.push({
              id: `task-${task.id}`,
              type: 'task',
              latitude: task.latitude,
              longitude: task.longitude,
              title: task.title,
              description: task.description,
              data: task
            });
          }
        }
      });
    }

    // Add user location pin
    if (userLocation) {
      pins.push({
        id: 'user-location',
        type: 'user',
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        title: 'Your Location',
        description: 'Current location',
        data: null
      });
    }

    setMapPins(pins);
  }, [providers, tasks, userLocation, showProvidersLocal, showTasksLocal, categoryFilter]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c;
    return Math.round(d * 10) / 10; // Round to 1 decimal place
  };

  const getPinColor = (type: string) => {
    switch (type) {
      case 'provider': return '#10B981'; // Green
      case 'task': return '#3B82F6'; // Blue
      case 'user': return '#EF4444'; // Red
      default: return '#6B7280'; // Gray
    }
  };

  const getPinIcon = (type: string) => {
    switch (type) {
      case 'provider': return <User className="w-4 h-4" />;
      case 'task': return <Briefcase className="w-4 h-4" />;
      case 'user': return <MapPin className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  // Simple map visualization using CSS positioning
  const renderSimpleMap = () => {
    if (mapPins.length === 0) {
      return (
        <div 
          className="relative bg-gray-100 border rounded-lg overflow-hidden flex items-center justify-center"
          style={{ height }}
        >
          <div className="text-center text-gray-500">
            <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No locations to display</p>
            <p className="text-sm">Enable providers or tasks to see map pins</p>
          </div>
        </div>
      );
    }

    // Calculate bounds
    const lats = mapPins.map(pin => pin.latitude);
    const lngs = mapPins.map(pin => pin.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Add padding
    const latPadding = (maxLat - minLat) * 0.1 || 0.01;
    const lngPadding = (maxLng - minLng) * 0.1 || 0.01;

    return (
      <div 
        className="relative bg-gray-100 border rounded-lg overflow-hidden"
        style={{ height }}
      >
        {/* Map background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-green-50">
          <div className="absolute inset-0 opacity-10 bg-gray-200"></div>
        </div>

        {/* Pins */}
        {mapPins.map((pin) => {
          const x = ((pin.longitude - minLng - lngPadding) / (maxLng - minLng + 2 * lngPadding)) * 100;
          const y = 100 - ((pin.latitude - minLat - latPadding) / (maxLat - minLat + 2 * latPadding)) * 100;

          return (
            <div
              key={pin.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all hover:scale-110"
              style={{ left: `${x}%`, top: `${y}%` }}
              onClick={() => setSelectedPin(pin)}
            >
              <div 
                className="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-sm font-semibold"
                style={{ backgroundColor: getPinColor(pin.type) }}
              >
                {getPinIcon(pin.type)}
              </div>
              {selectedPin?.id === pin.id && (
                <div className="absolute top-10 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-3 min-w-64 z-10">
                  <h3 className="font-semibold text-sm mb-1">{pin.title}</h3>
                  <p className="text-xs text-gray-600 mb-2">{pin.description}</p>
                  
                  {pin.type === 'provider' && pin.data && (
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500" />
                        <span>{pin.data.averageRating || 'No rating'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-blue-500" />
                        <span>${pin.data.hourlyRate}/hr</span>
                      </div>
                      {userLocation && (
                        <div className="text-gray-500">
                          {calculateDistance(userLocation.lat, userLocation.lng, pin.latitude, pin.longitude)}km away
                        </div>
                      )}
                    </div>
                  )}
                  
                  {pin.type === 'task' && pin.data && (
                    <div className="space-y-1 text-xs">
                      <div className="text-green-600 font-semibold">
                        ${pin.data.budget}
                      </div>
                      <div className="text-gray-500">
                        {pin.data.status}
                      </div>
                      {userLocation && (
                        <div className="text-gray-500">
                          {calculateDistance(userLocation.lat, userLocation.lng, pin.latitude, pin.longitude)}km away
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Map legend */}
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3">
          <h4 className="font-semibold text-sm mb-2">Legend</h4>
          <div className="space-y-1 text-xs">
            {showProvidersLocal && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-white">
                  <User className="w-2 h-2" />
                </div>
                <span>Service Providers</span>
              </div>
            )}
            {showTasksLocal && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white">
                  <Briefcase className="w-2 h-2" />
                </div>
                <span>Available Tasks</span>
              </div>
            )}
            {showUserLocation && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-white">
                  <MapPin className="w-2 h-2" />
                </div>
                <span>Your Location</span>
              </div>
            )}
          </div>
        </div>

        {/* Close selected pin */}
        {selectedPin && (
          <div className="absolute top-4 right-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSelectedPin(null)}
            >
              ✕
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Map Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Interactive Service Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Array.isArray(categories) && categories.map((category: any) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Toggle Controls */}
            <div className="flex items-center gap-4">
              <Button
                variant={showProvidersLocal ? "default" : "outline"}
                size="sm"
                onClick={() => setShowProvidersLocal(!showProvidersLocal)}
              >
                {showProvidersLocal ? "✓" : "○"} Providers
              </Button>
              
              <Button
                variant={showTasksLocal ? "default" : "outline"}
                size="sm"
                onClick={() => setShowTasksLocal(!showTasksLocal)}
              >
                {showTasksLocal ? "✓" : "○"} Tasks
              </Button>
            </div>

            {/* Stats */}
            <div className="flex gap-4 text-sm text-gray-600">
              <span>{mapPins.filter(p => p.type === 'provider').length} Providers</span>
              <span>{mapPins.filter(p => p.type === 'task').length} Tasks</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map */}
      <Card>
        <CardContent className="p-0">
          {renderSimpleMap()}
        </CardContent>
      </Card>

      {/* Map Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {mapPins.filter(p => p.type === 'provider').length}
            </div>
            <div className="text-sm text-gray-600">Active Providers</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {mapPins.filter(p => p.type === 'task').length}
            </div>
            <div className="text-sm text-gray-600">Available Tasks</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {userLocation ? '📍' : '❌'}
            </div>
            <div className="text-sm text-gray-600">Location Access</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}