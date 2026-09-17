import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, Users, CheckCircle, Clock, Lock, Unlock, Pause, Play,
  Square, Activity, Vote, RefreshCw, ExternalLink,
} from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { pollingStationService, electionService } from '../../services/api.service';
import { authService } from '../../services/auth.service';
import { StatCard, Spinner, ConfirmDialog, StatusBadge } from '../../components/ui';
import { toast } from 'react-hot-toast';

interface AssignedElection {
  id: number;
  name: string;
  description?: string | null;
  electionType: string;
  scheduledDate: string;
  startTime?: string | null;
  endTime?: string | null;
  status: string;
  isResultPublished: boolean;
  officerId?: number | null;
  officer?: { id: number; fullName: string; employeeId: string; phone?: string } | null;
  electionConstituencies?: { constituency: { id: number; name: string; code: string } }[];
  _count?: { electionConstituencies: number; candidates: number };
}

export const OfficerDashboard: React.FC = () => {
  const user = authService.getCurrentUser();
  const stationId = user?.profile?.pollingStationId ?? user?.stationId;

  // ── 1. Assigned Elections Data ──────────────────────────────────────
  const fetchElections = useCallback(() => electionService.getMyElections(), []);
  const {
    data: myElections,
    loading: loadingElections,
    execute: refetchElections,
  } = useAsync<AssignedElection[]>(fetchElections);

  // ── 2. Polling Station Data — auto-refresh every 30s (#2) ─────────────────
  const fetchStation = useCallback(
    () => (stationId ? pollingStationService.getById(stationId) : Promise.resolve(null)),
    [stationId],
  );
  const { data: station, execute: refetchStation } = useAsync(fetchStation);

  const fetchTurnout = useCallback(
    () => (stationId ? pollingStationService.getTurnout(stationId) : Promise.resolve(null)),
    [stationId],
  );
  const {
    data: turnout,
    execute: refetchTurnout,
    secondsSince: turnoutSecondsSince,
    refresh: refreshTurnout,
  } = useAutoRefresh(fetchTurnout, 30_000);

  // ── 3. Station Machine Action Confirmation ─────────────────────────
  const [stationActionLoading, setStationActionLoading] = useState(false);
  const [confirmStationAction, setConfirmStationAction] = useState<{
    status: string;
    isPollingActive?: boolean;
    title: string;
    message: string;
  } | null>(null);

  // ── 4. Election Start / Stop Confirmation ──────────────────────────
  const [electionActionLoading, setElectionActionLoading] = useState<number | null>(null);
  const [confirmElectionAction, setConfirmElectionAction] = useState<{
    electionId: number;
    electionName: string;
    targetStatus: string;
    title: string;
    message: string;
    actionType: 'start' | 'pause' | 'resume' | 'stop';
  } | null>(null);



  // ── Machine Control Handlers ───────────────────────────────────────
  const updateMachineStatus = async (status: string, isPollingActive?: boolean) => {
    if (!stationId) return;
    setStationActionLoading(true);
    try {
      await pollingStationService.updateMachineStatus(stationId, status, isPollingActive);
      toast.success(`Machine status updated to ${status}`);
      await Promise.all([refetchStation(), refetchTurnout()]);
    } catch {
      toast.error('Failed to update machine status');
    } finally {
      setStationActionLoading(false);
    }
  };

  const handleConfirmStationAction = () => {
    if (confirmStationAction) {
      updateMachineStatus(confirmStationAction.status, confirmStationAction.isPollingActive);
      setConfirmStationAction(null);
    }
  };

  // ── Election Start / Stop Handlers ─────────────────────────────────
  const requestElectionStatusChange = (
    election: AssignedElection,
    targetStatus: string,
    actionType: 'start' | 'pause' | 'resume' | 'stop',
  ) => {
    let title = '';
    let message = '';
    if (actionType === 'start') {
      title = `Start Election: ${election.name}?`;
      message = `Starting this election will activate voting across all linked polling stations. Voters will be able to cast ballots. Are you sure you want to start this election?`;
    } else if (actionType === 'pause') {
      title = `Pause Election: ${election.name}?`;
      message = `Pausing this election will temporarily suspend voting across all stations. You can resume it at any time.`;
    } else if (actionType === 'resume') {
      title = `Resume Election: ${election.name}?`;
      message = `Resuming will reopen voting across all polling stations for this election.`;
    } else if (actionType === 'stop') {
      title = `STOP ELECTION: ${election.name}?`;
      message = `WARNING: Stopping the election will permanently close voting across all polling stations. No further votes can be cast, and this cannot be undone. Are you sure you want to stop this election?`;
    }

    setConfirmElectionAction({
      electionId: election.id,
      electionName: election.name,
      targetStatus,
      title,
      message,
      actionType,
    });
  };

  const handleConfirmElectionAction = async () => {
    if (!confirmElectionAction) return;
    const { electionId, electionName, targetStatus, actionType } = confirmElectionAction;
    setElectionActionLoading(electionId);
    try {
      await electionService.updateStatus(electionId, targetStatus);
      const actionLabel =
        actionType === 'start' ? 'started' : actionType === 'stop' ? 'stopped' : actionType === 'pause' ? 'paused' : 'resumed';
      toast.success(`Election "${electionName}" ${actionLabel} successfully!`);
      await refetchElections();
      if (stationId) {
        await Promise.all([refetchStation(), refetchTurnout()]);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to update election status.';
      toast.error(msg);
    } finally {
      setElectionActionLoading(null);
      setConfirmElectionAction(null);
    }
  };

  const machineStatus = (station as { machineStatus: string } | null)?.machineStatus;
  const isStationActive = machineStatus === 'ACTIVE';
  const isStationLocked = machineStatus === 'LOCKED';
  const isStationPaused = machineStatus === 'PAUSED';
  const isStationIdle = machineStatus === 'IDLE';

  const turnoutData = turnout as {
    totalVoters: number;
    votedCount: number;
    remaining: number;
    turnoutPercent: string;
  } | null;

  const elections = myElections || [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span className="text-gradient">Officer Control Center</span>
          </h1>
          <p className="page-subtitle">
            Manage your assigned elections, turnout monitoring, and polling stations
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
          {station && (
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${
                isStationActive
                  ? 'bg-emerald-500/10 border-emerald-500/20'
                  : isStationPaused
                  ? 'bg-amber-500/10 border-amber-500/20'
                  : isStationLocked
                  ? 'bg-red-500/10 border-red-500/20'
                  : 'bg-slate-500/10 border-slate-500/20'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  isStationActive
                    ? 'bg-emerald-400 animate-pulse'
                    : isStationPaused
                    ? 'bg-amber-400'
                    : isStationLocked
                    ? 'bg-red-400'
                    : 'bg-slate-400'
                }`}
              />
              <span
                className={`text-xs font-medium ${
                  isStationActive
                    ? 'text-emerald-400'
                    : isStationPaused
                    ? 'text-amber-400'
                    : isStationLocked
                    ? 'text-red-400'
                    : 'text-slate-400'
                }`}
              >
                Station: {machineStatus ?? 'IDLE'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 1: ASSIGNED ELECTIONS (CAN START/STOP) ────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Vote size={20} className="text-emerald-400" />
            <h2 className="text-lg font-bold text-white">Assigned Elections</h2>
            <span className="badge badge-blue text-xs font-semibold">
              {loadingElections ? 'Loading...' : `${elections.length} Assigned`}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Official regulations: Elections can <span className="text-emerald-400 font-semibold">only</span> be started and stopped by assigned Election Officers.
          </p>
        </div>

        {loadingElections ? (
          <div className="card p-8 flex items-center justify-center gap-3 text-slate-400">
            <Spinner size={20} />
            <span className="text-sm">Loading your assigned elections...</span>
          </div>
        ) : elections.length === 0 ? (
          <div className="card p-8 text-center bg-slate-800/40 border border-slate-700/60">
            <Vote size={40} className="text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-300">No Elections Assigned</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              You are not currently assigned to any election. Contact the Chief Election Commissioner to assign you to an election.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {elections.map((election) => {
              const isElectionActive = election.status === 'ACTIVE';
              const isElectionScheduled = election.status === 'SCHEDULED' || election.status === 'DRAFT';
              const isElectionPaused = election.status === 'PAUSED';
              const isElectionClosed = election.status === 'CLOSED';
              const isResultPublished = election.status === 'RESULTS_PUBLISHED';
              const isUpdatingThis = electionActionLoading === election.id;

              return (
                <div
                  key={election.id}
                  className={`card p-5 relative overflow-hidden transition-all border ${
                    isElectionActive
                      ? 'border-emerald-500/40 bg-slate-800/90 ring-1 ring-emerald-500/20'
                      : isElectionPaused
                      ? 'border-amber-500/40 bg-slate-800/90'
                      : 'border-slate-700/70 bg-slate-800/60'
                  }`}
                >
                  {/* Top line indicator */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1 ${
                      isElectionActive
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        : isElectionPaused
                        ? 'bg-amber-500'
                        : isElectionClosed
                        ? 'bg-red-500/60'
                        : isResultPublished
                        ? 'bg-blue-500'
                        : 'bg-slate-600'
                    }`}
                  />

                  {/* Header info */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="badge badge-blue text-[11px]">{election.electionType}</span>
                        <StatusBadge status={election.status} />
                        {election.officerId && (
                          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            Supervising Officer
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-white truncate" title={election.name}>
                        {election.name}
                      </h3>
                    </div>
                  </div>

                  {/* Key election meta */}
                  <div className="grid grid-cols-2 gap-2 text-xs py-2 mb-4 border-y border-slate-700/50">
                    <div>
                      <p className="text-slate-400 text-[11px]">Scheduled Date</p>
                      <p className="text-slate-200 font-medium">
                        {new Date(election.scheduledDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[11px]">Constituencies</p>
                      <p className="text-slate-200 font-medium">
                        {election._count?.electionConstituencies ?? election.electionConstituencies?.length ?? 0} Constituencies
                      </p>
                    </div>
                    {election.startTime && (
                      <div className="col-span-2">
                        <p className="text-slate-400 text-[11px]">Started At</p>
                        <p className="text-emerald-400 font-mono text-[11px]">
                          {new Date(election.startTime).toLocaleString('en-IN')}
                        </p>
                      </div>
                    )}
                    {election.endTime && (
                      <div className="col-span-2">
                        <p className="text-slate-400 text-[11px]">Ended At</p>
                        <p className="text-red-400 font-mono text-[11px]">
                          {new Date(election.endTime).toLocaleString('en-IN')}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Election Control Buttons (Officer exclusive) */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Officer Voting Controls
                    </p>

                    <div className="flex gap-2 flex-wrap">
                      {/* START BUTTON — with pre-flight checks (#3) */}
                      {isElectionScheduled && (() => {
                        const noCandidates = (election._count?.candidates ?? 0) === 0;
                        const noConstituencies = (election._count?.electionConstituencies ?? election.electionConstituencies?.length ?? 0) === 0;
                        const cannotStart = noCandidates || noConstituencies;
                        return (
                          <div className="flex-1 flex flex-col gap-1.5">
                            <button
                              type="button"
                              onClick={() => !cannotStart && requestElectionStatusChange(election, 'ACTIVE', 'start')}
                              disabled={isUpdatingThis || cannotStart}
                              title={cannotStart ? (noCandidates ? 'Cannot start: No candidates registered' : 'Cannot start: No constituencies linked') : undefined}
                              className="w-full btn-primary justify-center bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-2.5 shadow-lg shadow-emerald-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isUpdatingThis ? (
                                <Spinner size={16} />
                              ) : (
                                <>
                                  <Play size={16} className="fill-current" />
                                  <span>Start Election</span>
                                </>
                              )}
                            </button>
                            {cannotStart && (
                              <div className="flex items-center gap-1.5 text-[10px] text-amber-400 px-1">
                                <AlertTriangle size={11} />
                                <span>{noCandidates ? 'No candidates registered' : 'No constituencies linked'}</span>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* ACTIVE STATE CONTROLS */}
                      {isElectionActive && (
                        <>
                          <button
                            type="button"
                            onClick={() => requestElectionStatusChange(election, 'PAUSED', 'pause')}
                            disabled={isUpdatingThis}
                            className="flex-1 py-2 px-3 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-400 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                          >
                            {isUpdatingThis ? <Spinner size={14} /> : <Pause size={14} />}
                            <span>Pause Voting</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => requestElectionStatusChange(election, 'CLOSED', 'stop')}
                            disabled={isUpdatingThis}
                            className="flex-1 py-2 px-3 rounded-xl bg-red-500/20 border border-red-500/40 hover:bg-red-500/30 text-red-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-red-900/20"
                          >
                            {isUpdatingThis ? <Spinner size={14} /> : <Square size={14} className="fill-current" />}
                            <span>Stop Election</span>
                          </button>
                        </>
                      )}

                      {/* PAUSED STATE CONTROLS */}
                      {isElectionPaused && (
                        <>
                          <button
                            type="button"
                            onClick={() => requestElectionStatusChange(election, 'ACTIVE', 'resume')}
                            disabled={isUpdatingThis}
                            className="flex-1 py-2 px-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 text-emerald-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                          >
                            {isUpdatingThis ? <Spinner size={14} /> : <Play size={14} className="fill-current" />}
                            <span>Resume Voting</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => requestElectionStatusChange(election, 'CLOSED', 'stop')}
                            disabled={isUpdatingThis}
                            className="flex-1 py-2 px-3 rounded-xl bg-red-500/20 border border-red-500/40 hover:bg-red-500/30 text-red-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                          >
                            {isUpdatingThis ? <Spinner size={14} /> : <Square size={14} className="fill-current" />}
                            <span>Stop Election</span>
                          </button>
                        </>
                      )}

                      {/* CLOSED STATE */}
                      {isElectionClosed && (
                        <div className="w-full p-2.5 rounded-xl bg-slate-700/40 border border-slate-600/40 text-center">
                          <p className="text-xs font-semibold text-slate-300 flex items-center justify-center gap-1.5">
                            <CheckCircle2 size={14} className="text-emerald-400" />
                            <span>Election Concluded</span>
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Awaiting Commissioner to publish official results.
                          </p>
                        </div>
                      )}

                      {/* RESULTS PUBLISHED STATE */}
                      {isResultPublished && (
                        <div className="w-full p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-center">
                          <p className="text-xs font-semibold text-blue-400 flex items-center justify-center gap-1.5">
                            <CheckCircle2 size={14} className="text-blue-400" />
                            <span>Results Published</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>



      {/* ── SECTION 3: POLLING STATION BOOTH & MACHINE CONTROLS ───── */}
      {stationId && station ? (
        <>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 size={20} className="text-blue-400" />
                <h2 className="text-lg font-bold text-white">
                  Booth Station: {(station as { name: string }).name}
                </h2>
                <span className="badge badge-purple text-xs">{(station as { code: string }).code}</span>
              </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Registered"
                value={turnoutData?.totalVoters?.toLocaleString() ?? '–'}
                icon={<Users size={22} className="text-blue-400" />}
                iconBg="bg-blue-500/20"
              />
              <StatCard
                title="Votes Cast"
                value={turnoutData?.votedCount?.toLocaleString() ?? '–'}
                icon={<CheckCircle size={22} className="text-emerald-400" />}
                iconBg="bg-emerald-500/20"
              />
              <StatCard
                title="Remaining"
                value={turnoutData?.remaining?.toLocaleString() ?? '–'}
                icon={<Clock size={22} className="text-amber-400" />}
                iconBg="bg-amber-500/20"
              />
              <StatCard
                title="Booth Turnout"
                value={turnoutData?.turnoutPercent ? `${turnoutData.turnoutPercent}%` : '–'}
                icon={<Activity size={22} className="text-purple-400" />}
                iconBg="bg-purple-500/20"
              />
            </div>

            {/* Turnout Progress */}
            {turnoutData && (
              <div className="card p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-white">Booth Voting Turnout Progress</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-400">
                      {turnoutData.votedCount} / {turnoutData.totalVoters} voters
                    </span>
                    {/* Live refresh indicator (#2) */}
                    <button
                      onClick={refreshTurnout}
                      title="Refresh turnout now"
                      className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      <RefreshCw size={10} />
                      <span>{(turnoutSecondsSince ?? 0) < 5 ? 'Live' : `${turnoutSecondsSince}s ago`}</span>
                    </button>
                  </div>
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
              <h3 className="font-semibold text-white mb-2">Booth EVM Machine Controls</h3>
              <p className="text-xs text-slate-400 mb-5">
                Control the physical voting machine console at this polling station
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {isStationIdle && (
                  <button
                    onClick={() => updateMachineStatus('ACTIVE', true)}
                    disabled={stationActionLoading}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all text-emerald-400 disabled:opacity-50"
                  >
                    <Play size={24} />
                    <span className="text-xs font-medium">Start Voting</span>
                  </button>
                )}
                {isStationActive && (
                  <>
                    <button
                      onClick={() =>
                        setConfirmStationAction({
                          status: 'LOCKED',
                          isPollingActive: false,
                          title: 'Lock Machine?',
                          message:
                            'Locking the machine will temporarily stop voters from casting ballots. You can unlock it again when ready. Are you sure?',
                        })
                      }
                      disabled={stationActionLoading}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all text-red-400 disabled:opacity-50"
                    >
                      <Lock size={24} />
                      <span className="text-xs font-medium">Lock Machine</span>
                    </button>
                    <button
                      onClick={() => updateMachineStatus('PAUSED', false)}
                      disabled={stationActionLoading}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all text-amber-400 disabled:opacity-50"
                    >
                      <Pause size={24} />
                      <span className="text-xs font-medium">Pause Voting</span>
                    </button>
                  </>
                )}
                {isStationLocked && (
                  <button
                    onClick={() => updateMachineStatus('ACTIVE', true)}
                    disabled={stationActionLoading}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all text-emerald-400 disabled:opacity-50"
                  >
                    <Unlock size={24} />
                    <span className="text-xs font-medium">Unlock Machine</span>
                  </button>
                )}
                {isStationPaused && (
                  <button
                    onClick={() => updateMachineStatus('ACTIVE', true)}
                    disabled={stationActionLoading}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all text-emerald-400 disabled:opacity-50"
                  >
                    <Play size={24} />
                    <span className="text-xs font-medium">Resume Voting</span>
                  </button>
                )}
                {(isStationActive || isStationPaused) && (
                  <button
                    onClick={() =>
                      setConfirmStationAction({
                        status: 'CLOSED',
                        isPollingActive: false,
                        title: 'Close Polling Station?',
                        message:
                          'Closing the station is permanent and concludes booth voting. No further votes can be cast at this booth. Are you sure you want to close this station?',
                      })
                    }
                    disabled={stationActionLoading}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-700/30 border border-slate-600/30 hover:bg-slate-700/50 transition-all text-slate-400 disabled:opacity-50"
                  >
                    <Square size={24} />
                    <span className="text-xs font-medium">Close Polling</span>
                  </button>
                )}
                {stationActionLoading && (
                  <div className="flex items-center justify-center p-4">
                    <Spinner />
                  </div>
                )}
              </div>
            </div>

            {/* Station Information details */}
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
          </div>
        </>
      ) : (
        <div className="card p-5 bg-slate-800/40 border border-slate-700/50 flex items-center gap-3">
          <Building2 size={24} className="text-slate-500 flex-shrink-0" />
          <div className="text-xs text-slate-400">
            <span className="text-white font-semibold">No Specific Polling Booth Assigned: </span>
            You are currently serving as a Supervising Election Officer. Use the controls above to start and stop the election(s).
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Polling Station Machine actions */}
      <ConfirmDialog
        open={!!confirmStationAction}
        onClose={() => setConfirmStationAction(null)}
        onConfirm={handleConfirmStationAction}
        title={confirmStationAction?.title ?? ''}
        message={confirmStationAction?.message ?? ''}
        confirmText="Yes, Proceed"
        loading={stationActionLoading}
      />

      {/* Confirmation Dialog for Election Start / Stop actions */}
      <ConfirmDialog
        open={!!confirmElectionAction}
        onClose={() => setConfirmElectionAction(null)}
        onConfirm={handleConfirmElectionAction}
        title={confirmElectionAction?.title ?? ''}
        message={confirmElectionAction?.message ?? ''}
        confirmText={
          confirmElectionAction?.actionType === 'stop'
            ? 'Yes, Stop Election'
            : confirmElectionAction?.actionType === 'start'
            ? 'Yes, Start Election'
            : 'Yes, Proceed'
        }
        loading={electionActionLoading !== null}
      />
    </div>
  );
};

