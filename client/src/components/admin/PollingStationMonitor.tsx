import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Activity, CheckCircle2, Clock, Pause, Play, Lock, Unlock,
  Square, Search, Filter, RefreshCw, Radio, UserCheck, AlertTriangle,
  ChevronRight, LayoutGrid, ListFilter, ShieldCheck, Eye, Phone, Mail,
  TrendingUp, Check, RotateCcw
} from 'lucide-react';
import { pollingStationService } from '../../services/api.service';
import { Modal, Spinner, ConfirmDialog } from '../ui';
import { toast } from 'react-hot-toast';

export interface StationData {
  id: number;
  name: string;
  code: string;
  address: string;
  capacity?: number;
  totalBooths: number;
  machineStatus?: string;
  isPollingActive?: boolean;
  turnoutPercent?: number;
  votesCast?: number;
  totalVoters?: number;
  isActive?: boolean;
  constituency?: {
    id?: number;
    name: string;
    code?: string;
    region?: { id?: number; name: string } | null;
  } | null;
  officers?: {
    id: number;
    fullName: string;
    employeeId?: string;
    phone?: string;
    user?: { email: string } | null;
  }[];
  _count?: {
    voters: number;
    votes: number;
  };
}

interface PollingStationMonitorProps {
  stations: StationData[];
  loading?: boolean;
  onRefresh?: () => void;
  secondsSince?: number;
}

type FilterStatus = 'ALL' | 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'IDLE';

