import React, { useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Award, Upload, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAsync, useMutation } from '../../hooks/useAsync';
import { candidateService, constituencyService, partyService } from '../../services/api.service';
import { Modal, ConfirmDialog, TableSkeleton, EmptyState, Spinner } from '../../components/ui';
import { toast } from 'react-hot-toast';

interface Candidate {
  id: number; fullName: string; age: number; qualification?: string; serialNumber: number;
  isIndependent: boolean; photoUrl?: string; constituencyId: number;
  constituency: { name: string }; party?: { id: number; name: string; color: string };
  _count: { votes: number };
}

export const CandidatesPage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Candidate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Candidate | null>(null);
  const [uploadTarget, setUploadTarget] = useState<Candidate | null>(null);
  const [filterConstituency, setFilterConstituency] = useState<string>('');

  const fetchCandidates = useCallback(
    () => candidateService.getAll(filterConstituency ? Number(filterConstituency) : undefined),
    [filterConstituency],
  );
  const { data: candidates, loading, execute: refetch } = useAsync<Candidate[]>(fetchCandidates);

  const fetchConstituencies = useCallback(() => constituencyService.getAll(), []);
  const { data: constituencies } = useAsync(fetchConstituencies);

  const fetchParties = useCallback(() => partyService.getAll(), []);
  const { data: parties } = useAsync(fetchParties);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<{
    constituencyId: number; partyId?: number; fullName: string; age: number;
    qualification?: string; serialNumber: number; isIndependent: boolean;
  }>();

  const { mutate: createCandidate, loading: creating } = useMutation(
    (data: object) => candidateService.create(data),
    { onSuccess: () => { refetch(); setModalOpen(false); reset(); }, successMessage: 'Candidate registered' },
  );

  const { mutate: updateCandidate, loading: updating } = useMutation(
    ({ id, data }: { id: number; data: object }) => candidateService.update(id, data),
    { onSuccess: () => { refetch(); setModalOpen(false); setEditTarget(null); reset(); }, successMessage: 'Candidate updated' },
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
    setValue('fullName', c.fullName); setValue('age', c.age);
    setValue('qualification', c.qualification ?? ''); setValue('serialNumber', c.serialNumber);
    setValue('constituencyId', c.constituencyId);
    setValue('partyId', c.party?.id);
    setValue('isIndependent', c.isIndependent);
    setModalOpen(true);
  };

  const onSubmit = (data: object) => {
    const payload = { ...data, constituencyId: Number((data as { constituencyId: string }).constituencyId), partyId: (data as { partyId?: string }).partyId ? Number((data as { partyId: string }).partyId) : null };
    if (editTarget) updateCandidate({ id: editTarget.id, data: payload });
    else createCandidate(payload);
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Candidates</h1>
          <p className="page-subtitle">Register and manage election candidates</p>
        </div>
        <button onClick={() => { reset(); setEditTarget(null); setModalOpen(true); }} className="btn-primary">
          <Plus size={16} /> Add Candidate
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select className="input max-w-xs" value={filterConstituency} onChange={(e) => setFilterConstituency(e.target.value)}>
          <option value="">All Constituencies</option>
          {(constituencies as { id: number; name: string }[] || []).map((c: { id: number; name: string }) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={() => refetch()} className="btn-secondary">Apply</button>
      </div>

      {loading ? <TableSkeleton rows={5} cols={7} /> : (
        <div className="card overflow-hidden">
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>#</th><th>Photo</th><th>Name</th><th>Party</th><th>Constituency</th><th>Age</th><th>Votes</th><th>Actions</th></tr></thead>
              <tbody>
                {candidates?.map((c, i) => (
                  <tr key={c.id}>
                    <td className="text-slate-500">{c.serialNumber}</td>
                    <td>
                      {c.photoUrl
                        ? <img src={c.photoUrl} alt={c.fullName} className="w-8 h-8 rounded-full object-cover" />
                        : <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center"><User size={14} className="text-slate-500" /></div>
                      }
                    </td>
                    <td className="font-medium text-white">{c.fullName}</td>
                    <td>
                      {c.party ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.party.color }} />
                          <span className="text-xs">{c.party.name}</span>
                        </div>
                      ) : <span className="text-slate-500 text-xs">Independent</span>}
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
            <EmptyState icon={<Award size={28} />} title="No candidates" description="Register candidates for your elections" />
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditTarget(null); reset(); }} title={editTarget ? 'Edit Candidate' : 'Register Candidate'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div><label className="label">Full Name *</label><input {...register('fullName', { required: 'Required' })} className="input" placeholder="Candidate full name" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Constituency *</label>
              <select {...register('constituencyId', { required: 'Required' })} className="input">
                <option value="">Select constituency...</option>
                {(constituencies as { id: number; name: string }[] || []).map((c: { id: number; name: string }) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Political Party</label>
              <select {...register('partyId')} className="input">
                <option value="">Independent</option>
                {(parties as { id: number; name: string }[] || []).map((p: { id: number; name: string }) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Age *</label><input {...register('age', { required: true, valueAsNumber: true, min: 18 })} type="number" className="input" placeholder="35" /></div>
            <div><label className="label">Serial No. *</label><input {...register('serialNumber', { required: true, valueAsNumber: true })} type="number" className="input" placeholder="1" /></div>
          </div>
          <div><label className="label">Qualification</label><input {...register('qualification')} className="input" placeholder="B.Tech, LLB..." /></div>
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
        <div className="space-y-4">
          <input type="file" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0]); }}
            className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-600 file:text-white file:cursor-pointer" />
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && deleteCandidate(deleteTarget.id)}
        title="Remove Candidate" message={`Remove "${deleteTarget?.fullName}" from the election?`} confirmText="Remove" loading={deleting} />
    </div>
  );
};
