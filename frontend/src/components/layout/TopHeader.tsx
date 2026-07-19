import logoHeader from '@/assets/logoHeader.png';
import { NotificationBell } from '@/components/common/NotificationBell';

interface TopHeaderProps {
  userName?: string;
}

export function TopHeader({ userName = 'Admin User' }: TopHeaderProps) {
  const initials = userName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-2">
      <img src={logoHeader} alt="VeriGate" className="h-14 object-contain" />

      <div className="flex items-center gap-4">
        <NotificationBell />
        <div className="h-6 w-px bg-slate-200" />
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
            {initials}
          </div>
          <span className="text-sm font-medium text-slate-700">{userName}</span>
        </div>
      </div>
    </header>
  );
}
