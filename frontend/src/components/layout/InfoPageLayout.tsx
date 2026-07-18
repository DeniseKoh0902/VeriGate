import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/common/Navbar';
import { Footer } from '@/components/common/Footer';
import { useAuth } from '@/context/AuthContext';
import { roleHomePath } from '@/lib/roleHome';

interface InfoPageLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function InfoPageLayout({ title, description, children }: InfoPageLayoutProps) {
  const { user } = useAuth();
  const backTo = user ? roleHomePath[user.role] : '/login';
  const backLabel = user ? (user.role === 'EMPLOYEE' ? 'Back to Workspace' : 'Back to Dashboard') : 'Back to Sign In';

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <Link
            to={backTo}
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft size={14} />
            {backLabel}
          </Link>

          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}

          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            {children}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
