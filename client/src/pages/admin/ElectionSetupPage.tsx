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
  ShieldCheck, BarChart3, Lock,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

interface Region { id: number; name: string; _count: { constituencies: number } }
interface Constituency { id: number; name: string; code: string; regionId: number; region: { name: string }; _count: { pollingStations: number; voters: number } }
interface Candidate { id: number; fullName: string; serialNumber: number; age: number; constituencyId: number; party?: { id: number; name: string; color: string } }
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
  readOnly?: boolean;
  error?: string;
}> = ({ selectedIds, onToggle, onSelectAll, onClear, readOnly, error }) => {
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
        {!readOnly && (
          <div className="flex gap-2">
            <button onClick={() => onSelectAll((constituencies || []).map((c) => c.id))} className="btn-secondary text-xs py-1.5 px-3">Select All Visible</button>
            <button onClick={onClear} className="btn-secondary text-xs py-1.5 px-3">Clear</button>
          </div>
        )}
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
                      onClick={() => !readOnly && onToggle(c.id)}
                      className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all duration-150 ${
                        isSelected
                          ? 'border-primary-500 bg-primary-500/10'
                          : 'border-slate-700/60 bg-slate-800/40 hover:border-slate-600'
                      } ${readOnly ? 'cursor-default opacity-90' : ''}`}
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
  readOnly?: boolean;
  error?: string;
}> = ({ electionId, selectedConstituencyIds, currentOfficerId, onOfficerSaved, readOnly, error }) => {
  const [activeTab, setActiveTab] = useState<'supervising' | 'booths'>('supervising');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(currentOfficerId);
  const [localError, setLocalError] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const fetchOfficers = useCallback(() => officerService.getAll(), []);
  const { data: allOfficers, loading, execute: refetchOfficers } = useAsync<Officer[]>(fetchOfficers);

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

      const station = participatingStations.find((s: any) => s.id === stationId);
      const currentlyAssigned = station?.officers && station.officers.length > 0 ? station.officers[0] : null;

      if (officerIdStr === '__unassign__') {
        if (currentlyAssigned) {
          await officerService.update(currentlyAssigned.id, { pollingStationId: null });
          toast.success(`Officer "${currentlyAssigned.fullName}" unassigned.`);
          refetchStations();
          refetchOfficers();
        }
        return;
      }

      const newOfficerId = Number(officerIdStr);
      if (currentlyAssigned && currentlyAssigned.id === newOfficerId) {
        return;
      }

      // If this station already has an officer assigned, unassign them first so only one officer is present
      if (currentlyAssigned && currentlyAssigned.id !== newOfficerId) {
        await officerService.update(currentlyAssigned.id, { pollingStationId: null });
      }

      await officerService.update(newOfficerId, { pollingStationId: stationId });
      toast.success('Booth officer assigned successfully');
      refetchStations();
      refetchOfficers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to assign booth officer');
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
                {!readOnly && (
                  <button
                    onClick={handleRemove}
                    className="text-xs text-slate-400 hover:text-red-400 transition-colors"
                    disabled={saving}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          )}

          {!readOnly ? (
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
        </div>
      ) : !selectedOfficer ? (
        <p className="text-sm text-slate-400 py-4">No supervising officer assigned.</p>
      ) : null}

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

                      {!readOnly && (
                        <select
                          value=""
                          onChange={(e) => handleAssignBoothOfficer(station.id, e.target.value)}
                          className="input text-xs py-1.5 px-2 max-w-[190px]"
                        >
                          <option value="">{assigned ? 'Change officer...' : 'Assign officer...'}</option>
                          {assigned && <option value="__unassign__">❌ Unassign</option>}
                          {activeOfficers.map((o) => {
                            const isAtOtherStation = o.pollingStationId && o.pollingStationId !== station.id;
                            const isAlreadyHere = assigned && assigned.id === o.id;
                            return (
                              <option key={o.id} value={o.id} disabled={Boolean(isAtOtherStation || isAlreadyHere)}>
                                {o.fullName} ({o.employeeId}){isAtOtherStation ? ' — [Assigned elsewhere]' : isAlreadyHere ? ' — [Current]' : ''}
                              </option>
                            );
                          })}
                        </select>
                      )}
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

const Step3Candidates: React.FC<{ electionId: number; electionConstituencies: Constituency[]; readOnly?: boolean }> = ({
  electionId, electionConstituencies, readOnly,
}) => {
  const [selectedConstituency, setSelectedConstituency] = useState<Constituency | null>(electionConstituencies[0] || null);
  const [showExtra, setShowExtra] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [selectedPartyId, setSelectedPartyId] = useState<number | ''>('');
  const [ageInput, setAgeInput] = useState('');
  const [qualInput, setQualInput] = useState('');
  const [isIndep, setIsIndep] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchCandidates = useCallback(
    () => candidateService.getAll(electionId, selectedConstituency?.id),
    [electionId, selectedConstituency?.id],
  );
  const { data: candidates, execute: refetchCandidates } = useAsync<Candidate[]>(fetchCandidates);

  const fetchParties = useCallback(() => partyService.getAll(), []);
  const { data: parties } = useAsync<Party[]>(fetchParties);

  const { mutate: removeCandidate } = useMutation(
    (id: number) => candidateService.delete(id),
    { onSuccess: () => refetchCandidates(), successMessage: 'Candidate removed' },
  );

  const nextSerial = (candidates?.length ?? 0) + 1;

  const resetForm = () => {
    setNameInput('');
    setSelectedPartyId('');
    setAgeInput('');
    setQualInput('');
    setIsIndep(false);
    setShowExtra(false);
    setFormError('');
  };

  const handleAddCandidate = async () => {
    if (!selectedConstituency) return;
    const name = nameInput.trim();
    if (!name) { setFormError('Candidate name is required.'); return; }
    if (ageInput && (Number(ageInput) < 18 || Number(ageInput) > 100)) {
      setFormError('Age must be between 18 and 100.');
      return;
    }
    setFormError('');
    setAdding(true);
    try {
      await candidateService.create({
        fullName: name,
        electionId,
        constituencyId: selectedConstituency.id,
        partyId: isIndep ? null : (selectedPartyId ? Number(selectedPartyId) : null),
        serialNumber: nextSerial,
        age: ageInput ? Number(ageInput) : 30,
        qualification: qualInput.trim() || undefined,
        isIndependent: isIndep,
      });
      toast.success(`${name} added as candidate #${nextSerial}`);
      resetForm();
      refetchCandidates();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to add candidate.';
      setFormError(msg);
    } finally {
      setAdding(false);
    }
  };

  const filteredCandidates = (candidates || []).filter((c) =>
    !searchFilter || c.fullName.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const selectedParty = (parties || []).find((p) => p.id === Number(selectedPartyId));

  if (electionConstituencies.length === 0) {
    return (
      <div className="text-center py-12">
        <MapPin size={40} className="mx-auto text-slate-500 mb-3" />
        <p className="text-slate-400">Go back to Step 1 and select constituencies first.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-5 min-h-[500px]">
      {/* ── Left: Constituency list ── */}
      <div className="border-r border-slate-700/50 pr-4 overflow-y-auto space-y-1.5">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Constituencies</p>
        {electionConstituencies.map((c) => {
          const cCount = (candidates || []).filter((x) => x.constituencyId === c.id).length;
          const isActive = selectedConstituency?.id === c.id;
          return (
            <button
              key={c.id}
              onClick={() => { setSelectedConstituency(c); setSearchFilter(''); }}
              className={`w-full text-left p-3 rounded-xl text-sm transition-all flex items-center justify-between gap-2 ${
                isActive
                  ? 'bg-primary-500/15 border border-primary-500/30 text-white'
                  : 'text-slate-300 hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <span className="font-medium truncate">{c.name}</span>
              {/* candidate count bubble */}
              <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                cCount > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700/60 text-slate-500'
              }`}>
                {cCount === 0 ? 'None' : `${cCount} cand.`}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Right: Candidate management panel ── */}
      <div className="col-span-2 flex flex-col gap-4 overflow-y-auto">
        {selectedConstituency ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-white text-base">{selectedConstituency.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {filteredCandidates.length} candidate{filteredCandidates.length !== 1 ? 's' : ''} registered
                </p>
              </div>
              {/* Search among existing candidates */}
              {(candidates?.length ?? 0) > 2 && (
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Search candidates..."
                    className="input text-xs py-1.5 pl-8 w-44"
                  />
                </div>
              )}
            </div>

            {/* Existing candidates */}
            <div className="space-y-2">
              {filteredCandidates.length === 0 && !searchFilter && (
                <div className="py-6 text-center text-slate-500 text-sm border border-dashed border-slate-700/60 rounded-xl">
                  <Award size={24} className="mx-auto mb-2 opacity-40" />
                  No candidates yet. Add one below.
                </div>
              )}
              {filteredCandidates.length === 0 && searchFilter && (
                <p className="text-sm text-slate-400 py-4 text-center">No candidates match "{searchFilter}".</p>
              )}
              {filteredCandidates.map((cand) => (
                <div
                  key={cand.id}
                  className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/30 hover:border-slate-600/50 transition-all"
                >
                  {/* Serial number bubble */}
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{
                      backgroundColor: cand.party?.color ? `${cand.party.color}22` : '#3b82f620',
                      color: cand.party?.color || '#60a5fa',
                    }}
                  >
                    #{cand.serialNumber}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{cand.fullName}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {cand.party ? (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: `${cand.party.color}22`, color: cand.party.color }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cand.party.color }} />
                          {cand.party.name}
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-400">
                          Independent
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500">Age {cand.age}</span>
                    </div>
                  </div>
                  {!readOnly && (
                    <button
                      onClick={() => removeCandidate(cand.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all flex-shrink-0"
                      title="Remove candidate"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* ── Add Candidate Panel ── */}
            {!readOnly ? (
              <div className="border border-slate-700/50 rounded-xl bg-slate-900/40 overflow-hidden">
                {/* Panel header */}
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-700/40 bg-slate-800/30">
                  <Plus size={14} className="text-primary-400" />
                  <p className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                    Add Candidate — #{nextSerial}
                  </p>
                  <span className="ml-auto text-[10px] text-slate-500">Serial # auto-assigned: {nextSerial}</span>
                </div>

                <div className="p-4 space-y-4">
                  {/* Row 1: Name (main field) */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Candidate Full Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => { setNameInput(e.target.value); setFormError(''); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddCandidate(); }}
                      placeholder="Enter candidate's full name..."
                      className={`input text-sm ${formError && !nameInput.trim() ? 'input-error' : ''}`}
                      autoComplete="off"
                    />
                  </div>

                  {/* Row 2: Party selection — visual party picker */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                      Party Affiliation
                    </label>
                    <p className="text-[10px] text-amber-400/80 mb-2">
                      ⚠ Each party can have only <strong>one candidate per constituency</strong>. Parties already assigned are disabled.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {/* Independent option */}
                      <button
                        type="button"
                        onClick={() => { setIsIndep(true); setSelectedPartyId(''); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          isIndep
                            ? 'bg-slate-600 border-slate-400 text-white'
                            : 'border-slate-700/60 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full border-2 border-slate-400 flex-shrink-0" />
                        Independent
                      </button>
                      {/* Party buttons */}
                      {(parties || []).map((party) => {
                        const isSelected = !isIndep && Number(selectedPartyId) === party.id;
                        // Check if this party already has a candidate in this constituency
                        const alreadyUsed = !isSelected && (candidates || []).some(
                          (c) => c.party?.id === party.id && c.constituencyId === selectedConstituency?.id
                        );
                        return (
                          <button
                            key={party.id}
                            type="button"
                            disabled={alreadyUsed}
                            onClick={() => { if (!alreadyUsed) { setIsIndep(false); setSelectedPartyId(party.id); } }}
                            title={alreadyUsed ? `${party.name} already has a candidate in this constituency` : undefined}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                              alreadyUsed
                                ? 'border-slate-800 text-slate-600 bg-slate-800/30 cursor-not-allowed opacity-50'
                                : isSelected
                                ? 'text-white border-transparent'
                                : 'border-slate-700/60 text-slate-400 hover:text-slate-200'
                            }`}
                            style={isSelected ? {
                              backgroundColor: `${party.color}33`,
                              borderColor: `${party.color}66`,
                              color: party.color,
                            } : {}}
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: alreadyUsed ? '#475569' : party.color }}
                            />
                            {party.abbreviation}
                            <span className="text-[10px] opacity-70 hidden sm:inline">– {party.name}</span>
                            {alreadyUsed && <span className="text-[9px] opacity-60 ml-0.5">✓ assigned</span>}
                          </button>
                        );
                      })}
                    </div>
                    {/* Show selected party name */}
                    {!isIndep && selectedParty && (
                      <p className="mt-1.5 text-[11px] text-slate-400">
                        Selected: <span style={{ color: selectedParty.color }} className="font-semibold">{selectedParty.name}</span>
                      </p>
                    )}
                    {isIndep && (
                      <p className="mt-1.5 text-[11px] text-slate-400">Candidate will be registered as <span className="text-slate-300 font-medium">Independent</span></p>
                    )}
                  </div>

                  {/* Collapsible extra fields */}
                  <button
                    type="button"
                    onClick={() => setShowExtra((v) => !v)}
                    className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <span className={`transition-transform ${showExtra ? 'rotate-90' : ''}`}>▶</span>
                    {showExtra ? 'Hide' : 'Add'} optional details (Age, Qualification)
                  </button>

                  {showExtra && (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                          Age
                        </label>
                        <input
                          type="number"
                          value={ageInput}
                          onChange={(e) => setAgeInput(e.target.value)}
                          className="input text-sm"
                          placeholder="e.g. 35"
                          min={18}
                          max={100}
                        />
                        <p className="text-[10px] text-slate-600 mt-0.5">Defaults to 30 if blank</p>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                          Qualification
                        </label>
                        <input
                          type="text"
                          value={qualInput}
                          onChange={(e) => setQualInput(e.target.value)}
                          className="input text-sm"
                          placeholder="e.g. B.Tech, LLB..."
                        />
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {formError && (
                    <div className="flex items-center gap-2 text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                      <AlertCircle size={13} className="flex-shrink-0" /> {formError}
                    </div>
                  )}

                  {/* Submit */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleAddCandidate}
                      disabled={adding || !nameInput.trim()}
                      className="btn-primary py-2 px-5 disabled:opacity-50 flex items-center gap-2"
                    >
                      {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                      Add Candidate #{nextSerial}
                    </button>
                    {(nameInput || selectedPartyId || ageInput || qualInput) && (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        Clear form
                      </button>
                    )}
                    <span className="ml-auto text-[10px] text-slate-600">Press Enter to quickly add</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-slate-700/40 bg-slate-800/30 text-center text-xs text-slate-400">
                🔒 Candidate registration is locked for this election.
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500">
            <p>Select a constituency from the left to manage candidates.</p>
          </div>
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
  const navigate = useNavigate();
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
        {(election.status === 'SCHEDULED' || election.status === 'ACTIVE' || election.status === 'PAUSED') && (
          <div className="flex-1 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserCog size={20} className="text-emerald-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-white">
                  {election.status === 'SCHEDULED' ? 'Ready for Officer Activation' : 'Election Voting in Progress'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Elections can only be started and stopped by assigned Election Officers from their dashboard.
                  {readiness.officer?.fullName && ` Assigned Officer: ${readiness.officer.fullName}.`}
                </p>
              </div>
            </div>
            <span className="badge badge-emerald text-xs flex-shrink-0">Officer Controlled</span>
          </div>
        )}
        {election.status === 'CLOSED' && (
          <button onClick={() => updateStatus('RESULTS_PUBLISHED')} disabled={updating}
            className="flex-1 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-primary-600 to-blue-600 flex items-center justify-center gap-2">
            {updating ? <Spinner size={16} /> : null} Publish Results
          </button>
        )}
        {election.status === 'RESULTS_PUBLISHED' && (
          <div className="flex-1 p-4 rounded-xl border border-blue-500/20 bg-blue-500/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle size={20} className="text-blue-400" />
              <div>
                <p className="text-sm font-semibold text-white">Results are published</p>
                <p className="text-xs text-slate-400">Voting is concluded and official results have been published.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/admin/results')}
              className="btn-primary py-2 px-4 text-xs flex items-center gap-1.5"
            >
              <BarChart3 size={14} /> View Results
            </button>
          </div>
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

  const isReadOnly = election?.status === 'ACTIVE' || election?.status === 'CLOSED' || election?.status === 'RESULTS_PUBLISHED';

  const goNext = () => {
    if (!isReadOnly) {
      if (!validateStep(step)) return;
      if (step === 1) {
        saveConstituencies(selectedConstituencyIds);
      }
    }
    setStep((s) => Math.min(s + 1, STEPS.length));
  };

  const goPrev = () => {
    setStepErrors((prev) => { const n = { ...prev }; delete n[step]; return n; });
    setStep((s) => Math.max(s - 1, 1));
  };

  const goToStep = (target: number) => {
    if (isReadOnly) {
      setStep(target);
      return;
    }
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

      {isReadOnly && (
        <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-300 text-sm">
          <ShieldCheck size={20} className="text-amber-400 flex-shrink-0" />
          <div>
            <span className="font-semibold">Election Status: {election.status}</span> — Configuration is locked in read-only mode. Details and setup are available for inspection.
          </div>
        </div>
      )}

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
                readOnly={isReadOnly}
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
                readOnly={isReadOnly}
                error={stepErrors[2]}
              />
            )}
            {step === 3 && (
              <Step3Candidates electionId={electionId} electionConstituencies={electionConstituencies} readOnly={isReadOnly} />
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
          <button onClick={goNext} className="btn-primary" disabled={!isReadOnly && saving}>
            {!isReadOnly && saving ? <Spinner size={16} /> : null} {isReadOnly ? 'Next Step' : 'Save & Continue'} <ChevronRight size={16} />
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
