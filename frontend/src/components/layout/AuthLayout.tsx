import { type ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { Navbar } from '@/components/common/Navbar';
import { Footer } from '@/components/common/Footer';
import { Logo } from '@/components/common/Logo';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <Logo className="mb-1" />

        {children}

        <p className="mt-6 flex items-center gap-1.5 text-xs text-slate-400">
          <Lock size={12} />
          End-to-end encrypted governance
        </p>
      </main>

      <Footer />
    </div>
  );
}
