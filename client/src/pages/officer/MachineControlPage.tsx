import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, Users, CheckCircle, Clock, Activity,
  Play, Lock, Unlock, Pause, Square, RefreshCw, Vote, ExternalLink,
} from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { pollingStationService } from '../../services/api.service';
import { authService } from '../../services/auth.service';
import { StatCard, Spinner, ConfirmDialog } from '../../components/ui';
import { toast } from 'react-hot-toast';

/**
 * MachineControlPage — Dedicated page for Officer machine controls at /officer/machine.
 * Shows full turnout stats and EVM machine control buttons.
 */
export const MachineControlPage: React.FC = () => {
  const user = authService.getCurrentUser();
  const stationId = user?.profile?.pollingStationId ?? user?.stationId;

  // ── Data fetching with auto-refresh every 30 s ─────────────────────────────
  const fetchStation = useCallback(
    () => (stationId ? pollingStationService.getById(stationId) : Promise.resolve(null)),
    [stationId],
  );
  const { data: station, loading: stationLoading, refresh: refetchStation } = useAutoRefresh(fetchStation, 30_000);

  const fetchTurnout = useCallback(
    () => (stationId ? pollingStationService.getTurnout(stationId) : Promise.resolve(null)),
    [stationId],
  );
  const { data: turnout, secondsSince, refresh: refetchTurnout } = useAutoRefresh(fetchTurnout, 30_000);

  // ── Machine action state ───────────────────────────────────────────────────
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    status: string;
    isPollingActive?: boolean;
    title: string;
    message: string;
  } | null>(null);



  // ── Machine update handler ─────────────────────────────────────────────────
  const updateMachineStatus = async (status: string, isPollingActive?: boolean) => {
    if (!stationId) return;
    setActionLoading(true);
    try {
      await pollingStationService.updateMachineStatus(stationId, status, isPollingActive);
      toast.success(`Machine status updated to ${status}`);
      await Promise.all([refetchStation(), refetchTurnout()]);
    } catch {
      toast.error('Failed to update machine status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirm = () => {
    if (confirmAction) {
      updateMachineStatus(confirmAction.status, confirmAction.isPollingActive);
      setConfirmAction(null);
    }
  };

  const machineStatus = (station as { machineStatus: string } | null)?.machineStatus;
  const isActive = machineStatus === 'ACTIVE';
  const isLocked = machineStatus === 'LOCKED';
  const isPaused = machineStatus === 'PAUSED';
  const isIdle = machineStatus === 'IDLE';

  const turnoutData = turnout as {
    totalVoters: number; votedCount: number; remaining: number; turnoutPercent: string;
  } | null;

  if (!stationId) {
    return (
      <div className="space-y-6">
        <div className="page-header">
          <div>
            <h1 className="page-title"><span className="text-gradient">Machine Control</span></h1>
            <p className="page-subtitle">EVM booth machine management panel</p>
          </div>
        </div>
        <div className="card p-10 text-center">
          <Building2 size={48} className="text-slate-600 mx-auto mb-4" />
          <h3 className="text-base font-bold text-slate-300 mb-2">No Polling Booth Assigned</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            You are not assigned to a specific polling station. Machine controls are only available
            for officers assigned to a booth. Use the main dashboard to manage elections.
          </p>
          <Link to="/officer" className="btn-primary mt-6 inline-flex text-sm">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Building2 size={22} className="text-blue-400" />
            <span className="text-gradient">Machine Control</span>
          </h1>
          <p className="page-subtitle">
            {station ? `${(station as { name: string }).name} · ${(station as { code: string }).code}` : 'EVM Booth Management'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/voting-machine${stationId ? `?stationId=${stationId}` : ''}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              if (stationId) localStorage.setItem('evm_station_id', stationId.toString());
            }}
            className="btn-primary text-xs flex items-center gap-2 py-2 px-3 shadow-md hover:shadow-primary-500/20 transition-all"
            title="Open EVM Voting Machine for this polling station"
          >
            <Vote size={15} />
            <span>Open Voting Machine</span>
            <ExternalLink size={13} className="text-primary-200" />
          </a>
          <button
            onClick={() => { refetchStation(); refetchTurnout(); }}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <RefreshCw size={12} />
            <span>{secondsSince < 5 ? 'Live' : `${secondsSince}s ago`}</span>
          </button>
          {station && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${
              isActive ? 'bg-emerald-500/10 border-emerald-500/20' :
              isPaused ? 'bg-amber-500/10 border-amber-500/20' :
              isLocked ? 'bg-red-500/10 border-red-500/20' :
              'bg-slate-500/10 border-slate-500/20'
            }`}>
              <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : isPaused ? 'bg-amber-400' : isLocked ? 'bg-red-400' : 'bg-slate-400'}`} />
              <span className={`text-xs font-medium ${isActive ? 'text-emerald-400' : isPaused ? 'text-amber-400' : isLocked ? 'text-red-400' : 'text-slate-400'}`}>
                {machineStatus ?? 'IDLE'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      {stationLoading && !station ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="card h-28 animate-pulse bg-slate-800/40" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Registered" value={turnoutData?.totalVoters?.toLocaleString() ?? '–'} icon={<Users size={22} className="text-blue-400" />} iconBg="bg-blue-500/20" />
          <StatCard title="Votes Cast" value={turnoutData?.votedCount?.toLocaleString() ?? '–'} icon={<CheckCircle size={22} className="text-emerald-400" />} iconBg="bg-emerald-500/20" />
          <StatCard title="Remaining" value={turnoutData?.remaining?.toLocaleString() ?? '–'} icon={<Clock size={22} className="text-amber-400" />} iconBg="bg-amber-500/20" />
          <StatCard title="Booth Turnout" value={turnoutData?.turnoutPercent ? `${turnoutData.turnoutPercent}%` : '–'} icon={<Activity size={22} className="text-purple-400" />} iconBg="bg-purple-500/20" />
        </div>
      )}

      {/* Turnout Progress */}
      {turnoutData && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">Booth Voting Turnout Progress</h3>
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
          <p className="text-xs text-slate-400 mt-2">{turnoutData.turnoutPercent}% recorded voter turnout</p>
        </div>
      )}

      {/* Machine Controls */}
      <div className="card p-6">
        <h3 className="font-semibold text-white mb-1">Booth EVM Machine Controls</h3>
        <p className="text-xs text-slate-400 mb-5">Control the physical voting machine console at this polling station</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {isIdle && (
            <button onClick={() => updateMachineStatus('ACTIVE', true)} disabled={actionLoading}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all text-emerald-400 disabled:opacity-50">
              <Play size={24} />
              <span className="text-xs font-medium">Start Voting</span>
            </button>
          )}
          {isActive && (
            <>
              <button onClick={() => setConfirmAction({ status: 'LOCKED', isPollingActive: false, title: 'Lock Machine?', message: 'Locking will temporarily stop voters from casting ballots. You can unlock it when ready.' })} disabled={actionLoading}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all text-red-400 disabled:opacity-50">
                <Lock size={24} />
                <span className="text-xs font-medium">Lock Machine</span>
              </button>
              <button onClick={() => updateMachineStatus('PAUSED', false)} disabled={actionLoading}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all text-amber-400 disabled:opacity-50">
                <Pause size={24} />
                <span className="text-xs font-medium">Pause Voting</span>
              </button>
            </>
          )}
          {isLocked && (
            <button onClick={() => updateMachineStatus('ACTIVE', true)} disabled={actionLoading}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all text-emerald-400 disabled:opacity-50">
              <Unlock size={24} />
              <span className="text-xs font-medium">Unlock Machine</span>
            </button>
          )}
          {isPaused && (
            <button onClick={() => updateMachineStatus('ACTIVE', true)} disabled={actionLoading}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all text-emerald-400 disabled:opacity-50">
              <Play size={24} />
              <span className="text-xs font-medium">Resume Voting</span>
            </button>
          )}
          {(isActive || isPaused) && (
            <button onClick={() => setConfirmAction({ status: 'CLOSED', isPollingActive: false, title: 'Close Polling Station?', message: 'Closing is permanent — no further votes can be cast at this booth. Are you sure?' })} disabled={actionLoading}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-700/30 border border-slate-600/30 hover:bg-slate-700/50 transition-all text-slate-400 disabled:opacity-50">
              <Square size={24} />
              <span className="text-xs font-medium">Close Polling</span>
            </button>
          )}
          {actionLoading && (
            <div className="flex items-center justify-center p-4"><Spinner /></div>
          )}
        </div>
      </div>



      {/* Station info */}
      {station && (
        <div className="card p-6">
          <h3 className="font-semibold text-white mb-4">Booth Location Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500 text-xs">Station Name</p>
              <p className="text-white font-medium">{(station as { name: string }).name}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Station Code</p>
              <p className="font-mono text-slate-300">{(station as { code: string }).code}</p>
            </div>
            <div className="col-span-2">
              <p className="text-slate-500 text-xs">Address</p>
              <p className="text-slate-300">{(station as { address: string }).address}</p>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirm}
        title={confirmAction?.title ?? ''}
        message={confirmAction?.message ?? ''}
        confirmText="Yes, Proceed"
        loading={actionLoading}
      />
    </div>
  );
};
