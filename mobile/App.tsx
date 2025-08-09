import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';

// Contexts
import { AuthProvider } from './src/contexts/AuthContext';
import { LocationProvider } from './src/contexts/LocationContext';
import { NotificationProvider } from './src/contexts/NotificationContext';

// Screens
import AuthScreen from './src/screens/AuthScreen';
import CreateTaskScreen from './src/screens/CreateTaskScreen';
import TaskDetailScreen from './src/screens/TaskDetailScreen';
import ServiceProviderDetailScreen from './src/screens/ServiceProviderDetailScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';

// Components
import ProtectedRoute from './src/components/ProtectedRoute';
import RoleBasedNavigation from './src/components/RoleBasedNavigation';

const Stack = createStackNavigator();
const queryClient = new QueryClient();

function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="Main">
          {() => (
            <ProtectedRoute>
              <RoleBasedNavigation />
            </ProtectedRoute>
          )}
        </Stack.Screen>
        <Stack.Screen 
          name="CreateTask" 
          component={CreateTaskScreen}
          options={{ 
            headerShown: true, 
            title: 'Create Task',
            headerBackTitleVisible: false 
          }}
        />
        <Stack.Screen 
          name="TaskDetail" 
          component={TaskDetailScreen}
          options={{ 
            headerShown: true, 
            title: 'Task Details',
            headerBackTitleVisible: false 
          }}
        />
        <Stack.Screen 
          name="ServiceProviderDetail" 
          component={ServiceProviderDetailScreen}
          options={{ 
            headerShown: true, 
            title: 'Service Provider',
            headerBackTitleVisible: false 
          }}
        />
        <Stack.Screen 
          name="Notifications" 
          component={NotificationsScreen}
          options={{ 
            headerShown: true, 
            title: 'Notifications',
            headerBackTitleVisible: false 
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LocationProvider>
          <NotificationProvider>
            <StatusBar style="auto" />
            <AppNavigator />
          </NotificationProvider>
        </LocationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}