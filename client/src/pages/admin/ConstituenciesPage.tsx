import React, { useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, MapPin } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAsync, useMutation } from '../../hooks/useAsync';
import { constituencyService, electionService } from '../../services/api.service';
import { Modal, ConfirmDialog, TableSkeleton, EmptyState, Spinner } from '../../components/ui';

interface Constituency { id: number; name: string; code: string; state: string; district: string; election: { name: string }; _count: { pollingStations: number; candidates: number; voters: number } }

export const ConstituenciesPage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Constituency | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Constituency | null>(null);

  const fetchData = useCallback(() => constituencyService.getAll(), []);
  const { data: constituencies, loading, execute: refetch } = useAsync<Constituency[]>(fetchData);
  const fetchElections = useCallback(() => electionService.getAll(), []);
  const { data: elections } = useAsync(fetchElections);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<{ electionId: number; name: string; code: string; state: string; district: string }>();

  const { mutate: create, loading: creating } = useMutation((d: object) => constituencyService.create(d), { onSuccess: () => { refetch(); setModalOpen(false); reset(); }, successMessage: 'Constituency created' });
  const { mutate: update, loading: updating } = useMutation(({ id, data }: { id: number; data: object }) => constituencyService.update(id, data), { onSuccess: () => { refetch(); setModalOpen(false); setEditTarget(null); reset(); }, successMessage: 'Updated' });
  const { mutate: del, loading: deleting } = useMutation((id: number) => constituencyService.delete(id), { onSuccess: () => { refetch(); setDeleteTarget(null); }, successMessage: 'Deleted' });

  const openEdit = (c: Constituency) => { setEditTarget(c); setValue('name', c.name); setValue('code', c.code); setValue('state', c.state); setValue('district', c.district); setModalOpen(true); };
  const onSubmit = (data: object) => { const d = { ...data, electionId: Number((data as { electionId: string }).electionId) }; if (editTarget) update({ id: editTarget.id, data: d }); else create(d); };

  return (
    <div className="space-y-6">
      <div className="page-header"><div><h1 className="page-title">Constituencies</h1><p className="page-subtitle">Manage election constituencies</p></div><button onClick={() => { reset(); setEditTarget(null); setModalOpen(true); }} className="btn-primary"><Plus size={16} /> Add Constituency</button></div>
      {loading ? <TableSkeleton rows={5} cols={7} /> : (
        <div className="card overflow-hidden"><div className="table-wrapper"><table className="table">
          <thead><tr><th>#</th><th>Name</th><th>Code</th><th>State</th><th>Election</th><th>Stations</th><th>Voters</th><th>Actions</th></tr></thead>
          <tbody>{constituencies?.map((c, i) => (
            <tr key={c.id}>
              <td className="text-slate-500">{i + 1}</td><td className="font-medium text-white">{c.name}</td>
              <td className="font-mono text-xs badge badge-blue">{c.code}</td><td className="text-xs text-slate-400">{c.state}</td>
              <td className="text-xs text-slate-400">{c.election?.name}</td><td>{c._count?.pollingStations}</td><td>{c._count?.voters}</td>
              <td><div className="flex gap-2"><button onClick={() => openEdit(c)} className="p-1.5 text-slate-400 hover:text-blue-400"><Pencil size={14} /></button><button onClick={() => setDeleteTarget(c)} className="p-1.5 text-slate-400 hover:text-red-400"><Trash2 size={14} /></button></div></td>
            </tr>
          ))}</tbody>
        </table></div>
        {(!constituencies || constituencies.length === 0) && <EmptyState icon={<MapPin size={28} />} title="No constituencies" description="Add constituencies to organize your election" />}
        </div>
      )}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); reset(); }} title={editTarget ? 'Edit Constituency' : 'Add Constituency'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div><label className="label">Election *</label><select {...register('electionId', { required: true })} className="input"><option value="">Select election...</option>{(elections as { id: number; name: string }[] || []).map((e: { id: number; name: string }) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-4"><div><label className="label">Name *</label><input {...register('name', { required: true })} className="input" /></div><div><label className="label">Code *</label><input {...register('code', { required: true })} className="input" placeholder="DL-01" /></div></div>
          <div className="grid grid-cols-2 gap-4"><div><label className="label">State *</label><input {...register('state', { required: true })} className="input" /></div><div><label className="label">District *</label><input {...register('district', { required: true })} className="input" /></div></div>
          <div className="flex gap-3 justify-end"><button type="button" className="btn-secondary" onClick={() => { setModalOpen(false); reset(); }}>Cancel</button><button type="submit" className="btn-primary" disabled={creating || updating}>{creating || updating ? <Spinner size={16} /> : null} Save</button></div>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && del(deleteTarget.id)} title="Delete Constituency" message={`Delete "${deleteTarget?.name}"?`} confirmText="Delete" loading={deleting} />
    </div>
  );
};
