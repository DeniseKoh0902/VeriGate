import { cn } from '@/lib/cn';

interface LogoProps {
  size?: 'sm' | 'lg';
  showTagline?: boolean;
  className?: string;
}

const markSizes = {
  sm: 'h-6 w-6 rounded-md text-sm',
  lg: 'h-14 w-14 rounded-2xl text-3xl',
};

const wordmarkSizes = {
  sm: 'text-sm',
  lg: 'text-3xl',
};

export function Logo({ size = 'sm', showTagline = false, className }: LogoProps) {
  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'flex items-center justify-center bg-blue-600 font-bold text-white',
            markSizes[size],
          )}
        >
          M
        </span>
        <span className={cn('font-bold text-slate-900', wordmarkSizes[size])}>
          Veri<span className="text-blue-600">Gate</span>
        </span>
      </div>
      {showTagline && (
        <p className="text-xs font-medium tracking-wide text-slate-400">
          AI Governance Gateway
        </p>
      )}
    </div>
  );
}
