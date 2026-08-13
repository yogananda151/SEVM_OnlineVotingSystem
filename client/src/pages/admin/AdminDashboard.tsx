import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Vote, Building2, Users, Award, Flag, BarChart3,
  TrendingUp, Activity, CheckCircle, Clock, AlertCircle
} from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { electionService } from '../../services/api.service';
import { StatCard, Skeleton, StatusBadge } from '../../components/ui';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#1a73e8', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899'];

export const AdminDashboard: React.FC = () => {
  const fetchStats = useCallback(() => electionService.getDashboardStats(), []);
  const { data: stats, loading } = useAsync(fetchStats);

  const fetchElections = useCallback(() => electionService.getAll(), []);
  const { data: elections } = useAsync(fetchElections);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  const statCards = [
    { title: 'Total Elections', value: stats?.totalElections ?? 0, icon: <Vote size={22} className="text-blue-400" />, iconBg: 'bg-blue-500/20' },
    { title: 'Active Election', value: stats?.activeElection ? '1 Active' : 'None', icon: <Activity size={22} className="text-emerald-400" />, iconBg: 'bg-emerald-500/20' },
    { title: 'Polling Stations', value: stats?.totalStations ?? 0, icon: <Building2 size={22} className="text-purple-400" />, iconBg: 'bg-purple-500/20' },
    { title: 'Registered Voters', value: (stats?.totalVoters ?? 0).toLocaleString(), icon: <Users size={22} className="text-amber-400" />, iconBg: 'bg-amber-500/20' },
    { title: 'Candidates', value: stats?.totalCandidates ?? 0, icon: <Award size={22} className="text-pink-400" />, iconBg: 'bg-pink-500/20' },
    { title: 'Political Parties', value: stats?.totalParties ?? 0, icon: <Flag size={22} className="text-indigo-400" />, iconBg: 'bg-indigo-500/20' },
    { title: 'Votes Cast', value: (stats?.totalVotes ?? 0).toLocaleString(), icon: <CheckCircle size={22} className="text-teal-400" />, iconBg: 'bg-teal-500/20' },
    { title: 'Turnout %', value: `${stats?.turnoutPercent ?? '0.00'}%`, icon: <TrendingUp size={22} className="text-orange-400" />, iconBg: 'bg-orange-500/20' },
  ];

  const electionStatusData = elections
    ? Object.entries(
        elections.reduce((acc: Record<string, number>, e: { status: string }) => {
          acc[e.status] = (acc[e.status] || 0) + 1;
          return acc;
        }, {})
      ).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="space-y-8 animate-in">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span className="text-gradient">Administrator Dashboard</span>
          </h1>
          <p className="page-subtitle">Election Commission of India – Control Panel</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-400 font-medium">System Online</span>
        </div>
      </div>

      {/* Active Election Banner */}
      {stats?.activeElection && (
        <motion.div
          className="card p-5 border-emerald-500/30 bg-emerald-500/5"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <Activity size={24} className="text-emerald-400 animate-pulse" />
            </div>
            <div>
              <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Active Election</p>
              <p className="text-lg font-bold text-white">{stats.activeElection.name}</p>
              <p className="text-xs text-slate-400">{stats.activeElection.electionType} · {new Date(stats.activeElection.scheduledDate).toLocaleDateString('en-IN')}</p>
            </div>
            <div className="ml-auto">
              <StatusBadge status="ACTIVE" />
            </div>
          </div>
        </motion.div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div key={card.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <StatCard {...card} />
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Elections by Status */}
        <div className="card p-6">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-primary-400" /> Elections by Status
          </h3>
          {electionStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={electionStatusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {electionStatusData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#f1f5f9' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-slate-500 text-sm">No elections created yet</div>
          )}
        </div>

        {/* Recent Elections */}
        <div className="card p-6">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Clock size={18} className="text-primary-400" /> Recent Elections
          </h3>
          <div className="space-y-3">
            {elections?.slice(0, 5).map((e: { id: number; name: string; electionType: string; scheduledDate: string; status: string }) => (
              <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-700/20 hover:bg-slate-700/30 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-primary-600/20 flex items-center justify-center flex-shrink-0">
                  <Vote size={14} className="text-primary-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{e.name}</p>
                  <p className="text-xs text-slate-400">{e.electionType} · {new Date(e.scheduledDate).toLocaleDateString('en-IN')}</p>
                </div>
                <StatusBadge status={e.status} />
              </div>
            ))}
            {(!elections || elections.length === 0) && (
              <div className="text-center py-8 text-slate-500 text-sm">No elections found. Create your first election.</div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h3 className="text-base font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'New Election', href: '/admin/elections', color: 'text-blue-400', bg: 'bg-blue-500/10', icon: Vote },
            { label: 'Add Candidate', href: '/admin/candidates', color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: Award },
            { label: 'Register Voter', href: '/admin/voters', color: 'text-amber-400', bg: 'bg-amber-500/10', icon: Users },
            { label: 'View Reports', href: '/admin/reports', color: 'text-purple-400', bg: 'bg-purple-500/10', icon: BarChart3 },
          ].map((action) => (
            <a key={action.label} href={action.href}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl ${action.bg} border border-slate-700/30 hover:border-slate-600/50 transition-all duration-200 hover:-translate-y-0.5`}>
              <action.icon size={24} className={action.color} />
              <span className="text-xs font-medium text-slate-300">{action.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};
