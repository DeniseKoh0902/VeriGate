import { cn } from '@/lib/cn';
import logoHeader from '@/assets/logoHeader.png';

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <img
      src={logoHeader}
      alt="VeriGate logo"
      className={cn('h-20 w-auto object-contain', className)}
    />
  );
}
