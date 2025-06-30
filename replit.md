# Findmyhelper - Service Provider Marketplace

## Overview

Findmyhelper is a full-stack web application that connects clients with local service providers. The platform allows clients to post tasks and find qualified service providers, while enabling service providers to offer their services and accept task requests. Built with React, Express, and PostgreSQL, the application provides a comprehensive marketplace solution with user authentication, real-time features, and a modern UI.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Framework**: Tailwind CSS with Radix UI components
- **Form Management**: React Hook Form with Zod validation
- **Build Tool**: Vite for development and bundling

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Authentication**: Passport.js with local strategy and express-session
- **Database ORM**: Drizzle ORM for type-safe database operations
- **API Design**: RESTful API with JSON responses
- **Session Storage**: Connect-pg-simple for PostgreSQL session storage

### Database Architecture
- **Database**: PostgreSQL (via Neon serverless)
- **Schema Management**: Drizzle migrations
- **Key Tables**: users, service_categories, service_providers, tasks, service_requests, reviews

## Key Components

### Authentication System
- **Strategy**: Session-based authentication using Passport.js
- **Password Security**: Scrypt for password hashing with salt
- **User Types**: Dual user system supporting both clients and service providers
- **Authorization**: Role-based access control with protected routes

### User Management
- **User Profiles**: Comprehensive profile system with personal information
- **Service Provider Profiles**: Extended profiles with category, hourly rates, bio, and experience
- **Avatar System**: UI-avatars integration for profile pictures

### Task Management
- **Task Creation**: Clients can create detailed task requests
- **Task Categorization**: Tasks organized by service categories
- **Task Status**: Tracking system for task progression
- **Location-based**: Geographic filtering capabilities

### Service Request System
- **Provider Discovery**: Browse and filter service providers
- **Request Workflow**: Structured communication between clients and providers
- **Status Management**: Request lifecycle tracking (pending, accepted, completed)

### Review and Rating System
- **Bidirectional Reviews**: Both clients and providers can leave reviews
- **Rating Aggregation**: Average rating calculation for providers
- **Review Display**: Public review visibility for reputation building

## Data Flow

### User Registration and Authentication
1. User registers with email/password and user type selection
2. Service providers complete additional profile information
3. Session-based authentication maintains login state
4. Protected routes enforce authentication requirements

### Task Posting and Management
1. Authenticated clients create tasks with category, description, and location
2. Tasks are stored and made available for provider browsing
3. Providers can view and request to work on tasks
4. Clients review and accept provider requests

### Service Provider Discovery
1. Clients browse providers by category and location
2. Provider profiles display ratings, experience, and availability
3. Clients can send direct service requests to providers
4. Real-time status updates track request progress

### Review and Rating Workflow
1. Completed tasks trigger review prompts
2. Both parties can leave ratings and written reviews
3. Reviews are aggregated to calculate provider ratings
4. Public review display builds provider reputation

## External Dependencies

### UI and Styling
- **Radix UI**: Complete set of accessible React components
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library for consistent iconography
- **Class Variance Authority**: Component variant management

### Development Tools
- **TypeScript**: Type safety across the entire application
- **ESBuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing with Tailwind integration

### Database and Hosting
- **Neon Database**: Serverless PostgreSQL hosting
- **Drizzle Kit**: Database migration and introspection tools
- **Connect-pg-simple**: PostgreSQL session store

## Deployment Strategy

### Development Environment
- **Replit Integration**: Configured for Replit development environment
- **Hot Module Replacement**: Vite HMR for fast development iteration
- **Database Migrations**: Automated schema updates via Drizzle

### Production Build
- **Frontend**: Vite builds optimized React application to `/dist/public`
- **Backend**: ESBuild bundles Node.js server to `/dist/index.js`
- **Static Assets**: Express serves built frontend from public directory

### Environment Configuration
- **Database URL**: Environment variable for PostgreSQL connection
- **Session Secret**: Secure session management configuration
- **Port Configuration**: Flexible port assignment for different environments

## Mobile Application Architecture

### React Native Implementation
- **Framework**: React Native with TypeScript and Expo managed workflow
- **Navigation**: React Navigation with bottom tabs and stack navigation
- **Authentication**: Context-based auth state management with secure token storage
- **Location Services**: Expo Location for GPS coordinates and geofencing
- **Push Notifications**: Expo Notifications for real-time alerts and updates
- **API Integration**: HTTP client with automatic token management and error handling

