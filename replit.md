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

## Changelog

```
Changelog:
- June 26, 2025. Initial setup
- June 26, 2025. Changed app name from TaskHire to Findmyhelper
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```