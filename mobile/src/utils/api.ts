import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Configure API base URL based on environment
// Mobile app uses the SAME backend and database as the web application
const getApiBaseUrl = () => {
  if (__DEV__) {
    // Development URLs - connects to same backend as web app
    if (Platform.OS === 'ios') {
      return 'http://localhost:4000/api';
    } else {
      return 'http://10.0.2.2:4000/api'; // Android emulator
    }
  } else {
    // Production URL - same backend as web app (replace with your Replit app URL)
    return 'https://your-replit-app.replit.app/api';
  }
};

const API_BASE_URL = getApiBaseUrl();

// Cookie storage for authentication
let authCookie: string | null = null;

export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Always get the latest auth cookie from storage
  authCookie = await SecureStore.getItemAsync('auth-cookie');

  // Clean up any duplicate cookies that might exist
  if (authCookie && authCookie.includes(',')) {
    console.log('Found duplicate cookies, cleaning up...');
    // Take only the first cookie
    const firstCookie = authCookie.split(',')[0].trim();
    authCookie = firstCookie;
    await SecureStore.setItemAsync('auth-cookie', authCookie);
    console.log('Cleaned cookie stored:', authCookie);
  }

  console.log(`API Request [${endpoint}]:`, {
    url,
    cookie: authCookie ? 'Present' : 'Missing',
    cookieValue: authCookie,
    // Add debugging to see if there are multiple cookies
    hasMultipleCookies: authCookie ? authCookie.includes(',') : false
  });

  // Create headers object, ensuring we don't duplicate cookies
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add cookie if available, but don't append to existing headers
  if (authCookie) {
    (headers as Record<string, string>)['Cookie'] = authCookie;
  }

  const config: RequestInit = {
    ...options,
    headers,
    credentials: 'include',
  };

  try {
    const response = await fetch(url, config);
    
    // Handle authentication cookies - parse the Set-Cookie header properly
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      console.log('Set-Cookie header received:', setCookieHeader);
      // Extract the session cookie from the Set-Cookie header
      // Handle multiple cookies by splitting and finding the session cookie
      const cookies = setCookieHeader.split(',').map(cookie => cookie.trim());
      let sessionCookie = null;
      
      for (const cookie of cookies) {
        const sessionMatch = cookie.match(/connect\.sid=[^;]+/);
        if (sessionMatch) {
          // Only store the cookie value, not the full header
          sessionCookie = sessionMatch[0];
          break; // Take the first session cookie found
        }
      }
      
      if (sessionCookie) {
        authCookie = sessionCookie;
        await SecureStore.setItemAsync('auth-cookie', authCookie);
        console.log('Session cookie stored:', authCookie);
      } else {
        console.log('No session cookie found in Set-Cookie header');
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Network error' }));
      const error = new Error(errorData.message || `HTTP error! status: ${response.status}`);
      
      // Log the request details for debugging
      console.log(`API Request failed [${endpoint}]:`, {
        status: response.status,
        cookie: authCookie ? 'Present' : 'Missing',
        cookieValue: authCookie,
        error: errorData.message
      });
      
      // Don't log authentication errors as they're expected for unauthenticated users
      if (response.status === 401 || response.status === 403) {
        throw error;
      }
      
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }

    return await response.json();
  } catch (error) {
    // Only log non-authentication errors
    if (error instanceof Error && 
        !error.message.includes('Not authenticated') && 
        !error.message.includes('You must be logged in')) {
      console.error(`API Error [${endpoint}]:`, error);
    }
    throw error;
  }
};

