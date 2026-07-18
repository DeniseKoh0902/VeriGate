import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Bot, FilePlus2, UserCheck, LogOut } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Footer } from '@/components/common/Footer';
import { TopHeader } from '@/components/layout/TopHeader';
import { useAuth } from '@/context/AuthContext';

const navItems = [
  { label: 'AI Workspace', path: '/workspace', icon: Bot },
  { label: 'AI Tool Request', path: '/workspace/tool-request', icon: FilePlus2 },
  { label: 'My Compliance Overview', path: '/workspace/compliance-overview', icon: UserCheck },
];

export function EmployeeLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50">
      <TopHeader userName={user?.name} />

      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-64 shrink-0 flex-col bg-slate-900">
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map(({ label, path, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                end={path === '/workspace'}
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

        <div className="min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </div>

      <Footer />
    </div>
  );
}
