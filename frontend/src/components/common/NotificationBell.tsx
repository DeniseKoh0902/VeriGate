import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/cn';
import { resolveNotificationLink } from '@/lib/notificationLink';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import type { AppNotification } from '@/types/notification.types';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, hasLoadedList, loadNotifications, markRead, markAllRead } =
    useNotifications();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
    if (!hasLoadedList) {
      loadNotifications().catch(() => {});
    }
  };

  const handleNotificationClick = (notification: AppNotification) => {
    markRead(notification);
    setIsOpen(false);
    if (!user) return;
    const link = resolveNotificationLink(notification, user.role);
    if (link) navigate(link);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Notifications"
        className="relative text-slate-400 transition-colors hover:text-slate-600"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-10 mt-2 w-[calc(100vw-1.5rem)] max-w-80 rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                <CheckCheck size={13} />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {hasLoadedList && notifications.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-slate-400">
                No notifications yet.
              </p>
            )}
            {notifications.slice(0, 8).map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => handleNotificationClick(notification)}
                className={cn(
                  'flex w-full flex-col gap-0.5 border-b border-slate-50 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50',
                  !notification.isRead && 'bg-blue-50/60',
                )}
              >
                <span className="flex items-start gap-2">
                  {!notification.isRead && (
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                  )}
                  <span className="text-sm font-medium text-slate-900">{notification.title}</span>
                </span>
                <span className="pl-3.5 text-xs text-slate-500">{notification.message}</span>
                <span className="pl-3.5 text-xs text-slate-400">
                  {timeAgo(notification.createdAt)}
                </span>
              </button>
            ))}
          </div>

          <Link
            to="/notifications"
            onClick={() => setIsOpen(false)}
            className="block border-t border-slate-100 px-4 py-2.5 text-center text-xs font-medium text-blue-600 hover:bg-slate-50 hover:text-blue-700"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
