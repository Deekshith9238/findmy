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

### Payment Escrow System
- **Stripe Integration**: Secure payment processing with Stripe Connect
- **Escrow Protection**: Client payments held until work completion and approval
- **Fee Structure**: 15% platform fee + 8% tax automatically calculated
- **Work Verification**: Provider submits photos for payment approval
- **Payment Approvers**: Dedicated role for reviewing and approving payments
- **Bank Account Management**: Secure provider bank account setup via Stripe Connect
- **Automatic Payouts**: Approved payments automatically transferred to provider accounts

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
- June 30, 2025. Implemented automatic scrolling to target sections during tour navigation for better visibility
- June 30, 2025. Enhanced tour transitions with smooth scrolling and proper timing for element detection
- June 30, 2025. Fixed critical route ordering bug: moved `/api/providers/me` before `/api/providers/:id` to prevent interception
- June 30, 2025. Resolved HTTP 413 payload too large error by increasing Express body parser limits to 50MB for document uploads
- June 30, 2025. Verified provider profile API endpoints now work correctly with proper authentication and data retrieval
- July 01, 2025. Made banking details mandatory for service provider verification - now requires 3 approved documents
- July 01, 2025. Enhanced verification system: Government ID/Driver's License + Banking Details + Professional License/Certificate
- July 01, 2025. Updated task notification system to only notify fully verified providers with approved banking details
- July 01, 2025. Added verification status warnings in provider dashboard with clear completion requirements
- July 13, 2025. Implemented comprehensive payment escrow system with Stripe integration
- July 13, 2025. Added payment approver role and workflow for secure transaction oversight
- July 13, 2025. Created payment database schema: escrow_payments, work_completion_photos, provider_bank_accounts
- July 13, 2025. Built payment components: PaymentForm, WorkCompletionForm, PaymentApprovalDashboard, BankAccountSetup
- July 13, 2025. Added payment processing flow: client pays → held in escrow → work completion → approval → payout
- July 13, 2025. Integrated platform fees (15%), tax calculations (8%), and secure Stripe Connect payouts
- July 13, 2025. Updated payment approver creation: removed bank details requirement for payment approvers
- July 13, 2025. Clarified bank details are only required for clients and service providers for refund/payout purposes
- July 13, 2025. Comprehensively updated mobile app UI to match website design and features
- July 13, 2025. Created mobile ServiceCategoryCard and ServiceProviderCard components with consistent styling
- July 13, 2025. Enhanced mobile HomeScreen with hero section, stats, featured providers, and quick actions
- July 13, 2025. Updated mobile ServicesScreen with advanced filtering, search, and provider listings
- July 13, 2025. Improved mobile TasksScreen with comprehensive task management, filtering, and status tracking
- July 13, 2025. Added payment approver support to mobile app with dedicated navigation and screens
- July 13, 2025. Implemented consistent design system across mobile app matching web application
- January 26, 2025. Completed comprehensive FieldNation-style work order and bidding system implementation
- January 26, 2025. Created complete database schema for work orders, job bids, provider skills, and equipment tracking
- January 26, 2025. Built full-stack FieldNation functionality: work order posting, provider bidding, skill-based matching
- January 26, 2025. Implemented CreateWorkOrderForm component with detailed job posting interface and location services
- January 26, 2025. Created WorkOrderCard component with comprehensive work order display and bid management
- January 26, 2025. Built BidSubmissionDialog with competitive bidding interface and proposal messaging
- January 26, 2025. Developed WorkOrdersPage with advanced filtering, sorting, and categorized work order management
- January 26, 2025. Added complete storage layer with location-based matching and provider qualification filtering
- January 26, 2025. Integrated work orders into routing system at /work-orders with protected access
- January 26, 2025. Created field service marketplace mirroring FieldNation.com functionality for buyers and providers
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```