import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import * as notificationService from '@/services/notification.service';
import { useAuth } from '@/context/AuthContext';
import type { AppNotification } from '@/types/notification.types';

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  hasLoadedList: boolean;
  loadNotifications: () => Promise<void>;
  refreshUnreadCount: () => void;
  markRead: (notification: AppNotification) => void;
  markAllRead: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasLoadedList, setHasLoadedList] = useState(false);

  const refreshUnreadCount = useCallback(() => {
    notificationService
      .getUnreadCount()
      .then((result) => setUnreadCount(result.count))
      .catch(() => {});
  }, []);

  // Reset on logout, fetch the badge count as soon as a user is present —
  // mirrors NotificationBell's original mount-time fetch, just lifted up so
  // it's shared instead of being per-component local state.
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setHasLoadedList(false);
      return;
    }
    refreshUnreadCount();
  }, [user, refreshUnreadCount]);

  const loadNotifications = useCallback(async () => {
    const data = await notificationService.listNotifications();
    setNotifications(data);
    setHasLoadedList(true);
  }, []);

  const markRead = useCallback((notification: AppNotification) => {
    if (notification.isRead) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    notificationService.markNotificationRead(notification.id).catch(() => {});
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    notificationService.markAllNotificationsRead().catch(() => {});
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        hasLoadedList,
        loadNotifications,
        refreshUnreadCount,
        markRead,
        markAllRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider.');
  }
  return context;
}
