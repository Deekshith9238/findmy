import React, { createContext, useContext, useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { LocationCoords, LocationResult } from '../types';

interface LocationContextType {
  location: LocationCoords | null;
  isLoading: boolean;
  error: string | null;
  requestLocation: () => Promise<LocationResult | null>;
  getCurrentLocation: () => Promise<LocationCoords | null>;
  hasPermission: boolean;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

interface LocationProviderProps {
  children: React.ReactNode;
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setHasPermission(status === 'granted');
      
      if (status === 'granted') {
        getCurrentLocation();
      }
    } catch (err) {
      console.error('Error checking location permissions:', err);
      setError('Failed to check location permissions');
    }
  };

  const requestLocation = async (): Promise<LocationResult | null> => {
    try {
      setIsLoading(true);
      setError(null);

      // Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
        setHasPermission(false);
        return null;
      }

      setHasPermission(true);

      // Get current location
      const locationResult = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 10000,
      });

      const coords: LocationCoords = {
        latitude: locationResult.coords.latitude,
        longitude: locationResult.coords.longitude,
      };

      setLocation(coords);

      // Try to get address (reverse geocoding)
      try {
        const [address] = await Location.reverseGeocodeAsync(coords);
        const formattedAddress = address
          ? `${address.street || ''} ${address.city || ''} ${address.region || ''} ${address.postalCode || ''}`.trim()
          : undefined;

        return {
          coords,
          address: formattedAddress,
        };
      } catch (geocodeError) {
        console.warn('Reverse geocoding failed:', geocodeError);
        return { coords };
      }
    } catch (err) {
      console.error('Error getting location:', err);
      setError('Failed to get location');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentLocation = async (): Promise<LocationCoords | null> => {
    try {
      if (!hasPermission) {
        return null;
      }

      setIsLoading(true);
      const locationResult = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 10000,
      });

      const coords: LocationCoords = {
        latitude: locationResult.coords.latitude,
        longitude: locationResult.coords.longitude,
      };

      setLocation(coords);
      return coords;
    } catch (err) {
      console.error('Error getting current location:', err);
      setError('Failed to get current location');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const value: LocationContextType = {
    location,
    isLoading,
    error,
    requestLocation,
    getCurrentLocation,
    hasPermission,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};