// Authentication API calls
export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    apiRequest('/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  register: (userData: any) =>
    apiRequest('/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  logout: () =>
    apiRequest('/auth/logout', {
      method: 'POST',
    }),

  getCurrentUser: () =>
    apiRequest('/user'),
};

// User API calls
export const userApi = {
  getProfile: () => apiRequest('/user'),
  updateProfile: (data: any) =>
    apiRequest('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  updateProviderProfile: (data: any) =>
    apiRequest('/providers/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// Service Categories API
export const categoriesApi = {
  getAll: () => apiRequest('/categories'),
  getById: (id: number) => apiRequest(`/categories/${id}`),
};

// Service Providers API
export const providersApi = {
  getAll: () => apiRequest('/providers'),
  getById: (id: number) => apiRequest(`/providers/${id}`),
  getByCategory: (categoryId: number) => apiRequest(`/providers/category/${categoryId}`),
  getNearby: (latitude: number, longitude: number, radius = 10, categoryId?: number) => {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      radius: radius.toString(),
      ...(categoryId && { categoryId: categoryId.toString() }),
    });
    return apiRequest(`/providers/nearby?${params}`);
  },
};

// Tasks API
export const tasksApi = {
  getAll: () => apiRequest('/tasks'),
  getById: (id: number) => apiRequest(`/tasks/${id}`),
  getByClient: (clientId: number) => apiRequest(`/tasks/client/${clientId}`),
  getByCategory: (categoryId: number) => apiRequest(`/tasks/category/${categoryId}`),
  create: (taskData: any) =>
    apiRequest('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    }),
  update: (id: number, taskData: any) =>
    apiRequest(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(taskData),
    }),
  delete: (id: number) =>
    apiRequest(`/tasks/${id}`, {
      method: 'DELETE',
    }),
};

// Service Requests API
export const serviceRequestsApi = {
  getAll: () => apiRequest('/service-requests'),
  getById: (id: number) => apiRequest(`/service-requests/${id}`),
  getByProvider: (providerId: number) => apiRequest(`/service-requests/provider/${providerId}`),
  getByClient: (clientId: number) => apiRequest(`/service-requests/client/${clientId}`),
  create: (requestData: any) =>
    apiRequest('/service-requests', {
      method: 'POST',
      body: JSON.stringify(requestData),
    }),
  update: (id: number, requestData: any) =>
    apiRequest(`/service-requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(requestData),
    }),
  accept: (id: number) =>
    apiRequest(`/service-requests/${id}/accept`, {
      method: 'POST',
    }),
  reject: (id: number) =>
    apiRequest(`/service-requests/${id}/reject`, {
      method: 'POST',
    }),
};

// Notifications API
export const notificationsApi = {
  getAll: () => apiRequest('/notifications'),
  getUnread: () => apiRequest('/notifications/unread'),
  markAsRead: (id: number) =>
    apiRequest(`/notifications/${id}/read`, {
      method: 'POST',
    }),
  markAllAsRead: () =>
    apiRequest('/notifications/read-all', {
      method: 'POST',
    }),
};

// Reviews API
export const reviewsApi = {
  getByProvider: (providerId: number) => apiRequest(`/reviews/provider/${providerId}`),
  create: (reviewData: any) =>
    apiRequest('/reviews', {
      method: 'POST',
      body: JSON.stringify(reviewData),
    }),
};

// Payments API
export const paymentsApi = {
  getStats: () => apiRequest('/payments/stats'),
  getPendingPayments: () => apiRequest('/payments/pending'),
  approvePayment: (paymentId: number) =>
    apiRequest(`/payments/${paymentId}/approve`, {
      method: 'POST',
    }),
  rejectPayment: (paymentId: number) =>
    apiRequest(`/payments/${paymentId}/reject`, {
      method: 'POST',
    }),
  createPaymentIntent: (serviceRequestId: number, amount: number) =>
    apiRequest('/payments/create-intent', {
      method: 'POST',
      body: JSON.stringify({ serviceRequestId, amount }),
    }),
};

// Storage utilities
export const storage = {
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  getItem: (key: string) => SecureStore.getItemAsync(key),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
  clear: async () => {
    // Clear auth-related data
    await SecureStore.deleteItemAsync('auth-cookie');
    authCookie = null;
    // Add other keys to clear if needed
  },
};

// Helper function to clear auth state
export const clearAuthState = async () => {
  await storage.clear();
  authCookie = null;
};