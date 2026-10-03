import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Award,
  Upload,
  User,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  FileSpreadsheet,
  Loader2,
  X,
  Filter,
  CheckCircle2,
  Flag,
  Info,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAsync, useMutation } from '../../hooks/useAsync';
import { candidateService, constituencyService, partyService, electionService } from '../../services/api.service';
import { Modal, ConfirmDialog, TableSkeleton, EmptyState, Spinner } from '../../components/ui';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { normaliseValidationErrors } from '../../lib/validationErrors';

interface Party {
  id: number;
  name: string;
  abbreviation?: string;
  symbol?: string;
  color: string;
}

interface Candidate {
  id: number;
  fullName: string;
  age: number;
  qualification?: string;
  serialNumber: number;
  isIndependent: boolean;
  photoUrl?: string;
  constituencyId: number;
  electionId: number;
  constituency?: { id?: number; name: string; code?: string };
  election?: { id: number; name: string; status: string };
  party?: Party;
  _count?: { votes: number };
}

interface Election {
  id: number;
  name: string;
  status: string;
}

interface Constituency {
  id: number;
  name: string;
  code: string;
}

type CandidateForm = {
  electionId: number;
  constituencyId: number;
  partyId?: number | string;
  fullName: string;
  age: number;
  qualification?: string;
  serialNumber: number;
  isIndependent: boolean;
};

