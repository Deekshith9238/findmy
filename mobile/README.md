# Findmyhelper Mobile App

React Native mobile application for the Findmyhelper service marketplace platform.

## Shared Backend Architecture

**Important**: This mobile app uses the **same backend and database** as the web application. There is no separate mobile API or database.

### How It Works

- **Same Database**: Mobile app connects to the identical PostgreSQL database used by the web app
- **Same API Routes**: All mobile requests target the same Express.js server endpoints (`/api/*`)
- **Unified Authentication**: Users can login from web or mobile with the same credentials
- **Real-Time Sync**: Data changes on web instantly appear on mobile and vice versa
- **Shared User Accounts**: Service providers and clients can switch between platforms seamlessly

### API Configuration

The mobile app is configured to connect to:
- **Development**: `http://localhost:5000/api` (same as web app)
- **Production**: Your Replit app URL + `/api`

### Key Features

- Cross-platform support (iOS & Android)
- GPS location tracking for service matching
- Push notifications for real-time updates
- Offline data caching
- Secure authentication with token storage
- Interactive maps with service provider locations

### Tech Stack

- React Native with TypeScript
- Expo managed workflow
- React Navigation for routing
- Expo Location for GPS
- Expo Notifications for push alerts
- Secure storage for authentication

### Getting Started

1. Install Expo CLI: `npm install -g @expo/cli`
2. Navigate to mobile directory: `cd mobile`
3. Install dependencies: `npm install`
4. Start development server: `npx expo start`
5. Scan QR code with Expo Go app or run on simulator

### Environment Setup

The mobile app automatically detects the correct API endpoint:
- iOS Simulator: `http://localhost:5000/api`
- Android Emulator: `http://10.0.2.2:5000/api`
- Production: Your deployed backend URL

### Data Synchronization

Since both web and mobile use the same backend:
- Task posts from mobile appear instantly on web
- Service requests are synchronized across platforms
- Notifications work across both web and mobile
- User profiles stay consistent between platforms

This unified architecture ensures a seamless experience whether users access Findmyhelper via web browser or mobile app.