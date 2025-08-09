import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, BellRing, Check, MapPin } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';

interface Notification {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  data?: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationData {
  taskId?: number;
  serviceRequestId?: number;
  distance?: string;
}

let wsConnection: WebSocket | null = null;

export function useWebSocketNotifications(userId: number | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    wsConnection = new WebSocket(wsUrl);

    wsConnection.onopen = () => {
      wsConnection?.send(JSON.stringify({ type: 'authenticate', userId }));
    };

    wsConnection.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'notification') {
        // Invalidate notifications to trigger refetch
        queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
        queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread'] });
        
        // Show browser notification if permission granted
        if (Notification.permission === 'granted') {
          new Notification(data.data.title, {
            body: data.data.message,
            icon: '/favicon.ico'
          });
        }
      }
    };

    wsConnection.onclose = () => {
    };

    wsConnection.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      wsConnection?.close();
      wsConnection = null;
    };
  }, [userId, queryClient]);

  return wsConnection;
}

export function NotificationDropdown({ user }: { user: any }) {
  const queryClient = useQueryClient();
  
  // Initialize WebSocket connection
  useWebSocketNotifications(user?.id);

  const { data: unreadNotifications = [] } = useQuery({
    queryKey: ['/api/notifications/unread'],
    enabled: !!user
  });

  const { data: allNotifications = [] } = useQuery({
    queryKey: ['/api/notifications'],
    enabled: !!user
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: number) => 
      apiRequest(`/api/notifications/${notificationId}/read`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread'] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => 
      apiRequest('/api/notifications/read-all', { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread'] });
    }
  });

  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_posted':
        return <MapPin className="w-4 h-4 text-blue-500" />;
      case 'call_center_assignment':
        return <BellRing className="w-4 h-4 text-orange-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const parseNotificationData = (dataStr?: string): NotificationData => {
    if (!dataStr) return {};
    try {
      return JSON.parse(dataStr);
    } catch {
      return {};
    }
  };

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadNotifications.length > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadNotifications.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadNotifications.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isPending}
            >
              <Check className="w-3 h-3 mr-1" />
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {allNotifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            No notifications yet
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {allNotifications.slice(0, 10).map((notification: Notification) => {
              const data = parseNotificationData(notification.data);
              return (
                <DropdownMenuItem 
                  key={notification.id}
                  className={`p-3 cursor-pointer ${!notification.isRead ? 'bg-blue-50' : ''}`}
                  onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}
                >
                  <div className="flex items-start space-x-3 w-full">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {notification.message}
                      </p>
                      {data.distance && (
                        <p className="text-xs text-blue-600">
                          Distance: {data.distance}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                </DropdownMenuItem>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function NotificationSystem({ user }: { user: any }) {
  return <NotificationDropdown user={user} />;
}