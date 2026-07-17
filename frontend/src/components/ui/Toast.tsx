import { CheckCircle2, XCircle, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ToastType = 'success' | 'error' | 'warning';

export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

const toastStyles: Record<ToastType, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
};

const toastIcons: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
};

const iconStyles: Record<ToastType, string> = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  warning: 'text-amber-500',
};

export function Toast({ toast, onDismiss }: ToastProps) {
  const Icon = toastIcons[toast.type];

  return (
    <div
      role="alert"
      className={cn(
        'flex w-80 items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg',
        toastStyles[toast.type],
      )}
    >
      <Icon size={18} className={cn('mt-0.5 shrink-0', iconStyles[toast.type])} />
      <p className="flex-1 leading-snug">{toast.message}</p>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 text-current opacity-60 hover:opacity-100"
      >
        <X size={16} />
      </button>
    </div>
  );
}
