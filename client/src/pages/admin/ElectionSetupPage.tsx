import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAsync, useMutation } from '../../hooks/useAsync';
import {
  electionService,
  constituencyService,
  regionService,
  candidateService,
  partyService,
  officerService,
  pollingStationService,
} from '../../services/api.service';
import { Spinner, EmptyState } from '../../components/ui';
import { useForm } from 'react-hook-form';
import {
  MapPin, Users, Award, CheckCircle, ChevronRight, ChevronLeft,
  AlertCircle, Loader2, Globe, RefreshCw, Plus, Trash2, UserCog, Search,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

interface Region { id: number; name: string; _count: { constituencies: number } }
interface Constituency { id: number; name: string; code: string; regionId: number; region: { name: string }; _count: { pollingStations: number; voters: number } }
interface Candidate { id: number; fullName: string; serialNumber: number; age: number; constituencyId: number; party?: { name: string; color: string } }
interface Party { id: number; name: string; abbreviation: string; color: string }
interface Election { id: number; name: string; status: string; electionType: string; scheduledDate: string }
interface Officer {
  id: number;
  fullName: string;
  employeeId: string;
  phone: string;
  deletedAt?: string | null;
  pollingStation?: { id: number; name: string; code: string };
  user: { id: number; email: string; isActive: boolean };
}
interface ReadinessData {
  election: Election;
  officer: Officer | null;
  hasElectionOfficer: boolean;
  totalConstituencies: number;
  totalStations: number;
  totalVoters: number;
  totalCandidates: number;
  stationsWithoutOfficer: number;
  constituenciesWithoutCandidates: number;
  issues: string[];
  isReady: boolean;
}
interface ElectionLink { constituency: Constituency }

const STEPS = [
  { id: 1, title: 'Constituencies', description: 'Select participating constituencies', icon: MapPin },
  { id: 2, title: 'Election Officer', description: 'Assign a supervising officer', icon: UserCog },
  { id: 3, title: 'Candidates', description: 'Register candidates per constituency', icon: Award },
  { id: 4, title: 'Review & Publish', description: 'Validate and schedule the election', icon: CheckCircle },
];

// ─────────────────────────────────────────────────────────────────
// Step 1 – Constituency Selector
// ─────────────────────────────────────────────────────────────────

const Step1: React.FC<{
  electionId: number;
  selectedIds: number[];
  onToggle: (id: number) => void;
  onSelectAll: (ids: number[]) => void;
  onClear: () => void;
  saving: boolean;
  error?: string;
}> = ({ selectedIds, onToggle, onSelectAll, onClear, error }) => {
  const [filterRegion, setFilterRegion] = useState('');

  const fetchRegions = useCallback(() => regionService.getAll(), []);
  const { data: regions } = useAsync<Region[]>(fetchRegions);

  const fetchConstituencies = useCallback(
    () => constituencyService.getActive(filterRegion ? Number(filterRegion) : undefined),
    [filterRegion],
  );
  const { data: constituencies, loading } = useAsync<Constituency[]>(fetchConstituencies);

  const grouped: Record<string, Constituency[]> = {};
  (constituencies || []).forEach((c) => {
    const key = c.region.name;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(c);
  });

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl" role="alert">
          <AlertCircle size={15} className="text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex gap-3 items-center">
          <select className="input max-w-[200px] text-sm" value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)}>
            <option value="">All Regions</option>
            {(regions || []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onSelectAll((constituencies || []).map((c) => c.id))} className="btn-secondary text-xs py-1.5 px-3">Select All Visible</button>
          <button onClick={onClear} className="btn-secondary text-xs py-1.5 px-3">Clear</button>
        </div>
      </div>

      <div className={`flex items-center gap-2 p-3 rounded-xl border ${selectedIds.length > 0 ? 'bg-primary-500/10 border-primary-500/20' : 'bg-slate-800/40 border-slate-700/50'}`}>
        <CheckCircle size={15} className={selectedIds.length > 0 ? 'text-primary-400' : 'text-slate-500'} />
        <p className="text-sm text-primary-300">{selectedIds.length} constituency(ies) selected for this election</p>
      </div>

      {loading ? <Spinner size={24} /> : (
        <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
          {Object.entries(grouped).map(([regionName, cons]) => (
            <div key={regionName} className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Globe size={14} className="text-primary-400" />
                <h4 className="text-sm font-semibold text-white">{regionName}</h4>
                <span className="text-xs text-slate-400">({cons.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {cons.map((c) => {
                  const isSelected = selectedIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => onToggle(c.id)}
                      className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all duration-150 ${
                        isSelected
                          ? 'border-primary-500 bg-primary-500/10'
                          : 'border-slate-700/60 bg-slate-800/40 hover:border-slate-600'
                      }`}
                      aria-pressed={isSelected}
                      aria-label={`${c.name} - ${isSelected ? 'selected' : 'not selected'}`}
                    >
                      <div className={`w-4 h-4 rounded mt-0.5 flex-shrink-0 border-2 flex items-center justify-center ${isSelected ? 'border-primary-500 bg-primary-500' : 'border-slate-600'}`}>
                        {isSelected && <CheckCircle size={10} className="text-white" />}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-slate-300'}`}>{c.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{c._count.pollingStations} stations · {c._count.voters.toLocaleString()} voters</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {Object.keys(grouped).length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <MapPin size={28} className="mx-auto mb-2 opacity-40" />
              <p>No constituencies found. Add them in the Constituencies section first.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Step 2 – Election Officer Assignment
// ─────────────────────────────────────────────────────────────────

const Step2Officer: React.FC<{
  electionId: number;
  selectedConstituencyIds: number[];
  currentOfficerId: number | null;
  onOfficerSaved: (officer: Officer | null) => void;
  error?: string;
}> = ({ electionId, selectedConstituencyIds, currentOfficerId, onOfficerSaved, error }) => {
  const [activeTab, setActiveTab] = useState<'supervising' | 'booths'>('supervising');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(currentOfficerId);
  const [localError, setLocalError] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const fetchOfficers = useCallback(() => officerService.getAll(), []);
  const { data: allOfficers, loading } = useAsync<Officer[]>(fetchOfficers);

  // Filter to only active officers (not deleted, user is active)
  const activeOfficers = (allOfficers || []).filter(
    (o) => o.user?.isActive !== false && !o.deletedAt,
  );

  const filtered = search.trim()
    ? activeOfficers.filter((o) =>
        o.fullName.toLowerCase().includes(search.toLowerCase()) ||
        o.employeeId.toLowerCase().includes(search.toLowerCase()) ||
        o.user.email.toLowerCase().includes(search.toLowerCase()),
      )
    : activeOfficers;

  const selectedOfficer = activeOfficers.find((o) => o.id === selectedId) ?? null;

  // Fetch all polling stations to allow assigning officers per station
  const fetchStations = useCallback(() => pollingStationService.getAll(), []);
  const { data: allStationsData, execute: refetchStations } = useAsync<any[]>(fetchStations);

  const participatingStations = (allStationsData || []).filter((s: any) =>
    selectedConstituencyIds.includes(s.constituencyId),
  );

  const unassignedStations = participatingStations.filter(
    (s: any) => !s.officers || s.officers.length === 0,
  );

  const { mutate: saveOfficer, loading: saving } = useMutation(
    (officerId: number | null) => electionService.setOfficer(electionId, officerId),
    {
      onSuccess: (result) => {
        onOfficerSaved(result as Officer | null);
        toast.success(result ? 'Election Officer assigned' : 'Election Officer removed');
      },
      onServerErrors: (data) => {
        setLocalError(data.message || 'Failed to assign officer. Please try again.');
      },
    },
  );

  const handleSelect = (officer: Officer) => {
    setSelectedId(officer.id);
    setLocalError(null);
  };

  const handleSave = () => {
    if (!selectedId) {
      setLocalError('Please select an Election Officer before continuing.');
      searchRef.current?.focus();
      return;
    }
    saveOfficer(selectedId);
  };

  const handleRemove = () => {
    setSelectedId(null);
    saveOfficer(null);
  };

  const handleAssignBoothOfficer = async (stationId: number, officerIdStr: string) => {
    try {
      if (!officerIdStr) return;
      const officerId = Number(officerIdStr);
      await officerService.update(officerId, { pollingStationId: stationId });
      toast.success('Booth officer assigned successfully');
      refetchStations();
    } catch {
      toast.error('Failed to assign booth officer');
    }
  };

  const displayError = error || localError;

  return (
    <div className="space-y-5">
      {/* Sub-Tabs */}
      <div className="flex border-b border-slate-700/50 gap-4">
        <button
          type="button"
          onClick={() => setActiveTab('supervising')}
          className={`pb-2.5 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'supervising'
              ? 'border-primary-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserCog size={16} />
          Supervising Officer
          {selectedOfficer && <CheckCircle size={14} className="text-emerald-400" />}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('booths')}
          className={`pb-2.5 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'booths'
              ? 'border-primary-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <MapPin size={16} />
          Polling Station Officers ({participatingStations.length})
          {unassignedStations.length > 0 ? (
            <span className="badge badge-yellow text-[10px]">{unassignedStations.length} unassigned</span>
          ) : participatingStations.length > 0 ? (
            <CheckCircle size={14} className="text-emerald-400" />
          ) : null}
        </button>
      </div>

      {activeTab === 'supervising' && (
        <div className="space-y-4">
          {displayError && (
            <div
              className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl"
              role="alert"
              aria-live="polite"
            >
              <AlertCircle size={15} className="text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-300">{displayError}</p>
            </div>
          )}

          {selectedOfficer && (
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <ShieldCheck size={20} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white flex items-center gap-2">
                      {selectedOfficer.fullName}
                      <span className="badge badge-green text-xs">Supervising</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {selectedOfficer.employeeId} · {selectedOfficer.user.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleRemove}
                  className="text-xs text-slate-400 hover:text-red-400 transition-colors"
                  disabled={saving}
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="label" htmlFor="officer-search">
              Select Supervising Officer *
            </label>
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="officer-search"
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, employee ID, or email..."
                className={`input pl-9 ${displayError && !selectedId ? 'input-error' : ''}`}
              />
            </div>

            {loading ? (
              <div className="flex justify-center py-6"><Spinner size={20} /></div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {filtered.map((officer) => {
                  const isSelected = officer.id === selectedId;
                  return (
                    <button
                      key={officer.id}
                      type="button"
                      onClick={() => handleSelect(officer)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-primary-500 bg-primary-500/10'
                          : 'border-slate-700/50 bg-slate-800/40 hover:bg-slate-800/80 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-slate-300'}`}>{officer.fullName}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {officer.employeeId} · {officer.user.email}
                        </p>
                      </div>
                      {isSelected && <CheckCircle size={16} className="text-primary-400 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {selectedId && selectedId !== currentOfficerId && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary w-full justify-center"
            >
              {saving ? <Spinner size={16} /> : <ShieldCheck size={16} />}
              Assign Supervising Officer
            </button>
          )}

          {activeOfficers.length === 0 && !loading && (
            <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
              <p className="text-sm text-amber-300 flex items-center gap-2">
                <AlertCircle size={14} />
                No active officers registered. Go to Officers section and register officers first.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'booths' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Every polling station in the participating constituencies must have an assigned Officer before the election can be scheduled.
          </p>

          {participatingStations.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <MapPin size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No polling stations found in selected constituencies.</p>
              <p className="text-xs text-slate-500 mt-1">Please go to Master Data → Polling Stations to add booths first.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {participatingStations.map((station: any) => {
                const assigned = station.officers && station.officers.length > 0 ? station.officers[0] : null;
                return (
                  <div
                    key={station.id}
                    className="p-3.5 rounded-xl border border-slate-700/50 bg-slate-800/40 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{station.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Code: <span className="font-mono text-slate-300">{station.code}</span> · {station.constituency?.name ?? 'Constituency'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {assigned ? (
                        <span className="badge badge-green text-xs">
                          {assigned.fullName}
                        </span>
                      ) : (
                        <span className="badge badge-yellow text-xs">Unassigned</span>
                      )}

                      <select
                        defaultValue=""
                        onChange={(e) => handleAssignBoothOfficer(station.id, e.target.value)}
                        className="input text-xs py-1.5 px-2 max-w-[170px]"
                      >
                        <option value="">{assigned ? 'Change...' : 'Assign...'}</option>
                        {activeOfficers.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.fullName} ({o.employeeId})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Step 3 – Candidates per Constituency
// ─────────────────────────────────────────────────────────────────

const Step3Candidates: React.FC<{ electionId: number; electionConstituencies: Constituency[] }> = ({
  electionId, electionConstituencies,
}) => {
  const [selectedConstituency, setSelectedConstituency] = useState<Constituency | null>(electionConstituencies[0] || null);

  const fetchCandidates = useCallback(
    () => candidateService.getAll(electionId, selectedConstituency?.id),
    [electionId, selectedConstituency?.id],
  );
  const { data: candidates, execute: refetchCandidates } = useAsync<Candidate[]>(fetchCandidates);

  const fetchParties = useCallback(() => partyService.getAll(), []);
  const { data: parties } = useAsync<Party[]>(fetchParties);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<{
    fullName: string; age: number; serialNumber: number; partyId?: number; qualification?: string; isIndependent: boolean;
  }>();

  const { mutate: addCandidate, loading: adding } = useMutation(
    (data: object) => candidateService.create(data),
    { onSuccess: () => { reset(); refetchCandidates(); }, successMessage: 'Candidate added' },
  );
  const { mutate: removeCandidate } = useMutation(
    (id: number) => candidateService.delete(id),
    { onSuccess: () => refetchCandidates(), successMessage: 'Candidate removed' },
  );

  const onSubmit = (data: object) => {
    if (!selectedConstituency) return;
    const d = data as { partyId?: string };
    addCandidate({ ...data, electionId, constituencyId: selectedConstituency.id, partyId: d.partyId ? Number(d.partyId) : null });
  };

  if (electionConstituencies.length === 0) {
    return (
      <div className="text-center py-12">
        <MapPin size={40} className="mx-auto text-slate-500 mb-3" />
        <p className="text-slate-400">Go back to Step 1 and select constituencies first.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4 h-[480px]">
      {/* Left: Constituency list */}
      <div className="border-r border-slate-700/50 pr-4 overflow-y-auto space-y-1">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Constituencies</p>
        {electionConstituencies.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedConstituency(c)}
            className={`w-full text-left p-3 rounded-xl text-sm transition-all ${
              selectedConstituency?.id === c.id ? 'bg-primary-500/15 border border-primary-500/30 text-white' : 'text-slate-300 hover:bg-slate-800/60'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Right: Candidates for selected constituency */}
      <div className="col-span-2 overflow-y-auto space-y-3">
        {selectedConstituency && (
          <>
            <div className="flex items-center justify-between">
              <p className="font-semibold text-white">{selectedConstituency.name}</p>
              <span className="badge badge-blue text-xs">{candidates?.length ?? 0} candidate(s)</span>
            </div>

            {/* Existing candidates */}
            <div className="space-y-2">
              {(candidates || []).map((cand) => (
                <div key={cand.id} className="flex items-center gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/40">
                  <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center text-sm font-bold text-primary-400">{cand.serialNumber}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-sm">{cand.fullName}</p>
                    <p className="text-xs text-slate-400">{cand.party?.name ?? 'Independent'} · Age {cand.age}</p>
                  </div>
                  <button onClick={() => removeCandidate(cand.id)} className="p-1.5 text-slate-500 hover:text-red-400"><Trash2 size={13} /></button>
                </div>
              ))}
            </div>

            {/* Add candidate form */}
            <div className="border border-slate-700/50 rounded-xl p-4 bg-slate-900/50">
              <p className="text-xs font-semibold text-slate-400 mb-3">ADD CANDIDATE</p>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      {...register('fullName', { required: 'Full name is required.' })}
                      className={`input text-sm ${errors.fullName ? 'input-error' : ''}`}
                      placeholder="Full name *"
                      aria-label="Full name"
                      aria-invalid={!!errors.fullName}
                    />
                    {errors.fullName && <p className="field-error-message"><AlertCircle size={11} />{errors.fullName.message}</p>}
                  </div>
                  <select {...register('partyId')} className="input text-sm" aria-label="Party">
                    <option value="">Independent</option>
                    {(parties || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <input
                      {...register('age', { required: 'Age is required.', valueAsNumber: true, min: { value: 18, message: 'Must be at least 18.' } })}
                      type="number"
                      className={`input text-sm ${errors.age ? 'input-error' : ''}`}
                      placeholder="Age *"
                      aria-label="Age"
                      aria-invalid={!!errors.age}
                    />
                    {errors.age && <p className="field-error-message"><AlertCircle size={11} />{errors.age.message}</p>}
                  </div>
                  <div>
                    <input
                      {...register('serialNumber', { required: 'Serial # required.', valueAsNumber: true, min: { value: 1, message: 'Must be > 0.' } })}
                      type="number"
                      className={`input text-sm ${errors.serialNumber ? 'input-error' : ''}`}
                      placeholder="Serial # *"
                      aria-label="Serial number"
                      aria-invalid={!!errors.serialNumber}
                    />
                    {errors.serialNumber && <p className="field-error-message"><AlertCircle size={11} />{errors.serialNumber.message}</p>}
                  </div>
                  <input {...register('qualification')} className="input text-sm" placeholder="Qualification" aria-label="Qualification" />
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="submit" className="btn-primary text-sm py-2" disabled={adding}>
                    {adding ? <Spinner size={14} /> : <Plus size={14} />} Add
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Step 4 – Review & Publish
// ─────────────────────────────────────────────────────────────────

const Step4Review: React.FC<{
  electionId: number;
  onStatusChanged: () => void;
  onGoToStep?: (step: number) => void;
}> = ({ electionId, onStatusChanged, onGoToStep }) => {
  const fetchReadiness = useCallback(() => electionService.getReadiness(electionId), [electionId]);
  const { data: readiness, loading, execute: refresh } = useAsync<ReadinessData>(fetchReadiness);

  const { mutate: updateStatus, loading: updating } = useMutation(
    (status: string) => electionService.updateStatus(electionId, status),
    {
      onSuccess: () => { onStatusChanged(); refresh(); },
      successMessage: 'Status updated',
    },
  );

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin text-primary-400" /></div>;
  if (!readiness) return null;

  const election = readiness.election;
  const stats = [
    { label: 'Constituencies', value: readiness.totalConstituencies, ok: readiness.totalConstituencies > 0 },
    { label: 'Polling Stations', value: readiness.totalStations, ok: readiness.totalStations > 0 },
    { label: 'Total Voters', value: readiness.totalVoters.toLocaleString(), ok: readiness.totalVoters > 0 },
    { label: 'Candidates', value: readiness.totalCandidates, ok: readiness.totalCandidates > 0 },
    { label: 'Election Officer', value: readiness.hasElectionOfficer ? readiness.officer?.fullName ?? '✓' : 'None', ok: readiness.hasElectionOfficer },
    { label: 'Stations w/o Officer', value: readiness.stationsWithoutOfficer, ok: readiness.stationsWithoutOfficer === 0 },
    { label: 'Constituencies w/o Candidates', value: readiness.constituenciesWithoutCandidates, ok: readiness.constituenciesWithoutCandidates === 0 },
  ];

  return (
    <div className="space-y-5">
      {/* Status */}
      <div className="flex items-center justify-between p-4 bg-slate-800/60 rounded-xl border border-slate-700/50">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider">Current Status</p>
          <p className="text-lg font-bold text-white mt-0.5">{election.status}</p>
        </div>
        <button onClick={() => refresh()} className="text-slate-400 hover:text-white p-2"><RefreshCw size={15} /></button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className={`p-4 rounded-xl border ${s.ok ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
            <div className="flex items-center gap-2 mb-1">
              {s.ok ? <CheckCircle size={13} className="text-emerald-400" /> : <AlertCircle size={13} className="text-red-400" />}
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
            <p className={`text-xl font-bold truncate ${s.ok ? 'text-emerald-300' : 'text-red-300'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Issues */}
      {readiness.issues.length > 0 && (
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5" role="alert">
          <p className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2"><AlertCircle size={15} /> Issues to resolve:</p>
          <ul className="space-y-1">
            {readiness.issues.map((issue, i) => (
              <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                <span className="text-red-400 mt-0.5">•</span> {issue}
              </li>
            ))}
          </ul>
          {readiness.stationsWithoutOfficer > 0 && onGoToStep && (
            <div className="mt-3 pt-3 border-t border-red-500/20 flex items-center justify-between">
              <span className="text-xs text-red-300">
                {readiness.stationsWithoutOfficer} polling station(s) require an assigned officer.
              </span>
              <button
                type="button"
                onClick={() => onGoToStep(2)}
                className="text-xs py-1.5 px-3 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-colors flex items-center gap-1.5"
              >
                <UserCog size={13} /> Assign Booth Officers in Step 2 <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>
      )}

      {readiness.isReady && (
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center gap-3">
          <CheckCircle size={20} className="text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-300">All checks passed!</p>
            <p className="text-xs text-slate-400 mt-0.5">This election is ready to be scheduled or activated.</p>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        {election.status === 'DRAFT' && (
          <button
            onClick={() => updateStatus('SCHEDULED')}
            disabled={!readiness.isReady || updating}
            className={`btn-primary flex-1 justify-center ${!readiness.isReady ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {updating ? <Spinner size={16} /> : null} Schedule Election
          </button>
        )}
        {election.status === 'SCHEDULED' && (
          <button
            onClick={() => updateStatus('ACTIVE')}
            disabled={!readiness.isReady || updating}
            className={`flex-1 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 flex items-center justify-center gap-2 ${!readiness.isReady ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {updating ? <Spinner size={16} /> : null} Activate Election
          </button>
        )}
        {election.status === 'ACTIVE' && (
          <button onClick={() => updateStatus('PAUSED')} disabled={updating} className="btn-secondary flex-1 justify-center">
            Pause Election
          </button>
        )}
        {(election.status === 'ACTIVE' || election.status === 'PAUSED') && (
          <button onClick={() => updateStatus('CLOSED')} disabled={updating} className="btn-danger flex-1 justify-center">
            Close Election
          </button>
        )}
        {election.status === 'CLOSED' && (
          <button onClick={() => updateStatus('RESULTS_PUBLISHED')} disabled={updating}
            className="flex-1 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-primary-600 to-blue-600 flex items-center justify-center gap-2">
            {updating ? <Spinner size={16} /> : null} Publish Results
          </button>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Main: ElectionSetupPage
// ─────────────────────────────────────────────────────────────────

export const ElectionSetupPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const electionId = Number(id);
  const [step, setStep] = useState(1);
  const [selectedConstituencyIds, setSelectedConstituencyIds] = useState<number[]>([]);
  const [electionConstituencies, setElectionConstituencies] = useState<Constituency[]>([]);
  const [assignedOfficer, setAssignedOfficer] = useState<Officer | null>(null);
  const [stepErrors, setStepErrors] = useState<Record<number, string>>({});

  const fetchElection = useCallback(() => electionService.getById(electionId), [electionId]);
  const { data: election } = useAsync<Election & { electionConstituencies: ElectionLink[]; officer: Officer | null }>(fetchElection);

  // Load initial selected constituency IDs and current officer
  useEffect(() => {
    if (election?.electionConstituencies) {
      const ids = election.electionConstituencies.map((l) => l.constituency.id);
      setSelectedConstituencyIds(ids);
      setElectionConstituencies(election.electionConstituencies.map((l) => l.constituency));
    }
    if (election?.officer !== undefined) {
      setAssignedOfficer(election.officer);
    }
  }, [election]);

  const { mutate: saveConstituencies, loading: saving } = useMutation(
    (ids: number[]) => electionService.setConstituencies(electionId, ids),
    {
      onSuccess: (result) => {
        const links = result as ElectionLink[];
        setElectionConstituencies(links.map((l) => l.constituency));
        toast.success('Constituencies saved');
      },
    },
  );

  const toggle = (id: number) => {
    setSelectedConstituencyIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  // Validate current step before advancing
  const validateStep = (currentStep: number): boolean => {
    if (currentStep === 1) {
      if (selectedConstituencyIds.length === 0) {
        setStepErrors((prev) => ({ ...prev, 1: 'Please select at least one constituency before continuing.' }));
        return false;
      }
    }
    if (currentStep === 2) {
      if (!assignedOfficer) {
        setStepErrors((prev) => ({ ...prev, 2: 'Please select and assign an Election Officer before continuing.' }));
        return false;
      }
    }
    // Clear error for this step
    setStepErrors((prev) => { const n = { ...prev }; delete n[currentStep]; return n; });
    return true;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    if (step === 1) {
      saveConstituencies(selectedConstituencyIds);
    }
    setStep((s) => Math.min(s + 1, STEPS.length));
  };

  const goPrev = () => {
    setStepErrors((prev) => { const n = { ...prev }; delete n[step]; return n; });
    setStep((s) => Math.max(s - 1, 1));
  };

  const goToStep = (target: number) => {
    // Allow going back freely; forward only if valid
    if (target < step) {
      setStep(target);
    } else if (target === step + 1) {
      if (validateStep(step)) {
        if (step === 1) saveConstituencies(selectedConstituencyIds);
        setStep(target);
      }
    }
  };

  if (!election) return <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-primary-400" /></div>;

  // Step status indicators
  const getStepStatus = (stepId: number): 'done' | 'active' | 'error' | 'pending' => {
    if (stepErrors[stepId]) return 'error';
    if (stepId === step) return 'active';
    if (stepId < step) {
      // Check if this step looks complete
      if (stepId === 1 && electionConstituencies.length > 0) return 'done';
      if (stepId === 2 && assignedOfficer) return 'done';
      if (stepId === 3) return 'done'; // Candidates are optional to advance
      return 'done';
    }
    return 'pending';
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="page-header">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Election Setup</p>
          <h1 className="page-title">{election.name}</h1>
          <p className="page-subtitle">{election.electionType} · {new Date(election.scheduledDate).toLocaleDateString('en-IN')}</p>
        </div>
        <button onClick={() => navigate('/admin/elections')} className="btn-secondary">← Back to Elections</button>
      </div>

      {/* Step progress */}
      <div className="card p-4">
        <div className="flex items-center gap-0 flex-wrap gap-y-2">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const status = getStepStatus(s.id);
            const isActive = status === 'active';
            const isDone = status === 'done';
            const isError = status === 'error';
            return (
              <React.Fragment key={s.id}>
                <button
                  onClick={() => goToStep(s.id)}
                  className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all ${
                    isActive ? 'bg-primary-500/15 border border-primary-500/30' :
                    isError ? 'bg-red-500/10 border border-red-500/30' :
                    isDone ? 'opacity-80' : 'opacity-40'
                  }`}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isActive ? 'bg-primary-500 text-white' :
                    isError ? 'bg-red-500 text-white' :
                    isDone ? 'bg-emerald-500 text-white' :
                    'bg-slate-700 text-slate-400'
                  }`}>
                    {isError ? <AlertCircle size={16} /> :
                     isDone ? <CheckCircle size={16} /> :
                     <Icon size={16} />}
                  </div>
                  <div className="text-left">
                    <p className={`text-sm font-semibold ${isActive ? 'text-white' : isError ? 'text-red-300' : 'text-slate-300'}`}>{s.title}</p>
                    <p className="text-xs text-slate-500 hidden sm:block">
                      {isError ? stepErrors[s.id] : s.description}
                    </p>
                  </div>
                </button>
                {idx < STEPS.length - 1 && <ChevronRight size={16} className="text-slate-600 flex-shrink-0 mx-1" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="card p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {step === 1 && (
              <Step1
                electionId={electionId}
                selectedIds={selectedConstituencyIds}
                onToggle={toggle}
                onSelectAll={(ids) => setSelectedConstituencyIds(ids)}
                onClear={() => setSelectedConstituencyIds([])}
                saving={saving}
                error={stepErrors[1]}
              />
            )}
            {step === 2 && (
              <Step2Officer
                electionId={electionId}
                selectedConstituencyIds={selectedConstituencyIds}
                currentOfficerId={assignedOfficer?.id ?? null}
                onOfficerSaved={(officer) => {
                  setAssignedOfficer(officer);
                  if (officer) {
                    setStepErrors((prev) => { const n = { ...prev }; delete n[2]; return n; });
                  }
                }}
                error={stepErrors[2]}
              />
            )}
            {step === 3 && (
              <Step3Candidates electionId={electionId} electionConstituencies={electionConstituencies} />
            )}
            {step === 4 && (
              <Step4Review electionId={electionId} onStatusChanged={() => {}} onGoToStep={goToStep} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={goPrev} disabled={step === 1} className="btn-secondary disabled:opacity-40">
          <ChevronLeft size={16} /> Previous
        </button>
        <span className="text-sm text-slate-400">Step {step} of {STEPS.length}</span>
        {step < STEPS.length ? (
          <button onClick={goNext} className="btn-primary" disabled={saving}>
            {saving ? <Spinner size={16} /> : null} Save & Continue <ChevronRight size={16} />
          </button>
        ) : (
          <button onClick={() => navigate('/admin/elections')} className="btn-secondary">
            Done
          </button>
        )}
      </div>
    </div>
  );
};