export const CandidatesPage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Candidate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Candidate | null>(null);
  const [uploadTarget, setUploadTarget] = useState<Candidate | null>(null);

  const [filterElection, setFilterElection] = useState('');
  const [filterConstituency, setFilterConstituency] = useState('');

  const [electionConstituencies, setElectionConstituencies] = useState<Constituency[]>([]);
  const [formConstituencies, setFormConstituencies] = useState<Constituency[]>([]);
  const [selectedElectionForForm, setSelectedElectionForForm] = useState('');
  const [selectedConstituencyForForm, setSelectedConstituencyForForm] = useState('');

  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkElectionId, setBulkElectionId] = useState('');
  const [spreadsheetFile, setSpreadsheetFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  // Quick Create Election Modal state if needed
  const [createElectionModalOpen, setCreateElectionModalOpen] = useState(false);
  const [newElectionName, setNewElectionName] = useState('General Assembly Election 2025');
  const [creatingElection, setCreatingElection] = useState(false);

  const navigate = useNavigate();

  const fetchElections = useCallback(() => electionService.getAll(), []);
  const { data: elections, execute: refetchElections } = useAsync<Election[]>(fetchElections);

  const fetchParties = useCallback(() => partyService.getAll(), []);
  const { data: parties } = useAsync<Party[]>(fetchParties);

  const fetchAllConstituencies = useCallback(() => constituencyService.getActive(), []);
  const { data: allConstituencies } = useAsync<Constituency[]>(fetchAllConstituencies);

  // Auto-select active or scheduled election if filterElection is empty
  useEffect(() => {
    if (elections && elections.length > 0 && !filterElection) {
      const activeOrScheduled =
        elections.find((e) => e.status === 'SCHEDULED' || e.status === 'ACTIVE' || e.status === 'DRAFT') ||
        elections[0];
      if (activeOrScheduled) {
        setFilterElection(String(activeOrScheduled.id));
      }
    }
  }, [elections, filterElection]);

  // Load constituencies for election filter
  useEffect(() => {
    if (filterElection) {
      electionService
        .getConstituencies(Number(filterElection))
        .then((links: { constituency: Constituency }[]) => {
          setElectionConstituencies(links.map((l) => l.constituency));
        })
        .catch(() => setElectionConstituencies(allConstituencies || []));
    } else {
      setElectionConstituencies(allConstituencies || []);
    }
  }, [filterElection, allConstituencies]);

  // Fetch candidates based on election & constituency filters
  const fetchCandidates = useCallback(
    () =>
      candidateService.getAll(
        filterElection ? Number(filterElection) : undefined,
        filterConstituency ? Number(filterConstituency) : undefined,
      ),
    [filterElection, filterConstituency],
  );
  const { data: candidates, loading, execute: refetch } = useAsync<Candidate[]>(fetchCandidates, true, [fetchCandidates]);

  // Also maintain an unfiltered candidate list for the active election to validate party uniqueness accurately
  const [electionCandidates, setElectionCandidates] = useState<Candidate[]>([]);
  useEffect(() => {
    const elId = selectedElectionForForm || filterElection;
    if (elId) {
      candidateService.getAll(Number(elId)).then((list: Candidate[]) => {
        setElectionCandidates(list || []);
      }).catch(() => {});
    }
  }, [selectedElectionForForm, filterElection, modalOpen]);

  // When election changes in candidate form, load its constituencies
  useEffect(() => {
    if (!selectedElectionForForm) {
      setFormConstituencies(allConstituencies || []);
      return;
    }
    electionService
      .getConstituencies(Number(selectedElectionForForm))
      .then((links: { constituency: Constituency }[]) => {
        const cons = links.map((l) => l.constituency);
        setFormConstituencies(cons.length > 0 ? cons : allConstituencies || []);
      })
      .catch(() => setFormConstituencies(allConstituencies || []));
  }, [selectedElectionForForm, allConstituencies]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<CandidateForm>();

  const isIndependentVal = watch('isIndependent');
  const watchedPartyId = watch('partyId');

  // Next candidate serial number suggestion
  useEffect(() => {
    if (selectedConstituencyForForm && !editTarget) {
      const existingInCon = electionCandidates.filter(
        (c) => c.constituencyId === Number(selectedConstituencyForForm),
      );
      const maxSerial = existingInCon.reduce((max, c) => Math.max(max, c.serialNumber || 0), 0);
      setValue('serialNumber', maxSerial + 1);
    }
  }, [selectedConstituencyForForm, electionCandidates, editTarget, setValue]);

  const { mutate: createCandidate, loading: creating } = useMutation(
    (data: object) => candidateService.create(data),
    {
      onSuccess: () => {
        refetch();
        setModalOpen(false);
        reset();
        setSelectedElectionForForm('');
        setSelectedConstituencyForForm('');
        toast.success('Candidate registered successfully!');
      },
      onServerErrors: (data) => {
        const fieldErrors = normaliseValidationErrors(data);
        if (fieldErrors) {
          Object.entries(fieldErrors).forEach(([field, message]) =>
            setError(field as keyof CandidateForm, { message }),
          );
        } else {
          toast.error(data.message || 'Failed to register candidate.');
        }
      },
    },
  );

  const { mutate: updateCandidate, loading: updating } = useMutation(
    ({ id, data }: { id: number; data: object }) => candidateService.update(id, data),
    {
      onSuccess: () => {
        refetch();
        setModalOpen(false);
        setEditTarget(null);
        reset();
        toast.success('Candidate updated successfully!');
      },
      onServerErrors: (data) => {
        const fieldErrors = normaliseValidationErrors(data);
        if (fieldErrors) {
          Object.entries(fieldErrors).forEach(([field, message]) =>
            setError(field as keyof CandidateForm, { message }),
          );
        } else {
          toast.error(data.message || 'Failed to update candidate.');
        }
      },
    },
  );

  const { mutate: deleteCandidate, loading: deleting } = useMutation(
    (id: number) => candidateService.delete(id),
    { onSuccess: () => { refetch(); setDeleteTarget(null); }, successMessage: 'Candidate removed' },
  );

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      await candidateService.downloadExcelTemplate();
      toast.success('Template downloaded successfully');
    } catch {
      toast.error('Failed to download template');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleBulkSubmit = async () => {
    if (!spreadsheetFile || !bulkElectionId) return;
    setUploading(true);
    setUploadError('');
    try {
      const res = await candidateService.uploadExcel(spreadsheetFile, Number(bulkElectionId));
      toast.success(`Imported ${res.importedCount} candidates successfully!`);
      setBulkModalOpen(false);
      setSpreadsheetFile(null);
      refetch();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to upload file.';
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoUpload = async (file: File) => {
    if (!uploadTarget) return;
    try {
      await candidateService.uploadPhoto(uploadTarget.id, file);
      toast.success('Photo uploaded successfully');
      refetch();
      setUploadTarget(null);
    } catch {
      toast.error('Upload failed');
    }
  };

  const openRegisterModal = () => {
    reset();
    setEditTarget(null);
    const targetEl = filterElection || (elections?.[0]?.id ? String(elections[0].id) : '');
    setSelectedElectionForForm(targetEl);
    setValue('electionId', Number(targetEl));

    const targetCon = filterConstituency || '';
    setSelectedConstituencyForForm(targetCon);
    if (targetCon) {
      setValue('constituencyId', Number(targetCon));
    }
    setValue('isIndependent', false);
    setModalOpen(true);
  };

  const openEdit = (c: Candidate) => {
    setEditTarget(c);
    setSelectedElectionForForm(String(c.electionId));
    setSelectedConstituencyForForm(String(c.constituencyId));
    setValue('fullName', c.fullName);
    setValue('age', c.age);
    setValue('qualification', c.qualification ?? '');
    setValue('serialNumber', c.serialNumber);
    setValue('constituencyId', c.constituencyId);
    setValue('electionId', c.electionId);
    setValue('partyId', c.party?.id ?? '');
    setValue('isIndependent', c.isIndependent);
    setModalOpen(true);
  };

  const handleQuickCreateElection = async () => {
    if (!newElectionName.trim()) return;
    setCreatingElection(true);
    try {
      const newEl = await electionService.create({
        name: newElectionName.trim(),
        description: 'Legislative Assembly Elections',
        electionType: 'Assembly',
        scheduledDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        status: 'SCHEDULED',
      });
      toast.success('Election created successfully!');
      setCreateElectionModalOpen(false);
      await refetchElections();
      if (newEl?.id) {
        setFilterElection(String(newEl.id));
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create election');
    } finally {
      setCreatingElection(false);
    }
  };

  const onSubmit = (data: CandidateForm) => {
    // Electoral rule client check:
    // Multiple parties can contest in a constituency, but each party can have only 1 candidate!
    if (!data.isIndependent && data.partyId) {
      const alreadyNominated = electionCandidates.find(
        (c) =>
          c.constituencyId === Number(data.constituencyId) &&
          c.party?.id === Number(data.partyId) &&
          (!editTarget || c.id !== editTarget.id),
      );

      if (alreadyNominated) {
        const partyName = parties?.find((p) => p.id === Number(data.partyId))?.name || 'This party';
        setError('partyId', {
          message: `${partyName} already has candidate "${alreadyNominated.fullName}" in this constituency. Each party can only have one candidate.`,
        });
        return;
      }
    }

    const payload = {
      fullName: data.fullName.trim(),
      age: Number(data.age),
      qualification: data.qualification?.trim() || null,
      serialNumber: Number(data.serialNumber),
      electionId: Number(data.electionId),
      constituencyId: Number(data.constituencyId),
      partyId: data.isIndependent || !data.partyId ? null : Number(data.partyId),
      isIndependent: Boolean(data.isIndependent),
    };

    if (editTarget) {
      updateCandidate({ id: editTarget.id, data: payload });
    } else {
      createCandidate(payload);
    }
  };

  const hasNoElections = elections && elections.length === 0;

  // Selected election details
  const selectedElectionObj = useMemo(
    () => elections?.find((e) => e.id === Number(filterElection)),
    [elections, filterElection],
  );

  const isCurrentElectionLocked =
    selectedElectionObj &&
    (selectedElectionObj.status === 'ACTIVE' ||
      selectedElectionObj.status === 'CLOSED' ||
      selectedElectionObj.status === 'RESULTS_PUBLISHED');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-title text-2xl font-bold text-white flex items-center gap-2">
            Candidates
          </h1>
          <p className="page-subtitle text-slate-400 text-sm">
            Nominate and manage candidates across political parties and constituencies
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {hasNoElections ? (
            <button
              onClick={() => setCreateElectionModalOpen(true)}
              className="btn-primary flex items-center gap-2 bg-primary-600 hover:bg-primary-500"
            >
              <Plus size={16} /> Create Election
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  setBulkElectionId(filterElection || (elections?.[0]?.id ? String(elections[0].id) : ''));
                  setSpreadsheetFile(null);
                  setUploadError('');
                  setBulkModalOpen(true);
                }}
                className="btn-secondary flex items-center gap-2 text-emerald-400 hover:text-emerald-300"
              >
                <FileSpreadsheet size={16} /> Bulk Import
              </button>
              <button
                onClick={openRegisterModal}
                disabled={Boolean(isCurrentElectionLocked)}
                className="btn-primary flex items-center gap-2"
                title={isCurrentElectionLocked ? 'Cannot add candidates to locked election' : 'Add Candidate'}
              >
                <Plus size={16} /> Add Candidate
              </button>
            </>
          )}
        </div>
      </div>

      {/* Electoral Rule Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex items-start gap-3 shadow-sm">
        <Info size={18} className="text-cyan-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-0.5">
          <p className="font-semibold text-white">Constituency Electoral Representation Rule:</p>
          <p className="text-slate-400">
            In each constituency, <strong>multiple political parties can contest</strong>. For each political party,{' '}
            <strong>only ONE candidate</strong> may be nominated per constituency. Independent candidates can also contest.
          </p>
        </div>
      </div>

      {/* Guard: no elections */}
      {hasNoElections && (
        <div className="card p-8 text-center border-amber-500/20 bg-amber-500/5 rounded-2xl">
          <Award size={44} className="text-amber-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">No active elections available</h3>
          <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
            Candidates must be associated with an election. Create an election now to begin registering candidates.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setCreateElectionModalOpen(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={16} /> Create Election Now
            </button>
            <button onClick={() => navigate('/admin/elections')} className="btn-secondary flex items-center gap-2">
              <ArrowRight size={16} /> Go to Elections Page
            </button>
          </div>
        </div>
      )}

      {!hasNoElections && (
        <>
          {/* Filters Bar */}
          <div className="card p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="flex flex-wrap gap-3 items-center flex-1">
                {/* Election Selector */}
                <div className="min-w-[220px]">
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Election
                  </label>
                  <select
                    className="input w-full"
                    value={filterElection}
                    onChange={(e) => {
                      setFilterElection(e.target.value);
                      setFilterConstituency('');
                    }}
                  >
                    <option value="">All Elections</option>
                    {(elections || []).map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} ({e.status})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Constituency Filter */}
                <div className="min-w-[200px]">
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Constituency Filter
                  </label>
                  <select
                    className="input w-full"
                    value={filterConstituency}
                    onChange={(e) => setFilterConstituency(e.target.value)}
                  >
                    <option value="">All Constituencies ({electionConstituencies.length})</option>
                    {electionConstituencies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="self-end pb-0.5">
                  <button onClick={() => refetch()} className="btn-secondary h-10 px-4 flex items-center gap-2">
                    <Filter size={14} /> Refresh
                  </button>
                </div>
              </div>

              {/* Status Badge */}
              {selectedElectionObj && (
                <div className="self-end pb-1 text-xs">
                  <span className="text-slate-400 mr-2">Election Status:</span>
                  <span
                    className={`badge ${
                      selectedElectionObj.status === 'ACTIVE'
                        ? 'badge-green'
                        : selectedElectionObj.status === 'SCHEDULED'
                        ? 'badge-blue'
                        : 'badge-yellow'
                    }`}
                  >
                    {selectedElectionObj.status}
                  </span>
                </div>
              )}
            </div>

            {/* Locked alert if election is closed or active */}
            {isCurrentElectionLocked && (
              <div className="mt-3 flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs">
                <ShieldCheck size={16} className="text-amber-400 flex-shrink-0" />
                <span>
                  Election <strong>{selectedElectionObj?.name}</strong> is in <strong>{selectedElectionObj?.status}</strong> status. Candidates cannot be added, edited, or deleted.
                </span>
              </div>
            )}
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="card p-3.5 bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-400">Total Candidates</span>
              <p className="text-xl font-bold text-white mt-0.5">{candidates?.length || 0}</p>
            </div>
            <div className="card p-3.5 bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-400">Parties Contesting</span>
              <p className="text-xl font-bold text-cyan-400 mt-0.5">
                {new Set(candidates?.filter((c) => c.party?.id).map((c) => c.party?.id)).size}
              </p>
            </div>
            <div className="card p-3.5 bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-400">Independents</span>
              <p className="text-xl font-bold text-amber-400 mt-0.5">
                {candidates?.filter((c) => c.isIndependent || !c.partyId).length || 0}
              </p>
            </div>
            <div className="card p-3.5 bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-400">Constituencies Represented</span>
              <p className="text-xl font-bold text-emerald-400 mt-0.5">
                {new Set(candidates?.map((c) => c.constituencyId)).size}
              </p>
            </div>
          </div>

          {/* Candidates Table */}
          {loading ? (
            <TableSkeleton rows={6} cols={8} />
          ) : (
            <div className="card overflow-hidden border border-slate-800 bg-slate-900/90 rounded-2xl shadow-xl">
              <div className="table-wrapper overflow-x-auto">
                <table className="table w-full">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/50">
                      <th className="py-3 px-4 text-left text-xs font-semibold text-slate-400">#</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-slate-400">Photo</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-slate-400">Candidate Name</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-slate-400">Party & Symbol</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-slate-400">Constituency</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-slate-400">Age / Qual.</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-slate-400">Votes</th>
                      <th className="py-3 px-4 text-right text-xs font-semibold text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {candidates?.map((c) => {
                      const lockedStatus =
                        selectedElectionObj?.status === 'ACTIVE' ||
                        selectedElectionObj?.status === 'CLOSED' ||
                        selectedElectionObj?.status === 'RESULTS_PUBLISHED'
                          ? selectedElectionObj.status
                          : c.election?.status === 'ACTIVE' ||
                            c.election?.status === 'CLOSED' ||
                            c.election?.status === 'RESULTS_PUBLISHED'
                          ? c.election.status
                          : null;

                      return (
                        <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4 text-slate-500 font-mono text-sm">{c.serialNumber}</td>
                          <td className="py-3 px-4">
                            {c.photoUrl ? (
                              <img
                                src={c.photoUrl}
                                alt={c.fullName}
                                className="w-9 h-9 rounded-full object-cover border border-slate-700 shadow-sm"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shadow-sm">
                                <User size={16} />
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-white text-sm">{c.fullName}</div>
                            {c.qualification && (
                              <span className="text-xs text-slate-400">{c.qualification}</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {c.party ? (
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                                  style={{ backgroundColor: c.party.color || '#3b82f6' }}
                                />
                                <div>
                                  <div className="font-medium text-white text-xs flex items-center gap-1.5">
                                    <span>{c.party.name}</span>
                                    {c.party.abbreviation && (
                                      <span className="px-1.5 py-0.5 text-[10px] rounded font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                        {c.party.abbreviation}
                                      </span>
                                    )}
                                  </div>
                                  {c.party.symbol && (
                                    <span className="text-[11px] text-cyan-400/90 font-medium">
                                      Symbol: {c.party.symbol}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-400 border border-slate-700">
                                Independent
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="badge badge-purple text-xs font-medium">
                              {c.constituency?.name || 'Constituency #' + c.constituencyId}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-300">
                            <div>{c.age} years</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="badge badge-green font-mono">{c._count?.votes ?? 0}</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {lockedStatus ? (
                              <span className="text-xs text-slate-500 italic">Locked ({lockedStatus})</span>
                            ) : (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => setUploadTarget(c)}
                                  className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                                  title="Upload Candidate Photo"
                                >
                                  <Upload size={15} />
                                </button>
                                <button
                                  onClick={() => openEdit(c)}
                                  className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors"
                                  title="Edit Candidate Details"
                                >
                                  <Pencil size={15} />
                                </button>
                                <button
                                  onClick={() => setDeleteTarget(c)}
                                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                                  title="Remove Candidate"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {(!candidates || candidates.length === 0) && (
                <EmptyState
                  icon={<Award size={32} />}
                  title="No candidates found"
                  description={
                    filterConstituency
                      ? 'No candidates registered in this specific constituency yet.'
                      : filterElection
                      ? 'No candidates registered for the selected election yet. Click "Add Candidate" above.'
                      : 'Select an election to view candidates.'
                  }
                  action={
                    !isCurrentElectionLocked ? (
                      <button onClick={openRegisterModal} className="btn-primary mt-2 flex items-center gap-1.5">
                        <Plus size={15} /> Add First Candidate
                      </button>
                    ) : undefined
                  }
                />
              )}
            </div>
          )}
        </>
      )}

      {/* Add / Edit Candidate Modal */}
      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditTarget(null);
          reset();
          setSelectedElectionForForm('');
          setSelectedConstituencyForForm('');
        }}
        title={editTarget ? 'Edit Candidate Details' : 'Register New Candidate'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Rule note */}
          <div className="p-3 bg-cyan-950/40 border border-cyan-500/20 rounded-xl text-xs text-cyan-200/90 flex items-start gap-2">
            <Info size={16} className="text-cyan-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Party Rule:</strong> Multiple parties can contest in a constituency, but each political party can
              have <strong>only one candidate</strong> per constituency.
            </div>
          </div>

          <div>
            <label className="label" htmlFor="cand-name">
              Candidate Full Name *
            </label>
            <input
              id="cand-name"
              {...register('fullName', { required: 'Candidate full name is required.' })}
              className={`input ${errors.fullName ? 'input-error' : ''}`}
              placeholder="e.g. Y. S. Jagan Mohan Reddy, N. Chandrababu Naidu"
              aria-invalid={!!errors.fullName}
            />
            {errors.fullName && (
              <p className="field-error-message" role="alert">
                <AlertCircle size={12} />
                {errors.fullName.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="cand-election">
                Election *
              </label>
              <select
                id="cand-election"
                {...register('electionId', { required: 'Please select an election.' })}
                className={`input ${errors.electionId ? 'input-error' : ''}`}
                value={selectedElectionForForm}
                onChange={(e) => {
                  setSelectedElectionForForm(e.target.value);
                  setValue('electionId', Number(e.target.value));
                  clearErrors('electionId');
                }}
              >
                <option value="">Select election...</option>
                {(elections || []).map((e) => {
                  const locked =
                    e.status === 'ACTIVE' || e.status === 'CLOSED' || e.status === 'RESULTS_PUBLISHED';
                  return (
                    <option key={e.id} value={e.id} disabled={locked}>
                      {e.name} {locked ? `(${e.status} - Locked)` : `(${e.status})`}
                    </option>
                  );
                })}
              </select>
              {errors.electionId && (
                <p className="field-error-message" role="alert">
                  <AlertCircle size={12} />
                  {errors.electionId.message}
                </p>
              )}
            </div>

            <div>
              <label className="label" htmlFor="cand-constituency">
                Constituency *
              </label>
              <select
                id="cand-constituency"
                {...register('constituencyId', { required: 'Please select a constituency.' })}
                className={`input ${errors.constituencyId ? 'input-error' : ''}`}
                value={selectedConstituencyForForm}
                onChange={(e) => {
                  setValue('constituencyId', Number(e.target.value));
                  setSelectedConstituencyForForm(e.target.value);
                  clearErrors('constituencyId');
                }}
              >
                <option value="">
                  {selectedElectionForForm ? 'Select constituency...' : 'Select election first'}
                </option>
                {formConstituencies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
              {errors.constituencyId && (
                <p className="field-error-message" role="alert">
                  <AlertCircle size={12} />
                  {errors.constituencyId.message}
                </p>
              )}
            </div>
          </div>

          {/* Party Selection with Uniqueness Check */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0" htmlFor="cand-party">
                Political Party {isIndependentVal ? '(Disabled for Independent)' : '*'}
              </label>
              <span className="text-[11px] text-slate-400">
                {selectedConstituencyForForm
                  ? 'Showing available parties for this constituency'
                  : 'Select constituency to view party slots'}
              </span>
            </div>

            <select
              id="cand-party"
              {...register('partyId', {
                validate: (val) => {
                  if (isIndependentVal) return true;
                  if (!val) return 'Please select a political party or mark as Independent.';
                  // Check if party is already taken in this constituency
                  const alreadyTaken = electionCandidates.find(
                    (c) =>
                      c.constituencyId === Number(selectedConstituencyForForm) &&
                      c.party?.id === Number(val) &&
                      (!editTarget || c.id !== editTarget.id),
                  );
                  if (alreadyTaken) {
                    return `This party already has a candidate (${alreadyTaken.fullName}) nominated in this constituency.`;
                  }
                  return true;
                },
              })}
              disabled={isIndependentVal}
              className={`input ${errors.partyId ? 'input-error' : ''} ${
                isIndependentVal ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            >
              <option value="">Select Political Party...</option>
              {(parties || []).map((p) => {
                const alreadyNominated =
                  selectedConstituencyForForm &&
                  electionCandidates.find(
                    (c) =>
                      c.constituencyId === Number(selectedConstituencyForForm) &&
                      c.party?.id === p.id &&
                      (!editTarget || c.id !== editTarget.id),
                  );

                return (
                  <option key={p.id} value={p.id} disabled={Boolean(alreadyNominated)}>
                    {p.name} ({p.abbreviation || 'N/A'}) {p.symbol ? `— Symbol: ${p.symbol}` : ''}
                    {alreadyNominated ? ` — [Already nominated: ${alreadyNominated.fullName}]` : ''}
                  </option>
                );
              })}
            </select>

            {errors.partyId && (
              <p className="field-error-message" role="alert">
                <AlertCircle size={12} />
                {errors.partyId.message}
              </p>
            )}
          </div>

          {/* Independent Checkbox */}
          <div className="flex items-center gap-2.5 p-2.5 bg-slate-800/40 rounded-xl border border-slate-700/60">
            <input
              {...register('isIndependent')}
              type="checkbox"
              className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
              id="independent"
              onChange={(e) => {
                setValue('isIndependent', e.target.checked);
                if (e.target.checked) {
                  setValue('partyId', '');
                  clearErrors('partyId');
                }
              }}
            />
            <label htmlFor="independent" className="text-sm font-medium text-slate-200 cursor-pointer">
              Contest as an Independent Candidate (No political party affiliation)
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="cand-age">
                Age *
              </label>
              <input
                id="cand-age"
                {...register('age', {
                  required: 'Age is required.',
                  valueAsNumber: true,
                  min: { value: 25, message: 'Candidate must be at least 25 years old (Representation of People Act).' },
                })}
                type="number"
                className={`input ${errors.age ? 'input-error' : ''}`}
                placeholder="35"
                aria-invalid={!!errors.age}
              />
              {errors.age && (
                <p className="field-error-message" role="alert">
                  <AlertCircle size={12} />
                  {errors.age.message}
                </p>
              )}
            </div>

            <div>
              <label className="label" htmlFor="cand-serial">
                Ballot Serial Number *
              </label>
              <input
                id="cand-serial"
                {...register('serialNumber', {
                  required: 'Serial number is required.',
                  valueAsNumber: true,
                  min: { value: 1, message: 'Serial number must be 1 or higher.' },
                })}
                type="number"
                className={`input ${errors.serialNumber ? 'input-error' : ''}`}
                placeholder="1"
                aria-invalid={!!errors.serialNumber}
              />
              {errors.serialNumber && (
                <p className="field-error-message" role="alert">
                  <AlertCircle size={12} />
                  {errors.serialNumber.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="cand-qual">
              Educational Qualification
            </label>
            <input
              id="cand-qual"
              {...register('qualification')}
              className="input"
              placeholder="e.g. B.Tech, M.B.A., LL.B., M.B.B.S., Graduate"
            />
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-slate-800">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setModalOpen(false);
                reset();
              }}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={creating || updating}>
              {creating || updating ? <Spinner size={16} /> : null}{' '}
              {editTarget ? 'Update Candidate' : 'Register Candidate'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Quick Create Election Modal */}
      <Modal
        open={createElectionModalOpen}
        onClose={() => setCreateElectionModalOpen(false)}
        title="Quick Create Election"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Create an election to start nominating candidates for its constituencies.
          </p>
          <div>
            <label className="label">Election Name *</label>
            <input
              type="text"
              value={newElectionName}
              onChange={(e) => setNewElectionName(e.target.value)}
              className="input w-full"
              placeholder="e.g. Andhra Pradesh Assembly Elections 2024"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCreateElectionModalOpen(false)}
              className="btn-secondary"
              disabled={creatingElection}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleQuickCreateElection}
              className="btn-primary"
              disabled={creatingElection || !newElectionName.trim()}
            >
              {creatingElection ? <Spinner size={16} /> : null} Create & Continue
            </button>
          </div>
        </div>
      </Modal>

      {/* Upload Photo Modal */}
      <Modal
        open={!!uploadTarget}
        onClose={() => setUploadTarget(null)}
        title={`Upload Photo – ${uploadTarget?.fullName}`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Select an image for candidate ballot display (JPEG, PNG). Max 5MB.
          </p>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0]);
            }}
            className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-600 file:text-white file:cursor-pointer"
          />
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteCandidate(deleteTarget.id)}
        title="Remove Candidate"
        message={`Are you sure you want to remove "${deleteTarget?.fullName}" from this constituency?`}
        confirmText="Remove"
        loading={deleting}
      />

      {/* Bulk Import Modal */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Bulk Import Candidates</h3>
                  <p className="text-xs text-slate-400">Upload an Excel or CSV file</p>
                </div>
              </div>
              <button onClick={() => setBulkModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto">
              <div>
                <label className="label">Target Election *</label>
                <select
                  value={bulkElectionId}
                  onChange={(e) => setBulkElectionId(e.target.value)}
                  className="input"
                >
                  <option value="">Select Election...</option>
                  {(elections || []).map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <div className="text-xs text-slate-300">Need the correct template?</div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  disabled={downloadingTemplate}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  {downloadingTemplate ? <Loader2 size={13} className="animate-spin mr-1" /> : null}
                  Download Template
                </button>
              </div>

              <div>
                <label className="label">Select Spreadsheet File (.xlsx or .csv) *</label>
                {!spreadsheetFile ? (
                  <label className="border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-800/20 hover:bg-slate-800/40 transition-colors">
                    <Upload size={28} className="text-slate-400 mb-2" />
                    <span className="text-sm font-medium text-slate-300">Click to browse or drop file</span>
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={(e) => setSpreadsheetFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet size={20} className="text-emerald-400" />
                      <div>
                        <p className="text-sm font-medium text-white">{spreadsheetFile.name}</p>
                        <p className="text-xs text-slate-400">{(spreadsheetFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSpreadsheetFile(null)}
                      className="text-slate-400 hover:text-red-400 p-1.5"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>

              {uploadError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 whitespace-pre-wrap">
                  {uploadError}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/50">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setBulkModalOpen(false)}
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkSubmit}
                disabled={uploading || !spreadsheetFile || !bulkElectionId}
                className="btn-primary"
              >
                {uploading ? <Loader2 size={16} className="animate-spin mr-1" /> : <Upload size={16} className="mr-1" />}
                Import Candidates
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
