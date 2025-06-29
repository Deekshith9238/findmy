import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

// Contexts
import { AuthProvider } from './src/contexts/AuthContext';
import { LocationProvider } from './src/contexts/LocationContext';
import { NotificationProvider } from './src/contexts/NotificationContext';

// Screens
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import ServicesScreen from './src/screens/ServicesScreen';
import TasksScreen from './src/screens/TasksScreen';
import MapScreen from './src/screens/MapScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CreateTaskScreen from './src/screens/CreateTaskScreen';
import TaskDetailScreen from './src/screens/TaskDetailScreen';
import ServiceProviderDetailScreen from './src/screens/ServiceProviderDetailScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';

// Components
import ProtectedRoute from './src/components/ProtectedRoute';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const queryClient = new QueryClient();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Services') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Tasks') {
            iconName = focused ? 'clipboard' : 'clipboard-outline';
          } else if (route.name === 'Map') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'home-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Services" component={ServicesScreen} />
      <Tab.Screen name="Tasks" component={TasksScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="Main">
          {() => (
            <ProtectedRoute>
              <MainTabs />
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