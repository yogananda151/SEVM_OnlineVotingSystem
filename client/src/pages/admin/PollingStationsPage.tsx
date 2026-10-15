import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, Pencil, Trash2, Building2, ArrowRight, AlertCircle, FileSpreadsheet,
  Activity, CheckCircle2, Clock, Pause, Play, Square, Search, Radio,
  RotateCcw, Eye, ShieldCheck, Lock
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAsync, useMutation } from '../../hooks/useAsync';
import { pollingStationService, constituencyService, regionService, electionService } from '../../services/api.service';

import { Modal, ConfirmDialog, TableSkeleton, EmptyState, Spinner } from '../../components/ui';
import { BulkExcelModal } from '../../components/common/BulkExcelModal';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { normaliseValidationErrors } from '../../lib/validationErrors';

interface Station {
  id: number; name: string; code: string; address: string;
  totalBooths: number; capacity?: number; machineStatus?: string; isPollingActive?: boolean;
  turnoutPercent?: number; votesCast?: number; totalVoters?: number;
  constituency: { name: string; code?: string; region?: { name: string } | null };
  officers: { id: number; fullName: string; phone?: string; user?: { email: string } | null }[];
  _count: { voters: number; votes: number };
}
interface Region { id: number; name: string }
interface Constituency { id: number; name: string; code: string }
type FormData = { constituencyId: number; name: string; code: string; address: string; capacity?: number; totalBooths?: number };