export const PollingStationMonitor: React.FC<PollingStationMonitorProps> = ({
  stations = [],
  loading = false,
  onRefresh,
  secondsSince,
}) => {
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConstituency, setSelectedConstituency] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Control Modal state
  const [selectedStation, setSelectedStation] = useState<StationData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    status: string;
    isPollingActive?: boolean;
    title: string;
    message: string;
    variant?: 'danger' | 'warning' | 'info';
  } | null>(null);

  // Status computation helper
  const getStationStatusCategory = (s: StationData): 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'IDLE' => {
    const rawStatus = (s.machineStatus || 'IDLE').toUpperCase();
    if (s.isPollingActive || rawStatus === 'ACTIVE') return 'ACTIVE';
    if (rawStatus === 'CLOSED') return 'COMPLETED';
    if (rawStatus === 'PAUSED' || rawStatus === 'LOCKED') return 'PAUSED';
    return 'IDLE';
  };

  // Metrics summary
  const metrics = useMemo(() => {
    let active = 0;
    let completed = 0;
    let paused = 0;
    let idle = 0;
    let totalVotes = 0;
    let totalVoters = 0;

    stations.forEach((s) => {
      const cat = getStationStatusCategory(s);
      if (cat === 'ACTIVE') active++;
      else if (cat === 'COMPLETED') completed++;
      else if (cat === 'PAUSED') paused++;
      else idle++;

      const stationVotes = s.votesCast ?? s._count?.votes ?? 0;
      const stationVoters = s.totalVoters ?? s._count?.voters ?? 0;
      totalVotes += stationVotes;
      totalVoters += stationVoters;
    });

    const total = stations.length;
    const completedPct = total > 0 ? ((completed / total) * 100).toFixed(1) : '0';
    const activePct = total > 0 ? ((active / total) * 100).toFixed(1) : '0';
    const pausedPct = total > 0 ? ((paused / total) * 100).toFixed(1) : '0';
    const idlePct = total > 0 ? ((idle / total) * 100).toFixed(1) : '0';
    const overallTurnout = totalVoters > 0 ? ((totalVotes / totalVoters) * 100).toFixed(2) : '0.00';

    return {
      total,
      active,
      completed,
      paused,
      idle,
      totalVotes,
      totalVoters,
      completedPct,
      activePct,
      pausedPct,
      idlePct,
      overallTurnout,
    };
  }, [stations]);

  // Unique constituencies for filter dropdown
  const constituencies = useMemo(() => {
    const map = new Map<string, string>();
    stations.forEach((s) => {
      if (s.constituency?.name) {
        map.set(s.constituency.name, s.constituency.name);
      }
    });
    return Array.from(map.values()).sort();
  }, [stations]);

  // Filtered stations
  const filteredStations = useMemo(() => {
    return stations.filter((s) => {
      const cat = getStationStatusCategory(s);
      if (statusFilter !== 'ALL' && cat !== statusFilter) {
        return false;
      }

      if (selectedConstituency !== 'ALL' && s.constituency?.name !== selectedConstituency) {
        return false;
      }

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const nameMatch = s.name.toLowerCase().includes(term);
        const codeMatch = s.code.toLowerCase().includes(term);
        const constituencyMatch = s.constituency?.name?.toLowerCase().includes(term);
        const officerMatch = s.officers?.some((o) => o.fullName.toLowerCase().includes(term));
        if (!nameMatch && !codeMatch && !constituencyMatch && !officerMatch) {
          return false;
        }
      }

      return true;
    });
  }, [stations, statusFilter, selectedConstituency, searchTerm]);

  // Handle machine status update
  const handleUpdateStatus = async (status: string, isPollingActive?: boolean) => {
    if (!selectedStation) return;
    setActionLoading(true);
    try {
      await pollingStationService.updateMachineStatus(selectedStation.id, status, isPollingActive);
      toast.success(`Polling Station ${selectedStation.code} status updated to ${status}`);
      if (onRefresh) onRefresh();
      // Update local selected station view
      setSelectedStation((prev) =>
        prev
          ? {
              ...prev,
              machineStatus: status,
              isPollingActive: isPollingActive ?? status === 'ACTIVE',
            }
          : null
      );
      setConfirmDialog(null);
    } catch {
      toast.error('Failed to update polling station status');
    } finally {
      setActionLoading(false);
    }
  };

  const openStationControl = (station: StationData) => {
    setSelectedStation(station);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* ── Section Title & Live Refresh Header ─────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center text-primary-400">
              <Radio size={18} className="animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Polling Stations Live Surveillance
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time monitoring of polling station EVMs, active voting booths, and completed stations
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onRefresh && (
            <button
              onClick={onRefresh}
              title="Refresh polling stations"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin text-primary-400' : ''} />
              <span>
                {loading
                  ? 'Refreshing…'
                  : secondsSince !== undefined
                  ? secondsSince < 5
                    ? 'Live'
                    : `${secondsSince}s ago`
                  : 'Refresh'}
              </span>
            </button>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-slate-800 rounded-xl border border-slate-700/60">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === 'grid'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Grid Card View"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === 'table'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Table View"
            >
              <ListFilter size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI Monitoring Summary Cards ────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Voting Stations Card */}
        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => setStatusFilter(statusFilter === 'ACTIVE' ? 'ALL' : 'ACTIVE')}
          className={`card p-4.5 cursor-pointer transition-all border ${
            statusFilter === 'ACTIVE'
              ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-950/40'
              : 'border-emerald-500/30 bg-emerald-950/20 hover:border-emerald-500/50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
              Active Voting
            </span>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{metrics.active}</span>
            <span className="text-xs text-emerald-300 font-medium">{metrics.activePct}% of total</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
            <Activity size={12} className="text-emerald-400" />
            <span>Currently casting ballots</span>
          </div>
        </motion.div>

        {/* Completed Stations Card */}
        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => setStatusFilter(statusFilter === 'COMPLETED' ? 'ALL' : 'COMPLETED')}
          className={`card p-4.5 cursor-pointer transition-all border ${
            statusFilter === 'COMPLETED'
              ? 'border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-950/40'
              : 'border-cyan-500/30 bg-cyan-950/20 hover:border-cyan-500/50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400">
              Completed Stations
            </span>
            <CheckCircle2 size={15} className="text-cyan-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{metrics.completed}</span>
            <span className="text-xs text-cyan-300 font-medium">{metrics.completedPct}% of total</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck size={12} className="text-cyan-400" />
            <span>Voting ended & sealed</span>
          </div>
        </motion.div>

        {/* Paused / Locked Stations Card */}
        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => setStatusFilter(statusFilter === 'PAUSED' ? 'ALL' : 'PAUSED')}
          className={`card p-4.5 cursor-pointer transition-all border ${
            statusFilter === 'PAUSED'
              ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-950/40'
              : 'border-amber-500/30 bg-amber-950/20 hover:border-amber-500/50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
              Paused / Locked
            </span>
            <Pause size={15} className="text-amber-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{metrics.paused}</span>
            <span className="text-xs text-amber-300 font-medium">{metrics.pausedPct}% of total</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
            <AlertTriangle size={12} className="text-amber-400" />
            <span>Temporarily halted</span>
          </div>
        </motion.div>

        {/* Idle / Ready Stations Card */}
        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => setStatusFilter(statusFilter === 'IDLE' ? 'ALL' : 'IDLE')}
          className={`card p-4.5 cursor-pointer transition-all border ${
            statusFilter === 'IDLE'
              ? 'border-slate-500 bg-slate-500/10 shadow-lg shadow-slate-950/40'
              : 'border-slate-700 bg-slate-800/40 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Idle / Standby
            </span>
            <Clock size={15} className="text-slate-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{metrics.idle}</span>
            <span className="text-xs text-slate-300 font-medium">{metrics.idlePct}% of total</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
            <Building2 size={12} className="text-slate-400" />
            <span>Awaiting poll start</span>
          </div>
        </motion.div>
      </div>

      {/* ── Visual Election Completion Progress Bar ─────────────── */}
      <div className="card p-4 border-slate-700/60 bg-slate-800/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs mb-2.5">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">Election Progress Overview</span>
            <span className="text-slate-400">({metrics.total} Total Polling Stations)</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Active: {metrics.active} ({metrics.activePct}%)
            </span>
            <span className="flex items-center gap-1.5 text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Completed: {metrics.completed} ({metrics.completedPct}%)
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              Standby: {metrics.idle + metrics.paused}
            </span>
          </div>
        </div>

        {/* Multi-segment progress bar */}
        <div className="w-full h-3 bg-slate-700/60 rounded-full overflow-hidden flex">
          {Number(metrics.completedPct) > 0 && (
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400"
              style={{ width: `${metrics.completedPct}%` }}
              title={`Completed: ${metrics.completedPct}%`}
            />
          )}
          {Number(metrics.activePct) > 0 && (
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400"
              style={{ width: `${metrics.activePct}%` }}
              title={`Active Voting: ${metrics.activePct}%`}
            />
          )}
          {Number(metrics.pausedPct) > 0 && (
            <motion.div
              className="h-full bg-gradient-to-r from-amber-600 to-amber-400"
              style={{ width: `${metrics.pausedPct}%` }}
              title={`Paused: ${metrics.pausedPct}%`}
            />
          )}
        </div>
      </div>

      {/* ── Search & Filter Controls ────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              statusFilter === 'ALL'
                ? 'bg-primary-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60'
            }`}
          >
            <span>All Stations</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900/40">
              {metrics.total}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              statusFilter === 'ACTIVE'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-emerald-300 border border-slate-700/60'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Active Voting</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900/40">
              {metrics.active}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('COMPLETED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              statusFilter === 'COMPLETED'
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-700/60'
            }`}
          >
            <CheckCircle2 size={12} className="text-cyan-400" />
            <span>Completed</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900/40">
              {metrics.completed}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('PAUSED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              statusFilter === 'PAUSED'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-amber-300 border border-slate-700/60'
            }`}
          >
            <Pause size={12} className="text-amber-400" />
            <span>Paused</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900/40">
              {metrics.paused}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('IDLE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              statusFilter === 'IDLE'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60'
            }`}
          >
            <Clock size={12} className="text-slate-400" />
            <span>Standby</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900/40">
              {metrics.idle}
            </span>
          </button>
        </div>

        {/* Search & Constituency dropdown */}
        <div className="flex items-center gap-2">
          {constituencies.length > 0 && (
            <select
              value={selectedConstituency}
              onChange={(e) => setSelectedConstituency(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-xl px-2.5 py-2 focus:outline-none focus:border-primary-500"
            >
              <option value="ALL">All Constituencies</option>
              {constituencies.map((con) => (
                <option key={con} value={con}>
                  {con}
                </option>
              ))}
            </select>
          )}

          <div className="relative flex-1 sm:w-64">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              type="text"
              placeholder="Search station, code, officer…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>
      </div>

      {/* ── Stations Display (Grid or Table View) ────────────────── */}
      {filteredStations.length === 0 ? (
        <div className="card p-12 text-center border-slate-700/60">
          <Building2 size={36} className="text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300 mb-1">
            No Polling Stations Match Filters
          </h3>
          <p className="text-xs text-slate-500">
            {searchTerm || statusFilter !== 'ALL' || selectedConstituency !== 'ALL'
              ? 'Try resetting the search filters or choosing a different status tab.'
              : 'No polling stations have been registered in the system yet.'}
          </p>
          {(searchTerm || statusFilter !== 'ALL' || selectedConstituency !== 'ALL') && (
            <button
              onClick={() => {
                setStatusFilter('ALL');
                setSearchTerm('');
                setSelectedConstituency('ALL');
              }}
              className="mt-4 btn-secondary text-xs py-1.5 px-3"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredStations.map((station) => {
            const cat = getStationStatusCategory(station);
            const votes = station.votesCast ?? station._count?.votes ?? 0;
            const voters = station.totalVoters ?? station._count?.voters ?? 0;
            const turnoutPct =
              station.turnoutPercent !== undefined
                ? station.turnoutPercent
                : voters > 0
                ? Number(((votes / voters) * 100).toFixed(1))
                : 0;

            const officer = station.officers?.[0];

            return (
              <motion.div
                key={station.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`card p-5 border flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 ${
                  cat === 'ACTIVE'
                    ? 'border-emerald-500/40 bg-emerald-950/15 shadow-md shadow-emerald-950/20'
                    : cat === 'COMPLETED'
                    ? 'border-cyan-500/30 bg-cyan-950/10'
                    : cat === 'PAUSED'
                    ? 'border-amber-500/30 bg-amber-950/10'
                    : 'border-slate-700/60 bg-slate-800/40'
                }`}
              >
                <div>
                  {/* Card Header: Code & Live Status Badge */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded border border-primary-500/20">
                          {station.code}
                        </span>
                        <span className="text-[11px] text-slate-400 truncate max-w-[150px]">
                          {station.constituency?.name}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white leading-snug line-clamp-1" title={station.name}>
                        {station.name}
                      </h4>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {cat === 'ACTIVE' && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Active Voting</span>
                        </div>
                      )}
                      {cat === 'COMPLETED' && (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[11px] font-semibold">
                          <CheckCircle2 size={12} />
                          <span>Completed</span>
                        </div>
                      )}
                      {cat === 'PAUSED' && (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-semibold">
                          <Pause size={12} />
                          <span>{station.machineStatus === 'LOCKED' ? 'Locked' : 'Paused'}</span>
                        </div>
                      )}
                      {cat === 'IDLE' && (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-700/40 border border-slate-600/40 text-slate-400 text-[11px] font-medium">
                          <Clock size={12} />
                          <span>Standby</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-1 mb-4" title={station.address}>
                    📍 {station.address}
                  </p>

                  {/* Turnout Progress Meter */}
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/40 mb-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Voter Turnout</span>
                      <span className="font-bold text-white">{turnoutPct}%</span>
                    </div>

                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          cat === 'ACTIVE'
                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                            : cat === 'COMPLETED'
                            ? 'bg-gradient-to-r from-cyan-500 to-cyan-400'
                            : 'bg-slate-600'
                        }`}
                        style={{ width: `${Math.min(turnoutPct, 100)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                      <span>Votes Cast: <strong className="text-slate-200">{votes}</strong></span>
                      <span>Total Voters: <strong className="text-slate-200">{voters}</strong></span>
                    </div>
                  </div>

                  {/* Officer Info */}
                  <div className="text-xs mb-4 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Supervising Officer:</span>
                    {officer ? (
                      <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
                        <UserCheck size={12} /> {officer.fullName}
                      </span>
                    ) : (
                      <span className="text-[11px] text-red-400 flex items-center gap-1">
                        <AlertTriangle size={12} /> Unassigned
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Action Button */}
                <button
                  type="button"
                  onClick={() => openStationControl(station)}
                  className="w-full btn-secondary text-xs py-2 flex items-center justify-center gap-1.5 border border-slate-700 hover:border-primary-500/50 hover:text-white transition-all"
                >
                  <Eye size={13} className="text-primary-400" />
                  <span>Monitor & Control Station</span>
                  <ChevronRight size={13} className="text-slate-500 ml-auto" />
                </button>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="card overflow-hidden border-slate-700/60">
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Station</th>
                  <th>Constituency</th>
                  <th>Status</th>
                  <th>Turnout %</th>
                  <th>Votes / Registered</th>
                  <th>Assigned Officer</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStations.map((station) => {
                  const cat = getStationStatusCategory(station);
                  const votes = station.votesCast ?? station._count?.votes ?? 0;
                  const voters = station.totalVoters ?? station._count?.voters ?? 0;
                  const turnoutPct =
                    station.turnoutPercent !== undefined
                      ? station.turnoutPercent
                      : voters > 0
                      ? Number(((votes / voters) * 100).toFixed(1))
                      : 0;
                  const officer = station.officers?.[0];

                  return (
                    <tr key={station.id} className="hover:bg-slate-700/20 transition-colors">
                      <td>
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate text-xs">{station.name}</p>
                          <p className="font-mono text-[10px] text-primary-400">{station.code}</p>
                        </div>
                      </td>
                      <td>
                        <div className="text-xs">
                          <p className="text-slate-200">{station.constituency?.name}</p>
                          <p className="text-[10px] text-slate-500">{station.constituency?.region?.name}</p>
                        </div>
                      </td>
                      <td>
                        {cat === 'ACTIVE' && (
                          <span className="badge badge-green text-[10px] flex items-center gap-1 w-max">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Active Voting
                          </span>
                        )}
                        {cat === 'COMPLETED' && (
                          <span className="badge badge-blue text-[10px] flex items-center gap-1 w-max">
                            <CheckCircle2 size={11} /> Completed
                          </span>
                        )}
                        {cat === 'PAUSED' && (
                          <span className="badge badge-yellow text-[10px] flex items-center gap-1 w-max">
                            <Pause size={11} /> {station.machineStatus === 'LOCKED' ? 'Locked' : 'Paused'}
                          </span>
                        )}
                        {cat === 'IDLE' && (
                          <span className="badge badge-gray text-[10px] flex items-center gap-1 w-max">
                            <Clock size={11} /> Standby
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="w-28 space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-medium text-white">{turnoutPct}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                cat === 'ACTIVE'
                                  ? 'bg-emerald-400'
                                  : cat === 'COMPLETED'
                                  ? 'bg-cyan-400'
                                  : 'bg-slate-500'
                              }`}
                              style={{ width: `${Math.min(turnoutPct, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="text-xs text-slate-300 font-mono">
                          {votes} / {voters}
                        </span>
                      </td>
                      <td>
                        {officer ? (
                          <span className="text-xs text-emerald-400 font-medium">
                            {officer.fullName}
                          </span>
                        ) : (
                          <span className="text-xs text-red-400">⚠ Unassigned</span>
                        )}
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          onClick={() => openStationControl(station)}
                          className="btn-ghost text-xs py-1 px-2 hover:text-primary-300 text-slate-300"
                          title="Manage Station"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Commissioner Station Control Modal ───────────────────── */}
      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedStation(null);
        }}
        title={`Booth Monitor: ${selectedStation?.name ?? ''}`}
        size="md"
      >
        {selectedStation && (
          <div className="space-y-5">
            {/* Meta badge strip */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Station Code</p>
                <p className="font-mono text-sm font-bold text-primary-400">{selectedStation.code}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Current Status</p>
                <div className="mt-0.5">
                  {getStationStatusCategory(selectedStation) === 'ACTIVE' && (
                    <span className="badge badge-green text-xs font-bold">🟢 ACTIVE VOTING</span>
                  )}
                  {getStationStatusCategory(selectedStation) === 'COMPLETED' && (
                    <span className="badge badge-blue text-xs font-bold">🏁 COMPLETED (CLOSED)</span>
                  )}
                  {getStationStatusCategory(selectedStation) === 'PAUSED' && (
                    <span className="badge badge-yellow text-xs font-bold">⏸️ PAUSED / LOCKED</span>
                  )}
                  {getStationStatusCategory(selectedStation) === 'IDLE' && (
                    <span className="badge badge-gray text-xs font-bold">⚪ STANDBY (IDLE)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Turnout metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                <p className="text-[10px] text-slate-400">Total Voters</p>
                <p className="text-lg font-bold text-white">
                  {selectedStation.totalVoters ?? selectedStation._count?.voters ?? 0}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                <p className="text-[10px] text-slate-400">Votes Cast</p>
                <p className="text-lg font-bold text-emerald-400">
                  {selectedStation.votesCast ?? selectedStation._count?.votes ?? 0}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                <p className="text-[10px] text-slate-400">Recorded Turnout</p>
                <p className="text-lg font-bold text-primary-400">
                  {selectedStation.turnoutPercent !== undefined
                    ? `${selectedStation.turnoutPercent}%`
                    : (selectedStation.totalVoters ?? selectedStation._count?.voters ?? 0) > 0
                    ? `${(
                        ((selectedStation.votesCast ?? selectedStation._count?.votes ?? 0) /
                          (selectedStation.totalVoters ?? selectedStation._count?.voters ?? 1)) *
                        100
                      ).toFixed(1)}%`
                    : '0.0%'}
                </p>
              </div>
            </div>

            {/* Details & Location */}
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs space-y-1.5">
              <p className="text-slate-300">
                <strong className="text-slate-400">Constituency:</strong> {selectedStation.constituency?.name} ({selectedStation.constituency?.region?.name})
              </p>
              <p className="text-slate-300">
                <strong className="text-slate-400">Address:</strong> {selectedStation.address}
              </p>
              <p className="text-slate-300">
                <strong className="text-slate-400">Total Booths:</strong> {selectedStation.totalBooths}
              </p>
              {selectedStation.officers && selectedStation.officers.length > 0 ? (
                <div className="pt-2 border-t border-slate-700/50">
                  <p className="font-semibold text-white mb-1">Presiding Officer:</p>
                  <p className="text-slate-300">{selectedStation.officers[0].fullName} ({selectedStation.officers[0].employeeId})</p>
                  {selectedStation.officers[0].phone && (
                    <p className="text-slate-400 flex items-center gap-1 mt-0.5">
                      <Phone size={11} /> {selectedStation.officers[0].phone}
                    </p>
                  )}
                  {selectedStation.officers[0].user?.email && (
                    <p className="text-slate-400 flex items-center gap-1 mt-0.5">
                      <Mail size={11} /> {selectedStation.officers[0].user.email}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-amber-400 pt-1">⚠ No officer currently assigned to this station.</p>
              )}
            </div>

            {/* Commissioner Override Controls */}
            <div className="pt-2 border-t border-slate-700/60">
              <p className="text-xs font-semibold text-white mb-2">
                Chief Commissioner EVM Controls
              </p>
              <p className="text-[11px] text-slate-400 mb-3">
                Directly supervise and transition this polling station's machine state during the election.
              </p>

              <div className="grid grid-cols-2 gap-2">
                {/* Start / Resume */}
                <button
                  type="button"
                  disabled={actionLoading || getStationStatusCategory(selectedStation) === 'ACTIVE'}
                  onClick={() =>
                    setConfirmDialog({
                      status: 'ACTIVE',
                      isPollingActive: true,
                      title: 'Start / Resume Voting?',
                      message: `Are you sure you want to activate polling station "${selectedStation.name}"? Voters will be able to cast ballots.`,
                      variant: 'info',
                    })
                  }
                  className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-all text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Play size={14} />
                  <span>Start / Resume Voting</span>
                </button>

                {/* Pause */}
                <button
                  type="button"
                  disabled={actionLoading || getStationStatusCategory(selectedStation) !== 'ACTIVE'}
                  onClick={() =>
                    setConfirmDialog({
                      status: 'PAUSED',
                      isPollingActive: false,
                      title: 'Pause Voting?',
                      message: `Are you sure you want to pause voting at "${selectedStation.name}"? Ballot casting will be temporarily suspended.`,
                      variant: 'warning',
                    })
                  }
                  className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 transition-all text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Pause size={14} />
                  <span>Pause Voting</span>
                </button>

                {/* Complete / Close */}
                <button
                  type="button"
                  disabled={actionLoading || getStationStatusCategory(selectedStation) === 'COMPLETED'}
                  onClick={() =>
                    setConfirmDialog({
                      status: 'CLOSED',
                      isPollingActive: false,
                      title: 'Complete / Close Polling Station?',
                      message: `Closing station "${selectedStation.name}" concludes voting for this booth. The EVM machine will be sealed and no further votes can be cast.`,
                      variant: 'danger',
                    })
                  }
                  className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25 transition-all text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Square size={14} />
                  <span>Conclude / Complete</span>
                </button>

                {/* Reset to Standby */}
                <button
                  type="button"
                  disabled={actionLoading || getStationStatusCategory(selectedStation) === 'IDLE'}
                  onClick={() =>
                    setConfirmDialog({
                      status: 'IDLE',
                      isPollingActive: false,
                      title: 'Reset to Standby (Idle)?',
                      message: `Reset polling station "${selectedStation.name}" to Idle Standby mode?`,
                      variant: 'info',
                    })
                  }
                  className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-slate-700/40 border border-slate-600/40 text-slate-300 hover:bg-slate-700/60 transition-all text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <RotateCcw size={14} />
                  <span>Reset to Standby</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={!!confirmDialog}
        onClose={() => setConfirmDialog(null)}
        onConfirm={() => {
          if (confirmDialog) {
            handleUpdateStatus(confirmDialog.status, confirmDialog.isPollingActive);
          }
        }}
        title={confirmDialog?.title ?? 'Confirm Action'}
        message={confirmDialog?.message ?? ''}
        confirmText="Confirm Change"
        variant={confirmDialog?.variant ?? 'warning'}
        loading={actionLoading}
      />
    </div>
  );
};
