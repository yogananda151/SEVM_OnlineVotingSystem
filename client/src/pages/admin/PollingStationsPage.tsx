import React, { useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Building2, Lock, Unlock, Pause, Play } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAsync, useMutation } from '../../hooks/useAsync';
import { pollingStationService, constituencyService } from '../../services/api.service';
import { Modal, ConfirmDialog, TableSkeleton, EmptyState, Spinner, StatusBadge } from '../../components/ui';
import { toast } from 'react-hot-toast';

interface Station { id: number; name: string; code: string; address: string; totalBooths: number; machineStatus: string; isPollingActive: boolean; constituency: { name: string; code: string }; officers: { user: { email: string } }[]; _count: { voters: number; votes: number } }

export const PollingStationsPage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Station | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Station | null>(null);

  const fetchData = useCallback(() => pollingStationService.getAll(), []);
  const { data: stations, loading, execute: refetch } = useAsync<Station[]>(fetchData);
  const fetchConstituencies = useCallback(() => constituencyService.getAll(), []);
  const { data: constituencies } = useAsync(fetchConstituencies);

  const { register, handleSubmit, reset, setValue } = useForm<{ constituencyId: number; name: string; code: string; address: string; totalBooths?: number }>();

  const { mutate: create, loading: creating } = useMutation((d: object) => pollingStationService.create(d), { onSuccess: () => { refetch(); setModalOpen(false); reset(); }, successMessage: 'Station created' });
  const { mutate: update, loading: updating } = useMutation(({ id, d }: { id: number; d: object }) => pollingStationService.update(id, d), { onSuccess: () => { refetch(); setModalOpen(false); setEditTarget(null); reset(); }, successMessage: 'Updated' });
  const { mutate: del, loading: deleting } = useMutation((id: number) => pollingStationService.delete(id), { onSuccess: () => { refetch(); setDeleteTarget(null); }, successMessage: 'Deleted' });

  const changeStatus = async (id: number, status: string, isPollingActive?: boolean) => {
    await pollingStationService.updateMachineStatus(id, status, isPollingActive);
    toast.success(`Machine status: ${status}`); refetch();
  };

  const openEdit = (s: Station) => { setEditTarget(s); setValue('name', s.name); setValue('code', s.code); setValue('address', s.address); setValue('totalBooths', s.totalBooths); setModalOpen(true); };
  const onSubmit = (data: object) => { const d = { ...data, constituencyId: Number((data as { constituencyId: string }).constituencyId) }; if (editTarget) update({ id: editTarget.id, d }); else create(d); };

  return (
    <div className="space-y-6">
      <div className="page-header"><div><h1 className="page-title">Polling Stations</h1><p className="page-subtitle">Manage voting locations and machine status</p></div><button onClick={() => { reset(); setEditTarget(null); setModalOpen(true); }} className="btn-primary"><Plus size={16} /> Add Station</button></div>
      {loading ? <TableSkeleton rows={5} cols={7} /> : (
        <div className="card overflow-hidden"><div className="table-wrapper"><table className="table">
          <thead><tr><th>#</th><th>Name</th><th>Code</th><th>Constituency</th><th>Voters</th><th>Votes Cast</th><th>Machine</th><th>Actions</th></tr></thead>
          <tbody>{stations?.map((s, i) => (
            <tr key={s.id}>
              <td className="text-slate-500">{i + 1}</td><td className="font-medium text-white">{s.name}</td>
              <td className="font-mono text-xs"><span className="badge badge-blue">{s.code}</span></td>
              <td className="text-xs text-slate-400">{s.constituency.name}</td>
              <td>{s._count.voters}</td><td>{s._count.votes}</td>
              <td><StatusBadge status={s.machineStatus} /></td>
              <td>
                <div className="flex items-center gap-1.5">
                  {s.machineStatus === 'IDLE' && <button onClick={() => changeStatus(s.id, 'ACTIVE', true)} className="p-1.5 text-emerald-400 hover:text-emerald-300" title="Activate"><Play size={13} /></button>}
                  {s.machineStatus === 'ACTIVE' && <button onClick={() => changeStatus(s.id, 'LOCKED', false)} className="p-1.5 text-red-400 hover:text-red-300" title="Lock"><Lock size={13} /></button>}
                  {s.machineStatus === 'LOCKED' && <button onClick={() => changeStatus(s.id, 'ACTIVE', true)} className="p-1.5 text-emerald-400 hover:text-emerald-300" title="Unlock"><Unlock size={13} /></button>}
                  {s.machineStatus === 'ACTIVE' && <button onClick={() => changeStatus(s.id, 'PAUSED', false)} className="p-1.5 text-amber-400 hover:text-amber-300" title="Pause"><Pause size={13} /></button>}
                  <button onClick={() => openEdit(s)} className="p-1.5 text-slate-400 hover:text-blue-400"><Pencil size={13} /></button>
                  <button onClick={() => setDeleteTarget(s)} className="p-1.5 text-slate-400 hover:text-red-400"><Trash2 size={13} /></button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table></div>
        {(!stations || stations.length === 0) && <EmptyState icon={<Building2 size={28} />} title="No polling stations" description="Add polling stations to your constituencies" />}
        </div>
      )}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); reset(); }} title={editTarget ? 'Edit Station' : 'Add Polling Station'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div><label className="label">Constituency *</label><select {...register('constituencyId', { required: true })} className="input"><option value="">Select...</option>{(constituencies as { id: number; name: string }[] || []).map((c: { id: number; name: string }) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-4"><div><label className="label">Station Name *</label><input {...register('name', { required: true })} className="input" /></div><div><label className="label">Code *</label><input {...register('code', { required: true })} className="input" placeholder="PS-DL-001" /></div></div>
          <div><label className="label">Address *</label><textarea {...register('address', { required: true })} className="input min-h-[70px] resize-none" /></div>
          <div><label className="label">Total Booths</label><input {...register('totalBooths', { valueAsNumber: true })} type="number" className="input w-32" defaultValue={1} /></div>
          <div className="flex gap-3 justify-end"><button type="button" className="btn-secondary" onClick={() => { setModalOpen(false); reset(); }}>Cancel</button><button type="submit" className="btn-primary" disabled={creating || updating}>{creating || updating ? <Spinner size={16} /> : null} Save</button></div>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && del(deleteTarget.id)} title="Delete Station" message={`Delete "${deleteTarget?.name}"?`} confirmText="Delete" loading={deleting} />
    </div>
  );
};
