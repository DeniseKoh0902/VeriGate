import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Cpu,
  Users,
  Settings2,
  ShieldAlert,
  Gavel,
  ScrollText,
  Lightbulb,
  Bot,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Footer } from '@/components/common/Footer';
import { TopHeader } from '@/components/layout/TopHeader';
import { useAuth } from '@/context/AuthContext';

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'AI Tool Management', path: '/ai-tool-management', icon: Cpu },
  { label: 'Employee Management', path: '/employee-management', icon: Users },
  { label: 'Policy Management', path: '/policy-management', icon: Settings2 },
  { label: 'Risk Alert Center', path: '/risk-alert-center', icon: ShieldAlert },
  { label: 'Appeal Queue', path: '/appeal-queue', icon: Gavel },
  { label: 'Audit Logs', path: '/audit-logs', icon: ScrollText },
  { label: 'AI Policy Recommendation', path: '/ai-policy-recommendation', icon: Lightbulb },
  { label: 'Governance Copilot', path: '/governance-copilot', icon: Bot },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <TopHeader userName={user?.name} />

      <div className="flex flex-1">
        <aside className="flex w-64 shrink-0 flex-col bg-slate-900">
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map(({ label, path, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white',
                  )
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="space-y-1 border-t border-slate-800 px-3 py-4">
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>

      <Footer />
    </div>
  );
}
