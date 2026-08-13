import React, { useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, UserCog, Key } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAsync, useMutation } from '../../hooks/useAsync';
import { officerService, pollingStationService } from '../../services/api.service';
import { Modal, ConfirmDialog, TableSkeleton, EmptyState, Spinner } from '../../components/ui';

interface Officer {
  id: number; fullName: string; employeeId: string; phone: string;
  pollingStationId?: number;
  user: { id: number; email: string; isActive: boolean; lastLoginAt?: string };
  pollingStation?: { id: number; name: string; code: string };
}

export const OfficersPage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Officer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Officer | null>(null);

  const fetchOfficers = useCallback(() => officerService.getAll(), []);
  const { data: officers, loading, execute: refetch } = useAsync<Officer[]>(fetchOfficers);

  const fetchStations = useCallback(() => pollingStationService.getAll(), []);
  const { data: stations } = useAsync(fetchStations);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<{
    email: string; password: string; fullName: string; employeeId: string; phone: string; pollingStationId?: number;
  }>();

  const { mutate: createOfficer, loading: creating } = useMutation(
    (data: object) => officerService.create(data),
    { onSuccess: () => { refetch(); setModalOpen(false); reset(); }, successMessage: 'Officer registered' },
  );

  const { mutate: updateOfficer, loading: updating } = useMutation(
    ({ id, data }: { id: number; data: object }) => officerService.update(id, data),
    { onSuccess: () => { refetch(); setModalOpen(false); setEditTarget(null); reset(); }, successMessage: 'Officer updated' },
  );

  const { mutate: deleteOfficer, loading: deleting } = useMutation(
    (id: number) => officerService.delete(id),
    { onSuccess: () => { refetch(); setDeleteTarget(null); }, successMessage: 'Officer removed' },
  );

  const openEdit = (o: Officer) => {
    setEditTarget(o);
    setValue('fullName', o.fullName); setValue('employeeId', o.employeeId);
    setValue('phone', o.phone); setValue('pollingStationId', o.pollingStationId);
    setModalOpen(true);
  };

  const onSubmit = (data: object) => {
    const payload = { ...data, pollingStationId: (data as { pollingStationId?: string }).pollingStationId ? Number((data as { pollingStationId: string }).pollingStationId) : null };
    if (editTarget) updateOfficer({ id: editTarget.id, data: payload });
    else createOfficer(payload);
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Election Officers</h1>
          <p className="page-subtitle">Manage officers assigned to polling stations</p>
        </div>
        <button onClick={() => { reset(); setEditTarget(null); setModalOpen(true); }} className="btn-primary">
          <Plus size={16} /> Register Officer
        </button>
      </div>

      {loading ? <TableSkeleton rows={5} cols={6} /> : (
        <div className="card overflow-hidden">
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>#</th><th>Name</th><th>Employee ID</th><th>Email</th><th>Polling Station</th><th>Last Login</th><th>Actions</th></tr></thead>
              <tbody>
                {officers?.map((o, i) => (
                  <tr key={o.id}>
                    <td className="text-slate-500">{i + 1}</td>
                    <td className="font-medium text-white">{o.fullName}</td>
                    <td className="font-mono text-xs text-slate-300">{o.employeeId}</td>
                    <td className="text-xs text-slate-400">{o.user.email}</td>
                    <td className="text-xs text-slate-400">{o.pollingStation?.name ?? '–'}</td>
                    <td className="text-xs text-slate-500">{o.user.lastLoginAt ? new Date(o.user.lastLoginAt).toLocaleDateString('en-IN') : 'Never'}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(o)} className="p-1.5 text-slate-400 hover:text-blue-400"><Pencil size={14} /></button>
                        <button onClick={() => setDeleteTarget(o)} className="p-1.5 text-slate-400 hover:text-red-400"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(!officers || officers.length === 0) && (
            <EmptyState icon={<UserCog size={28} />} title="No officers" description="Register election officers to manage polling stations" />
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditTarget(null); reset(); }} title={editTarget ? 'Edit Officer' : 'Register Election Officer'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div><label className="label">Full Name *</label><input {...register('fullName', { required: 'Required' })} className="input" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Employee ID *</label><input {...register('employeeId', { required: 'Required' })} className="input" placeholder="EO-DL-001" /></div>
            <div><label className="label">Phone *</label><input {...register('phone', { required: 'Required' })} className="input" placeholder="+91-9000000000" /></div>
          </div>
          {!editTarget && (
            <>
              <div><label className="label">Email *</label><input {...register('email', { required: 'Required' })} type="email" className="input" /></div>
              <div>
                <label className="label">Password *</label>
                <input {...register('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 chars' } })} type="password" className="input" placeholder="Min 8 characters" />
                {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
              </div>
            </>
          )}
          <div>
            <label className="label">Assign Polling Station</label>
            <select {...register('pollingStationId')} className="input">
              <option value="">Unassigned</option>
              {(stations as { id: number; name: string; code: string }[] || []).map((s: { id: number; name: string; code: string }) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
            </select>
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" className="btn-secondary" onClick={() => { setModalOpen(false); reset(); }}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={creating || updating}>
              {creating || updating ? <Spinner size={16} /> : null} {editTarget ? 'Update' : 'Register'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && deleteOfficer(deleteTarget.id)}
        title="Remove Officer" message={`Remove officer "${deleteTarget?.fullName}"? Their login access will be revoked.`} confirmText="Remove" loading={deleting} />
    </div>
  );
};
