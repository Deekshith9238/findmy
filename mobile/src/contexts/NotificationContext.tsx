import React, { createContext, useContext, useState, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { notificationsApi } from '../utils/api';
import { Notification } from '../types';
import { useAuth } from './AuthContext';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  registerForPushNotifications: () => Promise<string | null>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated, user } = useAuth();

  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    if (isAuthenticated) {
      refreshNotifications();
      setupPushNotifications();
    }
  }, [isAuthenticated]);

  const setupPushNotifications = async () => {
    try {
      const token = await registerForPushNotifications();
      if (token && user) {
        // Send token to backend (you'll need to add this endpoint)
        console.log('Push notification token:', token);
      }
    } catch (error) {
      console.error('Failed to setup push notifications:', error);
    }
  };

  const registerForPushNotifications = async (): Promise<string | null> => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Push notification permission denied');
        return null;
      }

      const token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('Expo push token:', token);
      return token;
    } catch (error) {
      console.error('Error getting push notification token:', error);
      return null;
    }
  };

  const refreshNotifications = async () => {
    if (!isAuthenticated) return;

    try {
      setIsLoading(true);
      const data = await notificationsApi.getAll();
      setNotifications(data || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id 
            ? { ...notification, isRead: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, isRead: true }))
      );
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isLoading,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    registerForPushNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};