import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Vote, Users, Building2, MapPin, Award, Flag,
  FileText, Shield, Settings, Bell, Database, ChevronDown,
  LogOut, Menu, X, TrendingUp, ClipboardList, UserCog
} from 'lucide-react';
import { authService } from '../services/auth.service';
import { toast } from 'react-hot-toast';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: 'Election Management',
    items: [
      { to: '/admin/elections', label: 'Elections', icon: Vote },
      { to: '/admin/constituencies', label: 'Constituencies', icon: MapPin },
      { to: '/admin/polling-stations', label: 'Polling Stations', icon: Building2 },
    ],
  },
  {
    label: 'People',
    items: [
      { to: '/admin/parties', label: 'Political Parties', icon: Flag },
      { to: '/admin/candidates', label: 'Candidates', icon: Award },
      { to: '/admin/officers', label: 'Election Officers', icon: UserCog },
      { to: '/admin/voters', label: 'Voters', icon: Users },
    ],
  },
  {
    label: 'Results & Reports',
    items: [
      { to: '/admin/results', label: 'Election Results', icon: TrendingUp },
      { to: '/admin/reports', label: 'Reports', icon: FileText },
      { to: '/admin/vvpat', label: 'Digital VVPAT', icon: Shield },
      { to: '/admin/audit-logs', label: 'Audit Logs', icon: ClipboardList },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/admin/notifications', label: 'Notifications', icon: Bell },
      { to: '/admin/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const user = authService.getCurrentUser();

  const handleLogout = async () => {
    await authService.logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center flex-shrink-0">
            <Vote size={20} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">Smart EVM</p>
            <p className="text-[10px] text-slate-400">Election Commission</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-3 mb-2">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `nav-item ${isActive ? 'nav-item-active' : ''}`
                  }
                >
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-slate-700/50">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-700/30">
          <div className="w-9 h-9 rounded-lg bg-primary-600/30 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-primary-400">{user?.profile?.fullName?.[0] ?? 'C'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.profile?.fullName ?? 'Commissioner'}</p>
            <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
          </div>
          <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-slate-600/50 text-slate-400 hover:text-red-400 transition-colors" title="Logout">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 flex-shrink-0 bg-slate-800/50 border-r border-slate-700/50 flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div className="fixed inset-0 bg-black/50 z-40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} />
            <motion.aside className="fixed left-0 top-0 h-full w-64 bg-slate-800 z-50 lg:hidden flex flex-col" initial={{ x: -256 }} animate={{ x: 0 }} exit={{ x: -256 }} transition={{ type: 'tween', duration: 0.25 }}>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 flex-shrink-0 flex items-center gap-4 px-6 border-b border-slate-700/50 bg-slate-800/30">
          <button className="lg:hidden p-2 rounded-lg hover:bg-slate-700/50 text-slate-400" onClick={() => setSidebarOpen(true)}>
            <Menu size={18} />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-400">System Online</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
};
