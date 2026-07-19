import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { cn } from '@/lib/cn';
import { resolveNotificationLink } from '@/lib/notificationLink';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import type { AppNotification } from '@/types/notification.types';

type StatusFilter = 'ALL' | 'UNREAD';

const NOTIFICATIONS_PER_PAGE = 15;

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

export function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications, unreadCount, loadNotifications, markRead, markAllRead } =
    useNotifications();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    loadNotifications()
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load notifications.'))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return filter === 'UNREAD' ? notifications.filter((n) => !n.isRead) : notifications;
  }, [notifications, filter]);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / NOTIFICATIONS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (currentPage - 1) * NOTIFICATIONS_PER_PAGE,
    currentPage * NOTIFICATIONS_PER_PAGE,
  );

  const handleClick = (notification: AppNotification) => {
    markRead(notification);
    if (!user) return;
    const link = resolveNotificationLink(notification, user.role);
    if (link) navigate(link);
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500">
            Everything that needs your attention, in one place.
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" className="w-auto" onClick={markAllRead}>
            <CheckCheck size={15} />
            Mark all read
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card>
        <div className="flex gap-1 border-b border-slate-100 px-5 py-3">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              filter === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100',
            )}
          >
            All ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('UNREAD')}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              filter === 'UNREAD' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100',
            )}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {!isLoading && filtered.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-slate-400">
            {filter === 'UNREAD' ? 'No unread notifications.' : 'No notifications yet.'}
          </div>
        )}

        <div className="divide-y divide-slate-100">
          {paged.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => handleClick(notification)}
              className={cn(
                'flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50',
                !notification.isRead && 'bg-blue-50/60',
              )}
            >
              {!notification.isRead ? (
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
              ) : (
                <span className="mt-1.5 h-2 w-2 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                <p className="mt-0.5 text-sm text-slate-500">{notification.message}</p>
                <p className="mt-1 text-xs text-slate-400">{timeAgo(notification.createdAt)}</p>
              </div>
            </button>
          ))}
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setPage}
          className="border-t border-slate-100"
        />
      </Card>
    </div>
  );
}
