import { cn } from '@/lib/cn';
import logoHeader from '@/assets/logoHeader.png';

interface LogoProps {
  size?: 'sm' | 'lg';
  className?: string;
}

const markSizes = {
  sm: 'h-6 w-6 rounded-md',
  lg: 'h-36 w-36 rounded-2xl',
};

export function Logo({ size = 'sm', className }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <img
        src={logoHeader}
        alt="VeriGate logo"
        className={cn('object-contain', markSizes[size])}
      />
    </div>
  );
}
