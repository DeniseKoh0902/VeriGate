import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Bot, FilePlus2, UserCheck, ShieldCheck } from 'lucide-react';
import { Footer } from '@/components/common/Footer';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { useAuth } from '@/context/AuthContext';

const navItems = [
  { label: 'AI Workspace', path: '/workspace', icon: Bot, end: true },
  { label: 'AI Tool Request', path: '/workspace/tool-request', icon: FilePlus2 },
  { label: 'My Compliance Overview', path: '/workspace/compliance-overview', icon: UserCheck },
  { label: 'My Policies', path: '/workspace/policies', icon: ShieldCheck },
];

export function EmployeeLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50">
      <TopHeader userName={user?.name} onMenuClick={() => setIsSidebarOpen(true)} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          navItems={navItems}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onSignOut={handleSignOut}
        />

        <div className="min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </div>

      <Footer />
    </div>
  );
}
