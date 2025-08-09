// Re-export shared types from the main project
export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  profilePicture: string | null;
  phoneNumber: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  bio: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface ServiceCategory {
  id: number;
  name: string;
  description: string;
  icon: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface ServiceProvider {
  id: number;
  userId: number;
  categoryId: number;
  bio: string;
  hourlyRate: number;
  experience: string | null;
  availability: string | null;
  verificationStatus: string;
  rating: number | null;
  totalReviews: number | null;
  skills: string[] | null;
  certifications: string[] | null;
  workRadius: number | null;
  preferredWorkTimes: string | null;
  emergencyAvailable: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface Task {
  id: number;
  clientId: number;
  categoryId: number;
  title: string;
  description: string;
  budget: number | null;
  deadline: Date | null;
  status: string;
  priority: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  attachments: string[] | null;
  requirements: string[] | null;
  estimatedDuration: string | null;
  isUrgent: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface ServiceRequest {
  id: number;
  clientId: number;
  providerId: number | null;
  taskId: number | null;
  message: string;
  proposedPrice: number | null;
  proposedDate: Date | null;
  status: string;
  callCenterNotes: string | null;
  callCenterApprovedAt: Date | null;
  callCenterApprovedBy: number | null;
  providerResponse: string | null;
  clientResponse: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  relatedId: number | null;
  relatedType: string | null;
  actionUrl: string | null;
  createdAt: Date | null;
}

export interface Review {
  id: number;
  serviceRequestId: number;
  reviewerId: number;
  revieweeId: number;
  rating: number;
  comment: string | null;
  isPublic: boolean;
  createdAt: Date | null;
}

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  CreateTask: undefined;
  TaskDetail: { taskId: number };
  ServiceProviderDetail: { providerId: number };
  Notifications: undefined;
  PaymentApprover: undefined;
};

export type TabParamList = {
  Home: undefined;
  Services: undefined;
  Tasks: undefined;
  Map: undefined;
  Profile: undefined;
};

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

// Location types
export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface LocationResult {
  coords: LocationCoords;
  address?: string;
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'client' | 'service_provider' | 'payment_approver' | 'service_verifier' | 'call_center' | 'admin';
  phoneNumber?: string;
  categoryId?: number;
  hourlyRate?: number;
  bio?: string;
  experience?: string;
}

// Filter types
export interface ServiceProviderFilters {
  categoryId?: number;
  minRating?: number;
  maxHourlyRate?: number;
  workRadius?: number;
  emergencyAvailable?: boolean;
  location?: LocationCoords;
}

export interface TaskFilters {
  categoryId?: number;
  status?: string;
  priority?: string;
  minBudget?: number;
  maxBudget?: number;
  location?: LocationCoords;
  radius?: number;
}