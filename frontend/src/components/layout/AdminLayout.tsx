import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { Footer } from '@/components/common/Footer';
import { Sidebar } from '@/components/layout/Sidebar';
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <TopHeader userName={user?.name} onMenuClick={() => setIsSidebarOpen(true)} />

      <div className="flex flex-1">
        <Sidebar
          navItems={navItems}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onSignOut={handleSignOut}
        />

        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>

      <Footer />
    </div>
  );
}
