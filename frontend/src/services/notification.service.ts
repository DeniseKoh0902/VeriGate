import { apiFetch } from '@/lib/apiClient';
import type { AppNotification, UnreadCount } from '@/types/notification.types';

export function listNotifications() {
  return apiFetch<AppNotification[]>('/notifications');
}

export function getUnreadCount() {
  return apiFetch<UnreadCount>('/notifications/unread-count');
}

export function markNotificationRead(id: string) {
  return apiFetch<AppNotification>(`/notifications/${id}/read`, { method: 'PATCH' });
}

export function markAllNotificationsRead() {
  return apiFetch<void>('/notifications/read-all', { method: 'PATCH' });
}
