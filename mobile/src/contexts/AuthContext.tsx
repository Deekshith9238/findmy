import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, clearAuthState } from '../utils/api';
import { User, LoginCredentials, RegisterData } from '../types';
import * as SecureStore from 'expo-secure-store';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isAuthenticated = !!user;

  // Check if user is authenticated on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      console.log('Checking auth status...');
      const userData = await authApi.getCurrentUser();
      console.log('Auth check successful, user:', userData);
      setUser(userData);
    } catch (error) {
      // User is not authenticated - this is expected for new users
      // Don't log this as an error since it's normal behavior
      console.log('Auth check failed (expected for new users):', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      
      // Clear any existing session cookie before login
      await SecureStore.deleteItemAsync('auth-cookie');
      
      // Check what's stored after clearing
      const storedCookie = await SecureStore.getItemAsync('auth-cookie');
      console.log('Cookie after clearing:', storedCookie);
      
      const response = await authApi.login(credentials);
      console.log('Login successful, user data:', response);
      // Login returns user object directly, not nested in response.user
      setUser(response);
      
      // Check what's stored after login
      const newStoredCookie = await SecureStore.getItemAsync('auth-cookie');
      console.log('Cookie after login:', newStoredCookie);
      
      // Add a longer delay and then refresh the session to ensure it's established
      setTimeout(async () => {
        try {
          console.log('Refreshing session after login...');
          // Double-check that cookie is stored before refreshing
          const cookieBeforeRefresh = await SecureStore.getItemAsync('auth-cookie');
          console.log('Cookie before refresh:', cookieBeforeRefresh);
          await refreshUser();
        } catch (error) {
          console.log('Session refresh failed:', error);
        }
      }, 1000); // Increased from 500ms to 1000ms
      
    } catch (error) {
      console.error('Login failed:', error);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      setIsLoading(true);
      const response = await authApi.register(userData);
      // Register returns { message: "...", user: {...} }
      setUser(response.user);
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await clearAuthState();
      setUser(null);
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await authApi.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};