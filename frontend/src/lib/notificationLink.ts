import type { AppNotification } from '@/types/notification.types';
import type { Role } from '@/types/user.types';

// Where clicking a notification should take the viewer, based on what it's
// about and which side of the app they're on — the same relatedEntityType
// means a different page for an admin reviewing something than for the
// employee it happened to. Shared between NotificationBell and
// NotificationsPage so the two surfaces can't drift out of sync.
export function resolveNotificationLink(
  notification: AppNotification,
  role: Role,
): string | null {
  switch (notification.relatedEntityType) {
    case 'AiToolRequest':
      return role === 'EMPLOYEE' ? '/workspace/tool-request' : null;
    case 'AiTool':
      return role === 'ADMIN' ? '/ai-tool-management' : null;
    case 'Appeal':
      return role === 'ADMIN' ? '/appeal-queue' : '/workspace/compliance-overview';
    case 'RiskAlert':
      return role === 'ADMIN' ? '/risk-alert-center' : '/workspace/compliance-overview';
    case 'Policy':
      return role === 'EMPLOYEE' ? '/workspace/policies' : null;
    default:
      return null;
  }
}
