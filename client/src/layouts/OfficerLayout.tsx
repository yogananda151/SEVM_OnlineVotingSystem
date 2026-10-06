import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, Users, LogOut, Vote, Building2, ExternalLink, UserCheck } from 'lucide-react';
import { authService } from '../services/auth.service';
import { toast } from 'react-hot-toast';

export const OfficerLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const stationId = user?.profile?.pollingStationId ?? user?.stationId;

  const handleLogout = async () => {
    await authService.logout();
    toast.success('Logged out');
    navigate('/');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900">
      <aside className="w-56 flex-shrink-0 bg-slate-800/60 border-r border-slate-700/50 flex flex-col">
        <div className="p-5 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
              <Vote size={20} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Smart EVM</p>
              <p className="text-[10px] text-emerald-400">Officer Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {[
            { to: '/officer', label: 'Dashboard', icon: LayoutDashboard, exact: true },
            { to: '/officer/voters', label: 'Voters', icon: Users },
            { to: '/officer/machine', label: 'Machine Control', icon: Building2 },
            { to: '/officer/profile', label: 'Officer Profile', icon: UserCheck },
          ].map((item) => (
            <NavLink key={item.to} to={item.to} end={item.exact}
              className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}>
              <item.icon size={16} /><span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Quick Launch EVM Terminal for Booth */}
        <div className="p-3">
          <a
            href={`/voting-machine${stationId ? `?stationId=${stationId}` : ''}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              if (stationId) localStorage.setItem('evm_station_id', stationId.toString());
            }}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-emerald-900/30 transition-all group"
            title="Open EVM Voting Machine for this polling station"
          >
            <div className="flex items-center gap-2">
              <Vote size={15} className="text-white" />
              <span>Voting Machine</span>
            </div>
            <ExternalLink size={13} className="text-emerald-200 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>

        <div className="p-3 border-t border-slate-700/50">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-700/30 hover:bg-slate-700/50 transition-colors group">
            <Link to="/officer/profile" className="flex items-center gap-2.5 flex-1 min-w-0" title="View officer profile">
              <div className="w-9 h-9 rounded-lg bg-emerald-600/30 border border-emerald-500/30 flex items-center justify-center group-hover:border-emerald-400 transition-colors">
                <span className="text-sm font-bold text-emerald-400">{user?.profile?.fullName?.[0] ?? 'O'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate group-hover:text-emerald-300 transition-colors">{user?.profile?.fullName ?? 'Officer'}</p>
                <p className="text-[10px] text-slate-400 truncate">Election Officer</p>
              </div>
            </Link>
            <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-slate-600/50 text-slate-400 hover:text-red-400 transition-colors" title="Log out">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 flex-shrink-0 flex items-center px-6 border-b border-slate-700/50 bg-slate-800/30 justify-between">
          <h1 className="text-sm font-semibold text-slate-300">Election Officer Portal</h1>
          <div className="flex items-center gap-4">
            <NavLink
              to="/officer/profile"
              className={({ isActive }) =>
                `text-xs flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
                  isActive
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:border-slate-600'
                }`
              }
            >
              <UserCheck size={13} className="text-emerald-400" />
              <span>Profile</span>
            </NavLink>
            <div className="flex items-center gap-2 pl-2 border-l border-slate-700/60">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-slate-400">Station Active</span>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
};
