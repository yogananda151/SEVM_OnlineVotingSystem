import React, { useState, useCallback, useEffect } from 'react';
import { Plus, Pencil, Trash2, Award, Upload, User, ArrowRight, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAsync, useMutation } from '../../hooks/useAsync';
import { candidateService, constituencyService, partyService, electionService } from '../../services/api.service';
import { Modal, ConfirmDialog, TableSkeleton, EmptyState, Spinner } from '../../components/ui';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { normaliseValidationErrors } from '../../lib/validationErrors';

interface Candidate {
  id: number; fullName: string; age: number; qualification?: string; serialNumber: number;
  isIndependent: boolean; photoUrl?: string; constituencyId: number; electionId: number;
  constituency: { name: string };
  party?: { id: number; name: string; color: string };
  _count: { votes: number };
}
interface Election { id: number; name: string; status: string }
interface Constituency { id: number; name: string; code: string }

export const CandidatesPage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Candidate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Candidate | null>(null);
  const [uploadTarget, setUploadTarget] = useState<Candidate | null>(null);
  const [filterElection, setFilterElection] = useState('');
  const [filteredConstituencies, setFilteredConstituencies] = useState<Constituency[]>([]);
  const [selectedElectionForForm, setSelectedElectionForForm] = useState('');
  const navigate = useNavigate();

  const fetchCandidates = useCallback(
    () => candidateService.getAll(filterElection ? Number(filterElection) : undefined),
    [filterElection],
  );
  const { data: candidates, loading, execute: refetch } = useAsync<Candidate[]>(fetchCandidates, true, [fetchCandidates]);

  const fetchElections = useCallback(() => electionService.getAll(), []);
  const { data: elections } = useAsync<Election[]>(fetchElections);

  const fetchAllConstituencies = useCallback(() => constituencyService.getActive(), []);
  const { data: allConstituencies } = useAsync<Constituency[]>(fetchAllConstituencies);

  const fetchParties = useCallback(() => partyService.getAll(), []);
  const { data: parties } = useAsync(fetchParties);

  // When election changes in form, load its constituencies
  useEffect(() => {
    if (!selectedElectionForForm) {
      setFilteredConstituencies(allConstituencies || []);
      return;
    }
    electionService.getConstituencies(Number(selectedElectionForForm))
      .then((links: { constituency: Constituency }[]) => {
        setFilteredConstituencies(links.map((l) => l.constituency));
      })
      .catch(() => setFilteredConstituencies([]));
  }, [selectedElectionForForm, allConstituencies]);

  type CandidateForm = {
    electionId: number; constituencyId: number; partyId?: number; fullName: string;
    age: number; qualification?: string; serialNumber: number; isIndependent: boolean;
  };
  const { register, handleSubmit, reset, setValue, setError, formState: { errors } } = useForm<CandidateForm>();

  const { mutate: createCandidate, loading: creating } = useMutation(
    (data: object) => candidateService.create(data),
    {
      onSuccess: () => { refetch(); setModalOpen(false); reset(); setSelectedElectionForForm(''); },
      successMessage: 'Candidate registered',
      onServerErrors: (data) => {
        const fieldErrors = normaliseValidationErrors(data);
        if (fieldErrors) {
          Object.entries(fieldErrors).forEach(([field, message]) => setError(field as keyof CandidateForm, { message }));
        } else {
          toast.error(data.message || 'Failed to register candidate.');
        }
      },
    },
  );
  const { mutate: updateCandidate, loading: updating } = useMutation(
    ({ id, data }: { id: number; data: object }) => candidateService.update(id, data),
    {
      onSuccess: () => { refetch(); setModalOpen(false); setEditTarget(null); reset(); },
      successMessage: 'Candidate updated',
      onServerErrors: (data) => {
        const fieldErrors = normaliseValidationErrors(data);
        if (fieldErrors) {
          Object.entries(fieldErrors).forEach(([field, message]) => setError(field as keyof CandidateForm, { message }));
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

  const handlePhotoUpload = async (file: File) => {
    if (!uploadTarget) return;
    try {
      await candidateService.uploadPhoto(uploadTarget.id, file);
      toast.success('Photo uploaded'); refetch(); setUploadTarget(null);
    } catch { toast.error('Upload failed'); }
  };

  const openEdit = (c: Candidate) => {
    setEditTarget(c);
    setValue('fullName', c.fullName);
    setValue('age', c.age);
    setValue('qualification', c.qualification ?? '');
    setValue('serialNumber', c.serialNumber);
    setValue('constituencyId', c.constituencyId);
    setValue('electionId', c.electionId);
    setValue('partyId', c.party?.id);
    setValue('isIndependent', c.isIndependent);
    setModalOpen(true);
  };

  const onSubmit = (data: object) => {
    const d = data as { electionId: string; constituencyId: string; partyId?: string };
    const payload = {
      ...data,
      electionId: Number(d.electionId),
      constituencyId: Number(d.constituencyId),
      partyId: d.partyId ? Number(d.partyId) : null,
    };
    if (editTarget) updateCandidate({ id: editTarget.id, data: payload });
    else createCandidate(payload);
  };

  const hasNoElections = elections && elections.length === 0;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Candidates</h1>
          <p className="page-subtitle">Register candidates for specific elections and constituencies</p>
        </div>
        {!hasNoElections && (
          <button onClick={() => { reset(); setEditTarget(null); setSelectedElectionForForm(''); setModalOpen(true); }} className="btn-primary">
            <Plus size={16} /> Add Candidate
          </button>
        )}
      </div>

      {/* Guard: no elections */}
      {hasNoElections && (
        <div className="card p-8 text-center border-amber-500/20 bg-amber-500/5">
          <Award size={40} className="text-amber-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">No elections available</h3>
          <p className="text-slate-400 text-sm mb-4">Create an election and set up its constituencies before adding candidates.</p>
          <button onClick={() => navigate('/admin/elections')} className="btn-primary">
            <ArrowRight size={16} /> Go to Elections
          </button>
        </div>
      )}

      {!hasNoElections && (
        <>
          {/* Election filter */}
          <div className="flex gap-3 items-center">
            <select className="input max-w-xs" value={filterElection} onChange={(e) => setFilterElection(e.target.value)}>
              <option value="">All Elections</option>
              {(elections || []).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <button onClick={() => refetch()} className="btn-secondary">Filter</button>
          </div>

          {loading ? <TableSkeleton rows={5} cols={7} /> : (
            <div className="card overflow-hidden">
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr><th>#</th><th>Photo</th><th>Name</th><th>Party</th><th>Constituency</th><th>Age</th><th>Votes</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {candidates?.map((c) => (
                      <tr key={c.id}>
                        <td className="text-slate-500">{c.serialNumber}</td>
                        <td>
                          {c.photoUrl
                            ? <img src={c.photoUrl} alt={c.fullName} className="w-8 h-8 rounded-full object-cover" />
                            : <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center"><User size={14} className="text-slate-500" /></div>}
                        </td>
                        <td className="font-medium text-white">{c.fullName}</td>
                        <td>
                          {c.party
                            ? <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.party.color }} /><span className="text-xs">{c.party.name}</span></div>
                            : <span className="text-slate-500 text-xs">Independent</span>}
                        </td>
                        <td className="text-xs text-slate-400">{c.constituency.name}</td>
                        <td>{c.age}</td>
                        <td><span className="badge badge-green">{c._count.votes}</span></td>
                        <td>
                          <div className="flex items-center gap-2">
                            <button onClick={() => setUploadTarget(c)} className="p-1.5 text-slate-400 hover:text-amber-400" title="Upload Photo"><Upload size={14} /></button>
                            <button onClick={() => openEdit(c)} className="p-1.5 text-slate-400 hover:text-blue-400"><Pencil size={14} /></button>
                            <button onClick={() => setDeleteTarget(c)} className="p-1.5 text-slate-400 hover:text-red-400"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(!candidates || candidates.length === 0) && (
                <EmptyState icon={<Award size={28} />} title="No candidates" description={filterElection ? 'No candidates for the selected election.' : 'Select an election to view its candidates.'} />
              )}
            </div>
          )}
        </>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditTarget(null); reset(); setSelectedElectionForForm(''); }} title={editTarget ? 'Edit Candidate' : 'Register Candidate'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label className="label" htmlFor="cand-name">Full Name *</label>
            <input
              id="cand-name"
              {...register('fullName', { required: 'Candidate full name is required.' })}
              className={`input ${errors.fullName ? 'input-error' : ''}`}
              placeholder="Candidate full name"
              aria-invalid={!!errors.fullName}
              aria-describedby={errors.fullName ? 'cand-name-error' : undefined}
            />
            {errors.fullName && <p id="cand-name-error" className="field-error-message" role="alert"><AlertCircle size={12} />{errors.fullName.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="cand-election">Election *</label>
              <select
                id="cand-election"
                {...register('electionId', { required: 'Please select an election.' })}
                className={`input ${errors.electionId ? 'input-error' : ''}`}
                onChange={(e) => { setSelectedElectionForForm(e.target.value); setValue('electionId', Number(e.target.value)); }}
                aria-invalid={!!errors.electionId}
                aria-describedby={errors.electionId ? 'cand-election-error' : undefined}
              >
                <option value="">Select election...</option>
                {(elections || []).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              {errors.electionId && <p id="cand-election-error" className="field-error-message" role="alert"><AlertCircle size={12} />{errors.electionId.message}</p>}
            </div>
            <div>
              <label className="label" htmlFor="cand-constituency">Constituency *</label>
              <select
                id="cand-constituency"
                {...register('constituencyId', { required: 'Please select a constituency.' })}
                className={`input ${errors.constituencyId ? 'input-error' : ''}`}
                aria-invalid={!!errors.constituencyId}
                aria-describedby={errors.constituencyId ? 'cand-constituency-error' : undefined}
              >
                <option value="">{selectedElectionForForm ? 'Select constituency...' : 'Select election first'}</option>
                {filteredConstituencies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.constituencyId && <p id="cand-constituency-error" className="field-error-message" role="alert"><AlertCircle size={12} />{errors.constituencyId.message}</p>}
              {filteredConstituencies.length === 0 && selectedElectionForForm && (
                <p className="mt-1 text-xs text-amber-400">No constituencies in this election yet. Set them up first.</p>
              )}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="cand-party">Political Party</label>
            <select id="cand-party" {...register('partyId')} className="input">
              <option value="">Independent</option>
              {(parties as { id: number; name: string }[] || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="cand-age">Age *</label>
              <input
                id="cand-age"
                {...register('age', { required: 'Age is required.', valueAsNumber: true, min: { value: 18, message: 'Must be at least 18 years old.' } })}
                type="number"
                className={`input ${errors.age ? 'input-error' : ''}`}
                placeholder="35"
                aria-invalid={!!errors.age}
                aria-describedby={errors.age ? 'cand-age-error' : undefined}
              />
              {errors.age && <p id="cand-age-error" className="field-error-message" role="alert"><AlertCircle size={12} />{errors.age.message}</p>}
            </div>
            <div>
              <label className="label" htmlFor="cand-serial">Serial No. *</label>
              <input
                id="cand-serial"
                {...register('serialNumber', { required: 'Serial number is required.', valueAsNumber: true, min: { value: 1, message: 'Serial number must be greater than 0.' } })}
                type="number"
                className={`input ${errors.serialNumber ? 'input-error' : ''}`}
                placeholder="1"
                aria-invalid={!!errors.serialNumber}
                aria-describedby={errors.serialNumber ? 'cand-serial-error' : undefined}
              />
              {errors.serialNumber && <p id="cand-serial-error" className="field-error-message" role="alert"><AlertCircle size={12} />{errors.serialNumber.message}</p>}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="cand-qual">Qualification</label>
            <input id="cand-qual" {...register('qualification')} className="input" placeholder="B.Tech, LLB..." />
          </div>
          <div className="flex items-center gap-2">
            <input {...register('isIndependent')} type="checkbox" className="w-4 h-4 rounded" id="independent" />
            <label htmlFor="independent" className="text-sm text-slate-300">Independent Candidate</label>
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" className="btn-secondary" onClick={() => { setModalOpen(false); reset(); }}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={creating || updating}>
              {creating || updating ? <Spinner size={16} /> : null} {editTarget ? 'Update' : 'Register'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!uploadTarget} onClose={() => setUploadTarget(null)} title={`Upload Photo – ${uploadTarget?.fullName}`} size="sm">
        <input type="file" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0]); }}
          className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-600 file:text-white file:cursor-pointer" />
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && deleteCandidate(deleteTarget.id)}
        title="Remove Candidate" message={`Remove "${deleteTarget?.fullName}" from the election?`} confirmText="Remove" loading={deleting} />
    </div>
  );
};