### Shared Backend Infrastructure
- **Same Database**: Mobile app uses the identical PostgreSQL database as the web application
- **Same API Endpoints**: All mobile API calls target the same Express.js server routes
- **Unified User System**: Users can login from web or mobile with the same credentials
- **Real-Time Sync**: WebSocket connections ensure data synchronization across platforms
- **Session Management**: Cookie-based authentication works across web and mobile clients

### Mobile App Features
- **Cross-Platform**: Single codebase for iOS and Android deployment
- **Location-Aware**: GPS integration for location-based service matching
- **Real-Time Notifications**: Push notifications for task updates and service requests
- **Offline Support**: Local data caching for improved performance
- **Secure Authentication**: Biometric authentication support with secure token storage

### Mobile Screen Architecture
- **AuthScreen**: Login and registration with role selection
- **HomeScreen**: Dashboard with quick actions, nearby providers, and recent tasks
- **ServicesScreen**: Browse and filter service providers by category and location
- **TasksScreen**: View and manage task requests with status tracking
- **MapScreen**: Interactive map with service providers and task locations
- **ProfileScreen**: User profile management and settings
- **CreateTaskScreen**: Post new service requests with location and requirements
- **NotificationsScreen**: Centralized notification management

### Mobile Context Providers
- **AuthContext**: User authentication state and token management
- **LocationContext**: GPS location tracking and geofencing capabilities
- **NotificationContext**: Push notification handling and local notification state

## Changelog

```
Changelog:
- June 26, 2025. Initial setup
- June 26, 2025. Changed app name from TaskHire to Findmyhelper
- June 26, 2025. Implemented admin role management system with findmyhelper2025@gmail.com as sole admin
- June 26, 2025. Created dedicated admin dashboard for managing service verifier and call center staff accounts
- June 26, 2025. Updated admin password to Fmh@2025 and removed client features from admin interface
- June 26, 2025. Fixed authentication system - resolved frontend/backend schema mismatch (role vs isServiceProvider)
- June 26, 2025. Implemented complete service provider registration with required fields (categoryId, hourlyRate)
- June 26, 2025. Added conditional form fields for service provider signup with category selection
- June 26, 2025. Fixed dialog accessibility issues with proper DialogTitle and DialogDescription components
- June 26, 2025. Verified full authentication flow - both login and registration working correctly
- June 29, 2025. Implemented comprehensive notification system with real-time WebSocket connections
- June 29, 2025. Added location-based task posting that notifies nearby service providers within 6-10km radius
- June 29, 2025. Created call center workflow where service requests are automatically assigned to call center staff
- June 29, 2025. Enhanced task creation form with geolocation support for latitude/longitude coordinates
- June 29, 2025. Added notification dropdown in header with real-time updates and browser notifications
- June 29, 2025. Implemented interactive location-based service map with dynamic pins for providers, tasks, and user location
- June 29, 2025. Created ServiceMap component with real-time updates, category filtering, and distance calculations
- June 29, 2025. Added dedicated map page at /map with comprehensive map controls and legend
- June 29, 2025. Enhanced home page with interactive map preview section showcasing the mapping functionality
- June 29, 2025. Implemented privacy control system: map access restricted to approved service providers only
- June 29, 2025. Added address privacy protection: providers receive only task names and approximate distances before call center approval
- June 29, 2025. Enhanced call center approval workflow to send full address details and client contact info after approval
- June 29, 2025. Created animated landing page with videos, animations, and interactive elements using Framer Motion
- June 29, 2025. Added hero section with animated background, video demo section, testimonials, and interactive phone mockup
- June 29, 2025. Implemented animated counters, floating elements, and scroll-triggered animations for enhanced user experience
- June 29, 2025. Developed comprehensive React Native mobile app with complete architecture and screen structure
- June 29, 2025. Created mobile authentication system with context providers for auth, location, and notifications
- June 29, 2025. Built mobile app screens including Home, Services, Tasks, Map, Profile, and notification management
- June 29, 2025. Implemented mobile API integration with secure token storage and HTTP client configuration
- June 29, 2025. Added mobile-specific features: GPS location tracking, push notifications, and offline data caching
- June 30, 2025. Fixed tour navigation issue where it would show blank screen after 3rd step
- June 30, 2025. Implemented dynamic step filtering based on user login status for onboarding walkthrough
- June 30, 2025. Added improved positioning and error handling for tour tooltips and character placement
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```