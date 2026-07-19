import { Menu } from 'lucide-react';
import logoHeader from '@/assets/logoHeader.png';
import { NotificationBell } from '@/components/common/NotificationBell';

interface TopHeaderProps {
  userName?: string;
  onMenuClick?: () => void;
}

export function TopHeader({ userName = 'Admin User', onMenuClick }: TopHeaderProps) {
  const initials = userName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2 sm:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open menu"
            className="shrink-0 text-slate-500 hover:text-slate-900 lg:hidden"
          >
            <Menu size={22} />
          </button>
        )}
        <img src={logoHeader} alt="VeriGate" className="h-10 shrink-0 object-contain sm:h-14" />
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <NotificationBell />
        <div className="hidden h-6 w-px bg-slate-200 sm:block" />
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
            {initials}
          </div>
          <span className="hidden text-sm font-medium text-slate-700 md:inline">{userName}</span>
        </div>
      </div>
    </header>
  );
}