export const PollingStationsPage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const [excelDefaultConstituencyId, setExcelDefaultConstituencyId] = useState('');
  const [editTarget, setEditTarget] = useState<Station | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Station | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState('');
  const [filteredConstituencies, setFilteredConstituencies] = useState<Constituency[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'IDLE'>('ALL');
  const [stationSearch, setStationSearch] = useState('');
  const [statusControlStation, setStatusControlStation] = useState<Station | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [confirmStatusAction, setConfirmStatusAction] = useState<{
    status: string;
    isPollingActive?: boolean;
    title: string;
    message: string;
    variant?: 'danger' | 'warning' | 'info';
  } | null>(null);
  const navigate = useNavigate();

  const fetchData = useCallback(() => pollingStationService.getAll(), []);
  const { data: stations, loading, execute: refetch } = useAsync<Station[]>(fetchData);

  const fetchRegions = useCallback(() => regionService.getAll(), []);
  const { data: regions } = useAsync<Region[]>(fetchRegions);

  const fetchConstituencies = useCallback(() => constituencyService.getAll(), []);
  const { data: allConstituencies } = useAsync<Constituency[]>(fetchConstituencies);

  const fetchDashboardStats = useCallback(() => electionService.getDashboardStats(), []);
  const { data: dashboardStats } = useAsync<{ activeElection?: { status: string } }>(fetchDashboardStats);
  const hasActiveElection = Boolean(dashboardStats?.activeElection && dashboardStats.activeElection.status === 'ACTIVE');


  // When region changes in the form, filter constituencies
  useEffect(() => {
    if (!selectedRegionId || !allConstituencies) {
      setFilteredConstituencies(allConstituencies || []);
      return;
    }
    constituencyService.getAll(Number(selectedRegionId))
      .then((data) => setFilteredConstituencies(data as Constituency[]))
      .catch(() => {});
  }, [selectedRegionId, allConstituencies]);

  const { register, handleSubmit, reset, setValue, setError, formState: { errors } } = useForm<FormData>();

  const { mutate: create, loading: creating } = useMutation(
    (d: object) => pollingStationService.create(d),
    {
      onSuccess: () => { refetch(); setModalOpen(false); reset(); },
      successMessage: 'Station created',
      onServerErrors: (data) => {
        const fieldErrors = normaliseValidationErrors(data);
        if (fieldErrors) {
          Object.entries(fieldErrors).forEach(([field, message]) => setError(field as keyof FormData, { message }));
        } else {
          toast.error(data.message || 'Failed to create station.');
        }
      },
    },
  );
  const { mutate: update, loading: updating } = useMutation(
    ({ id, d }: { id: number; d: object }) => pollingStationService.update(id, d),
    {
      onSuccess: () => { refetch(); setModalOpen(false); setEditTarget(null); reset(); },
      successMessage: 'Updated',
      onServerErrors: (data) => {
        const fieldErrors = normaliseValidationErrors(data);
        if (fieldErrors) {
          Object.entries(fieldErrors).forEach(([field, message]) => setError(field as keyof FormData, { message }));
        } else {
          toast.error(data.message || 'Failed to update station.');
        }
      },
    },
  );
  const { mutate: del, loading: deleting } = useMutation(
    (id: number) => pollingStationService.delete(id),
    { onSuccess: () => { refetch(); setDeleteTarget(null); }, successMessage: 'Deleted' },
  );

  const openEdit = (s: Station) => {
    setEditTarget(s);
    setValue('name', s.name);
    setValue('code', s.code);
    setValue('address', s.address);
    setValue('totalBooths', s.totalBooths);
    setModalOpen(true);
  };

  const onSubmit = (data: FormData) => {
    if (editTarget) {
      const payload: Record<string, any> = {
        name: data.name,
        address: data.address,
      };
      if (data.capacity && !isNaN(data.capacity)) payload.capacity = Number(data.capacity);
      if (data.totalBooths && !isNaN(data.totalBooths)) payload.totalBooths = Number(data.totalBooths);
      update({ id: editTarget.id, d: payload });
    } else {
      const d: Record<string, any> = {
        ...data,
        constituencyId: Number(data.constituencyId),
      };
      if (!data.capacity || isNaN(data.capacity)) delete d.capacity;
      else d.capacity = Number(data.capacity);
      if (!data.totalBooths || isNaN(data.totalBooths)) delete d.totalBooths;
      else d.totalBooths = Number(data.totalBooths);
      create(d);
    }
  };

  const getStationStatusCategory = (s: Station): 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'IDLE' => {
    const rawStatus = (s.machineStatus || 'IDLE').toUpperCase();
    if (!hasActiveElection || rawStatus === 'CLOSED') return 'COMPLETED';
    if (s.isPollingActive || rawStatus === 'ACTIVE') return 'ACTIVE';
    if (rawStatus === 'PAUSED' || rawStatus === 'LOCKED') return 'PAUSED';
    return 'IDLE';
  };


  const handleUpdateStationStatus = async (status: string, isPollingActive?: boolean) => {
    if (!statusControlStation) return;
    setStatusUpdating(true);
    try {
      await pollingStationService.updateMachineStatus(statusControlStation.id, status, isPollingActive);
      toast.success(`Station ${statusControlStation.code} status updated to ${status}`);
      refetch();
      setStatusControlStation(null);
      setConfirmStatusAction(null);
    } catch {
      toast.error('Failed to update station machine status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const stationMetrics = useMemo(() => {
    let active = 0;
    let completed = 0;
    let paused = 0;
    let idle = 0;
    (stations || []).forEach((s) => {
      const cat = getStationStatusCategory(s);
      if (cat === 'ACTIVE') active++;
      else if (cat === 'COMPLETED') completed++;
      else if (cat === 'PAUSED') paused++;
      else idle++;
    });
    return {
      total: (stations || []).length,
      active,
      completed,
      paused,
      idle,
    };
  }, [stations]);

  const filteredStationList = useMemo(() => {
    return (stations || []).filter((s) => {
      const cat = getStationStatusCategory(s);
      if (statusFilter !== 'ALL' && cat !== statusFilter) return false;
      if (stationSearch.trim()) {
        const term = stationSearch.toLowerCase();
        const matchesName = s.name.toLowerCase().includes(term);
        const matchesCode = s.code.toLowerCase().includes(term);
        const matchesConstituency = s.constituency?.name?.toLowerCase().includes(term);
        const matchesOfficer = s.officers?.some((o) => o.fullName.toLowerCase().includes(term));
        if (!matchesName && !matchesCode && !matchesConstituency && !matchesOfficer) return false;
      }
      return true;
    });
  }, [stations, statusFilter, stationSearch]);

  const hasNoConstituencies = allConstituencies && allConstituencies.length === 0;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Polling Stations</h1>
          <p className="page-subtitle">Manage voting locations — each belongs to a constituency</p>
        </div>
        {!hasNoConstituencies && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setExcelDefaultConstituencyId('');
                setExcelModalOpen(true);
              }}
              className="btn-secondary flex items-center gap-1.5"
            >
              <FileSpreadsheet size={16} className="text-emerald-400" />
              <span>Import Excel</span>
            </button>
            <button onClick={() => { reset(); setEditTarget(null); setSelectedRegionId(''); setModalOpen(true); }} className="btn-primary">
              <Plus size={16} /> Add Station
            </button>
          </div>
        )}
      </div>

      {/* Guard: no constituencies */}
      {hasNoConstituencies && (
        <div className="card p-8 text-center border-amber-500/20 bg-amber-500/5">
          <Building2 size={40} className="text-amber-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">No constituencies available</h3>
          <p className="text-slate-400 text-sm mb-4">Create constituencies before adding polling stations.</p>
          <button onClick={() => navigate('/admin/constituencies')} className="btn-primary">
            <ArrowRight size={16} /> Go to Constituencies
          </button>
        </div>
      )}

      {!hasNoConstituencies && (
        <>
          {/* Station Status Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div
              onClick={() => setStatusFilter(statusFilter === 'ACTIVE' ? 'ALL' : 'ACTIVE')}
              className={`card p-3.5 border cursor-pointer transition-all ${
                statusFilter === 'ACTIVE'
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-emerald-500/20 bg-emerald-950/10 hover:border-emerald-500/40'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-400 mb-1">
                <span>Active Voting</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-2xl font-bold text-white">{stationMetrics.active}</p>
              <p className="text-[10px] text-slate-400 mt-1">Casting ballots now</p>
            </div>

            <div
              onClick={() => setStatusFilter(statusFilter === 'COMPLETED' ? 'ALL' : 'COMPLETED')}
              className={`card p-3.5 border cursor-pointer transition-all ${
                statusFilter === 'COMPLETED'
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-cyan-500/20 bg-cyan-950/10 hover:border-cyan-500/40'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-cyan-400 mb-1">
                <span>Completed</span>
                <CheckCircle2 size={13} />
              </div>
              <p className="text-2xl font-bold text-white">{stationMetrics.completed}</p>
              <p className="text-[10px] text-slate-400 mt-1">Voting concluded</p>
            </div>

            <div
              onClick={() => setStatusFilter(statusFilter === 'PAUSED' ? 'ALL' : 'PAUSED')}
              className={`card p-3.5 border cursor-pointer transition-all ${
                statusFilter === 'PAUSED'
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-amber-500/20 bg-amber-950/10 hover:border-amber-500/40'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-amber-400 mb-1">
                <span>Paused / Locked</span>
                <Pause size={13} />
              </div>
              <p className="text-2xl font-bold text-white">{stationMetrics.paused}</p>
              <p className="text-[10px] text-slate-400 mt-1">Temporarily stopped</p>
            </div>

            <div
              onClick={() => setStatusFilter(statusFilter === 'IDLE' ? 'ALL' : 'IDLE')}
              className={`card p-3.5 border cursor-pointer transition-all ${
                statusFilter === 'IDLE'
                  ? 'border-slate-500 bg-slate-500/10'
                  : 'border-slate-700 bg-slate-800/40 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-1">
                <span>Standby / Ready</span>
                <Clock size={13} />
              </div>
              <p className="text-2xl font-bold text-white">{stationMetrics.idle}</p>
              <p className="text-[10px] text-slate-400 mt-1">Awaiting start</p>
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  statusFilter === 'ALL'
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                }`}
              >
                All ({stationMetrics.total})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  statusFilter === 'ACTIVE'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-emerald-300 border border-slate-700/60'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active ({stationMetrics.active})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('COMPLETED')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  statusFilter === 'COMPLETED'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-700/60'
                }`}
              >
                <CheckCircle2 size={11} />
                Completed ({stationMetrics.completed})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('PAUSED')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  statusFilter === 'PAUSED'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-amber-300 border border-slate-700/60'
                }`}
              >
                <Pause size={11} />
                Paused ({stationMetrics.paused})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('IDLE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  statusFilter === 'IDLE'
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                }`}
              >
                <Clock size={11} />
                Standby ({stationMetrics.idle})
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search station or code…"
                value={stationSearch}
                onChange={(e) => setStationSearch(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          {loading ? <TableSkeleton rows={5} cols={9} /> : (
            <div className="card overflow-hidden">
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Code</th>
                      <th>Region / Constituency</th>
                      <th>Election Status</th>
                      <th>Officer</th>
                      <th>Turnout %</th>
                      <th>Votes / Voters</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStationList.map((s, i) => {
                      const cat = getStationStatusCategory(s);
                      const voters = s.totalVoters ?? s._count.voters;
                      const votes = s.votesCast ?? s._count.votes;
                      const turnoutPct =
                        s.turnoutPercent !== undefined
                          ? s.turnoutPercent
                          : voters > 0
                          ? Number(((votes / voters) * 100).toFixed(1))
                          : 0;

                      return (
                        <tr key={s.id}>
                          <td className="text-slate-500">{i + 1}</td>
                          <td className="font-medium text-white">{s.name}</td>
                          <td><span className="badge badge-blue font-mono text-xs">{s.code}</span></td>
                          <td>
                            <div className="text-xs">
                              <p className="text-slate-400">{s.constituency.region?.name}</p>
                              <p className="text-white">{s.constituency.name}</p>
                            </div>
                          </td>
                          <td>
                            {cat === 'ACTIVE' && (
                              <span className="badge badge-green text-xs flex items-center gap-1 w-max">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Active Voting
                              </span>
                            )}
                            {cat === 'COMPLETED' && (
                              <span className="badge badge-blue text-xs flex items-center gap-1 w-max">
                                <CheckCircle2 size={12} />
                                Completed
                              </span>
                            )}
                            {cat === 'PAUSED' && (
                              <span className="badge badge-yellow text-xs flex items-center gap-1 w-max">
                                <Pause size={12} />
                                {s.machineStatus === 'LOCKED' ? 'Locked' : 'Paused'}
                              </span>
                            )}
                            {cat === 'IDLE' && (
                              <span className="badge badge-gray text-xs flex items-center gap-1 w-max">
                                <Clock size={12} />
                                Standby
                              </span>
                            )}
                          </td>
                          <td>
                            {s.officers.length > 0
                              ? <span className="badge badge-green text-xs">{s.officers[0].user?.email ?? s.officers[0].fullName}</span>
                              : <span className="badge badge-red text-xs">⚠ No Officer</span>}
                          </td>
                          <td>
                            <div className="w-24 space-y-1">
                              <span className="text-xs font-semibold text-white">{turnoutPct}%</span>
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
                            <span className="text-xs font-mono text-slate-300">{votes} / {voters}</span>
                          </td>
                          <td>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setStatusControlStation(s)}
                                className="p-1.5 text-slate-400 hover:text-emerald-400"
                                title="Control EVM Status"
                              >
                                <Radio size={14} />
                              </button>
                              <button onClick={() => openEdit(s)} className="p-1.5 text-slate-400 hover:text-blue-400" title="Edit"><Pencil size={13} /></button>
                              <button onClick={() => setDeleteTarget(s)} className="p-1.5 text-slate-400 hover:text-red-400" title="Delete"><Trash2 size={13} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filteredStationList.length === 0 && (
                <EmptyState icon={<Building2 size={28} />} title="No matching polling stations" description="Try resetting filters or adding new polling stations" />
              )}
            </div>
          )}
        </>
      )}

      {/* EVM Status Control Modal */}
      <Modal
        open={!!statusControlStation}
        onClose={() => setStatusControlStation(null)}
        title={`EVM Control: ${statusControlStation?.name ?? ''}`}
        size="md"
      >
        {statusControlStation && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Booth Code</p>
                <p className="font-mono text-xs font-bold text-primary-400">{statusControlStation.code}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Current State</p>
                <p className="text-xs font-bold text-white uppercase">{statusControlStation.machineStatus ?? 'IDLE'}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              As Chief Commissioner, you can control the polling state of this machine directly:
            </p>

            {!hasActiveElection ? (
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-2 font-medium">
                <Lock size={15} className="shrink-0 text-cyan-400" />
                <span>Election is stopped or concluded. Polling stations are permanently locked. Voting cannot be started.</span>
              </div>
            ) : getStationStatusCategory(statusControlStation) === 'COMPLETED' ? (
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-2 font-medium">
                <Lock size={15} className="shrink-0 text-cyan-400" />
                <span>This polling station is completed and closed. Voting has concluded for this booth.</span>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                disabled={
                  statusUpdating ||
                  !hasActiveElection ||
                  getStationStatusCategory(statusControlStation) === 'COMPLETED' ||
                  getStationStatusCategory(statusControlStation) === 'ACTIVE'
                }
                title={
                  !hasActiveElection
                    ? "Cannot start: Election is stopped or not active"
                    : getStationStatusCategory(statusControlStation) === 'COMPLETED'
                    ? "Station is sealed and completed"
                    : "Start or resume voting"
                }
                onClick={() =>
                  setConfirmStatusAction({
                    status: 'ACTIVE',
                    isPollingActive: true,
                    title: 'Start / Resume Voting?',
                    message: `Activate polling station "${statusControlStation.name}" for live voting?`,
                    variant: 'info',
                  })
                }
                className="btn-success text-xs py-2 justify-center disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play size={14} /> Start / Resume
              </button>

              <button
                type="button"
                disabled={
                  statusUpdating ||
                  !hasActiveElection ||
                  getStationStatusCategory(statusControlStation) !== 'ACTIVE'
                }
                title={!hasActiveElection ? "Election not active" : "Pause voting"}
                onClick={() =>
                  setConfirmStatusAction({
                    status: 'PAUSED',
                    isPollingActive: false,
                    title: 'Pause Voting?',
                    message: `Pause polling at "${statusControlStation.name}"?`,
                    variant: 'warning',
                  })
                }
                className="btn-secondary text-xs py-2 justify-center text-amber-300 hover:text-amber-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Pause size={14} /> Pause Voting
              </button>


              <button
                type="button"
                disabled={statusUpdating || getStationStatusCategory(statusControlStation) === 'COMPLETED'}
                onClick={() =>
                  setConfirmStatusAction({
                    status: 'CLOSED',
                    isPollingActive: false,
                    title: 'Conclude / Close Station?',
                    message: `Close station "${statusControlStation.name}" and seal EVM machine?`,
                    variant: 'danger',
                  })
                }
                className="btn-secondary text-xs py-2 justify-center text-cyan-300 hover:text-cyan-200"
              >
                <Square size={14} /> Conclude Station
              </button>

              <button
                type="button"
                disabled={statusUpdating || getStationStatusCategory(statusControlStation) === 'IDLE'}
                onClick={() =>
                  setConfirmStatusAction({
                    status: 'IDLE',
                    isPollingActive: false,
                    title: 'Reset to Standby?',
                    message: `Reset "${statusControlStation.name}" to standby mode?`,
                    variant: 'info',
                  })
                }
                className="btn-secondary text-xs py-2 justify-center text-slate-300"
              >
                <RotateCcw size={14} /> Reset Standby
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirmation Dialog for EVM Status Change */}
      <ConfirmDialog
        open={!!confirmStatusAction}
        onClose={() => setConfirmStatusAction(null)}
        onConfirm={() => {
          if (confirmStatusAction) {
            handleUpdateStationStatus(confirmStatusAction.status, confirmStatusAction.isPollingActive);
          }
        }}
        title={confirmStatusAction?.title ?? 'Confirm Action'}
        message={confirmStatusAction?.message ?? ''}
        confirmText="Confirm"
        variant={confirmStatusAction?.variant ?? 'warning'}
        loading={statusUpdating}
      />

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); reset(); setEditTarget(null); setSelectedRegionId(''); }} title={editTarget ? 'Edit Station' : 'Add Polling Station'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {!editTarget && (
            <>
              <div>
                <label className="label" htmlFor="ps-region">Region</label>
                <select id="ps-region" className="input" value={selectedRegionId} onChange={(e) => setSelectedRegionId(e.target.value)}>
                  <option value="">All Regions</option>
                  {(regions || []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <p className="mt-1 text-xs text-slate-500">Filter constituencies by region</p>
              </div>
              <div>
                <label className="label" htmlFor="ps-constituency">Constituency *</label>
                <select
                  id="ps-constituency"
                  {...register('constituencyId', { required: 'Please select a constituency.' })}
                  className={`input ${errors.constituencyId ? 'input-error' : ''}`}
                  aria-invalid={!!errors.constituencyId}
                  aria-describedby={errors.constituencyId ? 'ps-constituency-error' : undefined}
                >
                  <option value="">{selectedRegionId ? 'Select constituency...' : 'Select (filter by region above)'}</option>
                  {filteredConstituencies.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                </select>
                {errors.constituencyId && (
                  <p id="ps-constituency-error" className="field-error-message" role="alert">
                    <AlertCircle size={12} />{errors.constituencyId.message}
                  </p>
                )}
                {filteredConstituencies.length === 0 && selectedRegionId && (
                  <p className="mt-1 text-xs text-amber-400">No constituencies in this region. Add constituencies first.</p>
                )}
              </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="ps-name">Station Name *</label>
              <input
                id="ps-name"
                {...register('name', { required: 'Station name is required.' })}
                className={`input ${errors.name ? 'input-error' : ''}`}
                placeholder="e.g. Government School Hall A"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'ps-name-error' : undefined}
              />
              {errors.name && <p id="ps-name-error" className="field-error-message" role="alert"><AlertCircle size={12} />{errors.name.message}</p>}
            </div>
            <div>
              <label className="label" htmlFor="ps-code">Code *</label>
              <input
                id="ps-code"
                {...register('code', { required: 'Station code is required.' })}
                className={`input ${errors.code ? 'input-error' : ''}`}
                placeholder="e.g. PS-CN01-001"
                aria-invalid={!!errors.code}
                aria-describedby={errors.code ? 'ps-code-error' : undefined}
              />
              <p className="mt-1 text-xs text-slate-500">Must be globally unique</p>
              {errors.code && <p id="ps-code-error" className="field-error-message" role="alert"><AlertCircle size={12} />{errors.code.message}</p>}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="ps-address">Address *</label>
            <textarea
              id="ps-address"
              {...register('address', { required: 'Address is required.' })}
              className={`input min-h-[70px] resize-none ${errors.address ? 'input-error' : ''}`}
              placeholder="Full address..."
              aria-invalid={!!errors.address}
              aria-describedby={errors.address ? 'ps-address-error' : undefined}
            />
            {errors.address && <p id="ps-address-error" className="field-error-message" role="alert"><AlertCircle size={12} />{errors.address.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="ps-capacity">Capacity</label>
              <input id="ps-capacity" {...register('capacity', { valueAsNumber: true })} type="number" className="input" defaultValue={1000} />
            </div>
            <div>
              <label className="label" htmlFor="ps-booths">Total Booths</label>
              <input id="ps-booths" {...register('totalBooths', { valueAsNumber: true })} type="number" className="input" defaultValue={1} />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" className="btn-secondary" onClick={() => { setModalOpen(false); reset(); }}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={creating || updating}>
              {creating || updating ? <Spinner size={16} /> : null} Save
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && del(deleteTarget.id)}
        title="Delete Station" message={`Delete "${deleteTarget?.name}"? This will fail if voters are registered here.`} confirmText="Delete" loading={deleting} />

      <BulkExcelModal
        open={excelModalOpen}
        onClose={() => setExcelModalOpen(false)}
        title="Bulk Import Polling Stations"
        subtitle="Upload an Excel or CSV file. You can specify Constituency ID, Code, or Name in each row or select a default Constituency below."
        templateFilename="polling_stations_template.xlsx"
        onDownloadTemplate={() => pollingStationService.downloadExcelTemplate()}
        onUpload={(file) =>
          pollingStationService.uploadExcel(
            file,
            excelDefaultConstituencyId ? Number(excelDefaultConstituencyId) : undefined
          )
        }
        onSuccess={() => refetch()}
        extraControls={
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
              Default Constituency (Optional fallback if empty in spreadsheet)
            </label>
            <select
              className="input text-xs py-1.5"
              value={excelDefaultConstituencyId}
              onChange={(e) => setExcelDefaultConstituencyId(e.target.value)}
            >
              <option value="">None (Specify in spreadsheet)</option>
              {(allConstituencies || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>
        }
      />
    </div>
  );
};
