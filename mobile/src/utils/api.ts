import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Configure API base URL based on environment
// Mobile app uses the SAME backend and database as the web application
const getApiBaseUrl = () => {
  if (__DEV__) {
    // Development URLs - connects to same backend as web app
    if (Platform.OS === 'ios') {
      return 'http://localhost:5000/api';
    } else {
      return 'http://10.0.2.2:5000/api'; // Android emulator
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
  
  // Get stored auth cookie
  if (!authCookie) {
    authCookie = await SecureStore.getItemAsync('auth-cookie');
  }

  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(authCookie && { 'Cookie': authCookie }),
      ...options.headers,
    },
    credentials: 'include',
  };

  try {
    const response = await fetch(url, config);
    
    // Handle authentication cookies
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      authCookie = setCookieHeader;
      await SecureStore.setItemAsync('auth-cookie', setCookieHeader);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
};

// Authentication API calls
export const authApi = {
  login: (credentials: { username: string; password: string }) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  register: (userData: any) =>
    apiRequest('/auth/register', {
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
    apiRequest('/user', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  updateProviderProfile: (data: any) =>
    apiRequest('/user/provider', {
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