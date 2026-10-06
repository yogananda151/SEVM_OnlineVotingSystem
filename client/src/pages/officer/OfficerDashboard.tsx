import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2, Users, CheckCircle, Clock, Lock, Unlock, Pause, Play,
  Square, Activity, Vote, RefreshCw, ExternalLink, CheckCircle2,
  UserCheck, Search, ShieldCheck, Mail, Phone, BadgeCheck, ArrowRight,
  Filter, AlertCircle, Eye,
} from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { pollingStationService, electionService, voterService } from '../../services/api.service';
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
    secondsSince: turnoutSecondsSince,
    refresh: refreshTurnout,
  } = useAutoRefresh(fetchTurnout, 30_000);
  const refetchTurnout = refreshTurnout;

  // ── 3. Booth Registered Voters — Scoped strictly to officer's booth ─
  const fetchBoothVoters = useCallback(
    () =>
      stationId
        ? voterService.getAll({ pollingStationId: stationId, limit: 100 })
        : Promise.resolve({ data: [] }),
    [stationId],
  );
  const {
    data: boothVotersRes,
    loading: loadingBoothVoters,
    execute: refetchBoothVoters,
  } = useAsync(fetchBoothVoters);

  const [voterSearch, setVoterSearch] = useState('');
  const [voterStatusFilter, setVoterStatusFilter] = useState<'ALL' | 'VOTED' | 'PENDING'>('ALL');

  const boothVoters: any[] = (boothVotersRes as any)?.data ?? [];
  const filteredBoothVoters = boothVoters.filter((v: any) => {
    const term = voterSearch.trim().toLowerCase();
    const matchesSearch =
      !term ||
      v.fullName?.toLowerCase().includes(term) ||
      v.voterId?.toLowerCase().includes(term) ||
      v.phone?.toLowerCase().includes(term);
    const matchesStatus =
      voterStatusFilter === 'ALL'
        ? true
        : voterStatusFilter === 'VOTED'
        ? v.hasVoted
        : !v.hasVoted;
    return matchesSearch && matchesStatus;
  });

  // ── 4. Station Machine Action Confirmation ─────────────────────────
  const [stationActionLoading, setStationActionLoading] = useState(false);
  const [confirmStationAction, setConfirmStationAction] = useState<{
    status: string;
    isPollingActive?: boolean;
    title: string;
    message: string;
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

  const machineStatus = (station as { machineStatus: string } | null)?.machineStatus;
  const isStationActive = machineStatus === 'ACTIVE';
  const isStationLocked = machineStatus === 'LOCKED';
  const isStationPaused = machineStatus === 'PAUSED';
  const isStationIdle = machineStatus === 'IDLE';

  const rawTurnout = turnout as any;
  const boothVotersCount = boothVoters.length;
  const boothVotersVotedCount = boothVoters.filter((v: any) => v.hasVoted).length;

  const totalVoters =
    rawTurnout?.totalVoters ?? (boothVotersCount > 0 ? boothVotersCount : 0);
  const votedCount =
    rawTurnout?.votedCount ??
    rawTurnout?.votesCast ??
    (boothVotersCount > 0 ? boothVotersVotedCount : 0);
  const remaining =
    rawTurnout?.remaining ??
    Math.max(0, totalVoters - votedCount);
  const turnoutPercent =
    rawTurnout?.turnoutPercent ??
    rawTurnout?.turnoutPercentage ??
    (totalVoters > 0 ? ((votedCount / totalVoters) * 100).toFixed(2) : '0.00');

  const turnoutData = {
    totalVoters,
    votedCount,
    remaining,
    turnoutPercent,
  };

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
          <Link
            to="/officer/profile"
            className="btn-secondary text-xs flex items-center gap-2 py-2 px-3 shadow-md hover:border-emerald-500/50 hover:text-emerald-300 transition-all"
            title="View Election Officer Profile"
          >
            <UserCheck size={15} className="text-emerald-400" />
            <span>Officer Profile</span>
          </Link>
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
            Supervised election overview. Operate and control your booth EVM machine below.
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

                  {/* Election Status Information */}
                  <div className="pt-1">
                    {isElectionActive && (
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                        <Activity size={14} className="flex-shrink-0 animate-pulse" />
                        <span>Election is currently active. Operate and monitor your booth EVM machine below.</span>
                      </div>
                    )}
                    {isElectionPaused && (
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                        <Clock size={14} className="flex-shrink-0" />
                        <span>Election is temporarily paused by the Commission.</span>
                      </div>
                    )}
                    {isElectionScheduled && (
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs">
                        <Clock size={14} className="flex-shrink-0" />
                        <span>Scheduled for voting on {new Date(election.scheduledDate).toLocaleDateString('en-IN')}.</span>
                      </div>
                    )}
                    {isElectionClosed && (
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-700/40 border border-slate-600/40 text-slate-300 text-xs">
                        <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                        <span>Election concluded. Awaiting official results publication.</span>
                      </div>
                    )}
                    {isResultPublished && (
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs">
                        <CheckCircle2 size={14} className="text-blue-400 flex-shrink-0" />
                        <span>Results have been officially published.</span>
                      </div>
                    )}
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

            {/* Officer Profile & Credentials Summary */}
            <div className="card p-6 bg-gradient-to-br from-slate-800/90 via-slate-800/60 to-emerald-950/20 border border-slate-700/70 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-700/50">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-900/30">
                    <UserCheck size={24} className="text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-base">
                        {user?.profile?.fullName ?? user?.name ?? 'Election Officer'}
                      </h3>
                      <span className="badge badge-emerald text-[11px]">
                        ECI Commissioned
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                      <span>Badge: <span className="font-mono text-emerald-300 font-semibold">{user?.profile?.employeeId ?? 'DL-EO-001'}</span></span>
                      <span>•</span>
                      <span>{user?.email}</span>
                    </p>
                  </div>
                </div>

                <Link
                  to="/officer/profile"
                  className="btn-secondary text-xs flex items-center gap-2 py-2 px-3 self-start sm:self-auto hover:border-emerald-500/50 hover:text-emerald-300 transition-all"
                >
                  <UserCheck size={14} className="text-emerald-400" />
                  <span>View Full Officer Profile</span>
                  <ArrowRight size={13} />
                </Link>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 text-xs">
                <div>
                  <p className="text-slate-500 mb-1">Official Role</p>
                  <p className="text-white font-medium flex items-center gap-1.5">
                    <BadgeCheck size={13} className="text-emerald-400" />
                    Presiding Officer
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Official Contact</p>
                  <p className="text-slate-300 font-mono">
                    {user?.profile?.phone || '+91 98765 00001'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Station Code</p>
                  <p className="font-mono text-emerald-400 font-semibold">
                    {(station as { code: string }).code}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Live EVM Status</p>
                  <p className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    {machineStatus || 'READY'}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Registered Booth Voters Section (Strictly Scoped to this Booth) ── */}
            <div className="card p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/50">
                <div>
                  <div className="flex items-center gap-2">
                    <Users size={18} className="text-emerald-400" />
                    <h3 className="text-base font-bold text-white">Registered Booth Voters</h3>
                    <span className="badge badge-emerald text-xs">
                      {boothVoters.length} Registered at Booth
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Strict Booth Roster: Showing only voters enrolled at Polling Station{' '}
                    <span className="font-mono text-emerald-400 font-semibold">{(station as { code: string }).code}</span> ({station ? (station as { name: string }).name : ''})
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => refetchBoothVoters()}
                    disabled={loadingBoothVoters}
                    className="p-2 rounded-xl bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1.5 border border-slate-600/50"
                    title="Refresh booth voter roster"
                  >
                    <RefreshCw size={13} className={loadingBoothVoters ? 'animate-spin' : ''} />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>

                  <Link
                    to="/officer/voters"
                    className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-3 hover:border-emerald-500/50 hover:text-emerald-300 transition-all"
                  >
                    <span>Full Voter Roster</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>

              {/* Search & Status Filters */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={voterSearch}
                    onChange={(e) => setVoterSearch(e.target.value)}
                    placeholder="Search booth voters by name, EPIC ID, or phone..."
                    className="input-field pl-9 py-2 text-xs w-full"
                  />
                  {voterSearch && (
                    <button
                      onClick={() => setVoterSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-xs">
                  <button
                    type="button"
                    onClick={() => setVoterStatusFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      voterStatusFilter === 'ALL'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All ({boothVoters.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoterStatusFilter('VOTED')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      voterStatusFilter === 'VOTED'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Voted ({boothVoters.filter((v: any) => v.hasVoted).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoterStatusFilter('PENDING')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      voterStatusFilter === 'PENDING'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Pending ({boothVoters.filter((v: any) => !v.hasVoted).length})
                  </button>
                </div>
              </div>

              {/* Voters Table */}
              {loadingBoothVoters ? (
                <div className="flex items-center justify-center py-12">
                  <Spinner size={28} />
                </div>
              ) : filteredBoothVoters.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-700/60 rounded-xl bg-slate-800/20">
                  <Users size={28} className="mx-auto text-slate-500 mb-2 opacity-50" />
                  <p className="text-sm font-semibold text-slate-300">No voters found</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    {voterSearch
                      ? `No registered voters at this booth match "${voterSearch}".`
                      : 'No voters are currently registered to this polling booth.'}
                  </p>
                  {voterSearch && (
                    <button
                      onClick={() => setVoterSearch('')}
                      className="mt-3 text-xs text-emerald-400 hover:underline"
                    >
                      Clear search filter
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-700/50">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-800/90 text-slate-400 text-[11px] font-semibold uppercase tracking-wider border-b border-slate-700/60">
                      <tr>
                        <th className="py-3 px-3.5">#</th>
                        <th className="py-3 px-3.5">EPIC / Voter ID</th>
                        <th className="py-3 px-3.5">Full Name</th>
                        <th className="py-3 px-3.5">Gender / Age</th>
                        <th className="py-3 px-3.5">Phone</th>
                        <th className="py-3 px-3.5">Turnout Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/40 bg-slate-800/30">
                      {filteredBoothVoters.map((v: any, idx: number) => {
                        const age = v.dateOfBirth
                          ? Math.floor(
                              (new Date().getTime() - new Date(v.dateOfBirth).getTime()) /
                                (365.25 * 24 * 60 * 60 * 1000),
                            )
                          : null;
                        return (
                          <tr key={v.id} className="hover:bg-slate-700/30 transition-colors">
                            <td className="py-3 px-3.5 font-mono text-slate-500">
                              {v.serialNumber ?? idx + 1}
                            </td>
                            <td className="py-3 px-3.5 font-mono font-medium text-emerald-400">
                              {v.voterId}
                            </td>
                            <td className="py-3 px-3.5 font-medium text-white">
                              {v.fullName}
                            </td>
                            <td className="py-3 px-3.5 text-slate-400">
                              {v.gender || '–'} {age ? `• ${age} yrs` : ''}
                            </td>
                            <td className="py-3 px-3.5 font-mono text-slate-400">
                              {v.phone || '–'}
                            </td>
                            <td className="py-3 px-3.5">
                              {v.hasVoted ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                  <CheckCircle2 size={11} />
                                  Voted
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                  <Clock size={11} />
                                  Pending
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="card p-5 bg-slate-800/40 border border-slate-700/50 flex items-center gap-3">
          <Building2 size={24} className="text-slate-500 flex-shrink-0" />
          <div className="text-xs text-slate-400">
            <span className="text-white font-semibold">No Specific Polling Booth Assigned: </span>
            You are currently serving as an Election Officer supervising the election above.
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
    </div>
  );
};

