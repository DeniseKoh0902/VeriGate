import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type BadgeStatus = 'good' | 'warning' | 'serious' | 'critical' | 'neutral';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status?: BadgeStatus;
}

const statusClasses: Record<BadgeStatus, string> = {
  good: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  warning: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  serious: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  critical: 'bg-red-50 text-red-700 ring-red-600/20',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};

const statusDot: Record<BadgeStatus, string> = {
  good: 'bg-emerald-500',
  warning: 'bg-amber-500',
  serious: 'bg-orange-500',
  critical: 'bg-red-500',
  neutral: 'bg-slate-400',
};

export function Badge({ status = 'neutral', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset',
        statusClasses[status],
        className,
      )}
      {...props}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', statusDot[status])} aria-hidden="true" />
      {children}
    </span>
  );
}
