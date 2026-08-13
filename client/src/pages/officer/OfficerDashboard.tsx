import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Users, CheckCircle, Clock, Lock, Unlock, Pause, Play, Square, Activity } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { pollingStationService } from '../../services/api.service';
import { authService } from '../../services/auth.service';
import { StatCard, Spinner } from '../../components/ui';
import { toast } from 'react-hot-toast';

export const OfficerDashboard: React.FC = () => {
  const user = authService.getCurrentUser();
  const stationId = user?.profile?.pollingStationId ?? user?.stationId;

  const fetchStation = useCallback(
    () => stationId ? pollingStationService.getById(stationId) : Promise.resolve(null),
    [stationId],
  );
  const { data: station, execute: refetchStation } = useAsync(fetchStation);

  const fetchTurnout = useCallback(
    () => stationId ? pollingStationService.getTurnout(stationId) : Promise.resolve(null),
    [stationId],
  );
  const { data: turnout, execute: refetchTurnout } = useAsync(fetchTurnout);

  const [actionLoading, setActionLoading] = useState(false);

  const updateStatus = async (status: string, isPollingActive?: boolean) => {
    if (!stationId) return;
    setActionLoading(true);
    try {
      await pollingStationService.updateMachineStatus(stationId, status, isPollingActive);
      toast.success(`Machine status updated to ${status}`);
      await Promise.all([refetchStation(), refetchTurnout()]);
    } catch { toast.error('Failed to update status'); }
    finally { setActionLoading(false); }
  };

  const machineStatus = (station as { machineStatus: string } | null)?.machineStatus;
  const isActive = machineStatus === 'ACTIVE';
  const isLocked = machineStatus === 'LOCKED';
  const isPaused = machineStatus === 'PAUSED';
  const isIdle = machineStatus === 'IDLE';

  const turnoutData = turnout as { totalVoters: number; votedCount: number; remaining: number; turnoutPercent: string } | null;

  if (!stationId) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <Building2 size={48} className="text-slate-600 mb-4" />
        <h2 className="text-xl font-bold text-slate-300">No Station Assigned</h2>
        <p className="text-slate-500 mt-2">Contact the Commissioner to assign you a polling station.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span className="text-gradient">Officer Dashboard</span>
          </h1>
          <p className="page-subtitle">{station ? (station as { name: string }).name : 'Loading...'}</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${isActive ? 'bg-emerald-500/10 border-emerald-500/20' : isPaused ? 'bg-amber-500/10 border-amber-500/20' : isLocked ? 'bg-red-500/10 border-red-500/20' : 'bg-slate-500/10 border-slate-500/20'}`}>
          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : isPaused ? 'bg-amber-400' : isLocked ? 'bg-red-400' : 'bg-slate-400'}`} />
          <span className={`text-xs font-medium ${isActive ? 'text-emerald-400' : isPaused ? 'text-amber-400' : isLocked ? 'text-red-400' : 'text-slate-400'}`}>
            {machineStatus ?? 'Loading...'}
          </span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Voters" value={turnoutData?.totalVoters?.toLocaleString() ?? '–'} icon={<Users size={22} className="text-blue-400" />} iconBg="bg-blue-500/20" />
        <StatCard title="Votes Cast" value={turnoutData?.votedCount?.toLocaleString() ?? '–'} icon={<CheckCircle size={22} className="text-emerald-400" />} iconBg="bg-emerald-500/20" />
        <StatCard title="Remaining" value={turnoutData?.remaining?.toLocaleString() ?? '–'} icon={<Clock size={22} className="text-amber-400" />} iconBg="bg-amber-500/20" />
        <StatCard title="Turnout" value={turnoutData?.turnoutPercent ? `${turnoutData.turnoutPercent}%` : '–'} icon={<Activity size={22} className="text-purple-400" />} iconBg="bg-purple-500/20" />
      </div>

      {/* Turnout Progress */}
      {turnoutData && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">Voting Progress</h3>
            <span className="text-sm text-slate-400">{turnoutData.votedCount} / {turnoutData.totalVoters} voters</span>
          </div>
          <div className="w-full h-4 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(Number(turnoutData.turnoutPercent), 100)}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-2">{turnoutData.turnoutPercent}% turnout recorded</p>
        </div>
      )}

      {/* Machine Controls */}
      <div className="card p-6">
        <h3 className="font-semibold text-white mb-5">Machine Controls</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {isIdle && (
            <button onClick={() => updateStatus('ACTIVE', true)} disabled={actionLoading}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all text-emerald-400 disabled:opacity-50">
              <Play size={24} /><span className="text-xs font-medium">Start Voting</span>
            </button>
          )}
          {isActive && (
            <>
              <button onClick={() => updateStatus('LOCKED', false)} disabled={actionLoading}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all text-red-400 disabled:opacity-50">
                <Lock size={24} /><span className="text-xs font-medium">Lock Machine</span>
              </button>
              <button onClick={() => updateStatus('PAUSED', false)} disabled={actionLoading}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all text-amber-400 disabled:opacity-50">
                <Pause size={24} /><span className="text-xs font-medium">Pause Voting</span>
              </button>
            </>
          )}
          {isLocked && (
            <button onClick={() => updateStatus('ACTIVE', true)} disabled={actionLoading}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all text-emerald-400 disabled:opacity-50">
              <Unlock size={24} /><span className="text-xs font-medium">Unlock Machine</span>
            </button>
          )}
          {isPaused && (
            <button onClick={() => updateStatus('ACTIVE', true)} disabled={actionLoading}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all text-emerald-400 disabled:opacity-50">
              <Play size={24} /><span className="text-xs font-medium">Resume Voting</span>
            </button>
          )}
          {(isActive || isPaused) && (
            <button onClick={() => updateStatus('CLOSED', false)} disabled={actionLoading}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-700/30 border border-slate-600/30 hover:bg-slate-700/50 transition-all text-slate-400 disabled:opacity-50">
              <Square size={24} /><span className="text-xs font-medium">Close Polling</span>
            </button>
          )}
          {actionLoading && <div className="flex items-center justify-center p-4"><Spinner /></div>}
        </div>
      </div>

      {/* Station Info */}
      {station && (
        <div className="card p-6">
          <h3 className="font-semibold text-white mb-4">Station Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-slate-500 text-xs">Station Name</p><p className="text-white font-medium">{(station as { name: string }).name}</p></div>
            <div><p className="text-slate-500 text-xs">Station Code</p><p className="font-mono text-slate-300">{(station as { code: string }).code}</p></div>
            <div className="col-span-2"><p className="text-slate-500 text-xs">Address</p><p className="text-slate-300">{(station as { address: string }).address}</p></div>
          </div>
        </div>
      )}
    </div>
  );
};
