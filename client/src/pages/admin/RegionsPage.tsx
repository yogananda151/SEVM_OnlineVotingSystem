import React, { useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Globe, Search, CheckCircle, XCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAsync, useMutation } from '../../hooks/useAsync';
import { regionService, constituencyService } from '../../services/api.service';
import { Modal, ConfirmDialog, TableSkeleton, EmptyState, Spinner } from '../../components/ui';
import { useNavigate } from 'react-router-dom';

interface Region {
  id: number;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  _count: { constituencies: number };
}

type FormData = { name: string; code: string; description?: string };

export const RegionsPage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Region | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Region | null>(null);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const fetchData = useCallback(() => regionService.getAll(), []);
  const { data: regions, loading, execute: refetch } = useAsync<Region[]>(fetchData);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>();

  const { mutate: create, loading: creating } = useMutation(
    (d: object) => regionService.create(d),
    { onSuccess: () => { refetch(); setModalOpen(false); reset(); }, successMessage: 'Region created' },
  );

  const { mutate: update, loading: updating } = useMutation(
    ({ id, data }: { id: number; data: object }) => regionService.update(id, data),
    { onSuccess: () => { refetch(); setModalOpen(false); setEditTarget(null); reset(); }, successMessage: 'Region updated' },
  );

  const { mutate: del, loading: deleting } = useMutation(
    (id: number) => regionService.delete(id),
    { onSuccess: () => { refetch(); setDeleteTarget(null); }, successMessage: 'Region deactivated' },
  );

  const openEdit = (r: Region) => {
    setEditTarget(r);
    setValue('name', r.name);
    setValue('code', r.code);
    setValue('description', r.description ?? '');
    setModalOpen(true);
  };

  const onSubmit = (data: FormData) => {
    if (editTarget) update({ id: editTarget.id, data });
    else create(data);
  };

  const filtered = regions?.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.code.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Regions</h1>
          <p className="page-subtitle">Manage geographic regions — the top level of the location hierarchy</p>
        </div>
        <button onClick={() => { reset(); setEditTarget(null); setModalOpen(true); }} className="btn-primary">
          <Plus size={16} /> Add Region
        </button>
      </div>

      {/* Info banner */}
      <div className="card p-4 border-blue-500/20 bg-blue-500/5 flex items-start gap-3">
        <Globe size={18} className="text-blue-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-blue-300">Location Hierarchy</p>
          <p className="text-xs text-slate-400 mt-0.5">
            <span className="text-blue-400 font-medium">Regions</span> → Constituencies → Polling Stations → Voters.
            Add regions first, then create constituencies within them.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="card p-4 flex gap-3 items-center">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or code..."
            className="input pl-9"
          />
        </div>
      </div>

      {loading ? <TableSkeleton rows={5} cols={5} /> : (
        <div className="card overflow-hidden">
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Region Name</th>
                  <th>Code</th>
                  <th>Constituencies</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered?.map((r, i) => (
                  <tr key={r.id}>
                    <td className="text-slate-500">{i + 1}</td>
                    <td>
                      <div>
                        <p className="font-medium text-white">{r.name}</p>
                        {r.description && <p className="text-xs text-slate-500 mt-0.5">{r.description}</p>}
                      </div>
                    </td>
                    <td><span className="badge badge-blue font-mono text-xs">{r.code}</span></td>
                    <td>
                      <button
                        onClick={() => navigate(`/admin/constituencies?regionId=${r.id}`)}
                        className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                      >
                        {r._count.constituencies} constituency(ies)
                      </button>
                    </td>
                    <td>
                      {r.isActive
                        ? <span className="badge badge-green flex items-center gap-1 w-fit"><CheckCircle size={11} /> Active</span>
                        : <span className="badge badge-gray flex items-center gap-1 w-fit"><XCircle size={11} /> Inactive</span>}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(r)} className="p-1.5 text-slate-400 hover:text-blue-400"><Pencil size={14} /></button>
                        <button onClick={() => setDeleteTarget(r)} className="p-1.5 text-slate-400 hover:text-red-400"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(!filtered || filtered.length === 0) && (
            <EmptyState
              icon={<Globe size={28} />}
              title="No regions yet"
              description="Add your first region to get started. Constituencies, polling stations, and voters will be organized within regions."
              action={
                <button onClick={() => { reset(); setModalOpen(true); }} className="btn-primary">
                  <Plus size={16} /> Add Region
                </button>
              }
            />
          )}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); reset(); setEditTarget(null); }}
        title={editTarget ? 'Edit Region' : 'Add Region'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Region Name *</label>
            <input {...register('name', { required: 'Region name is required' })} className="input" placeholder="e.g. Tamil Nadu North" />
            {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Region Code *</label>
            <input {...register('code', { required: 'Code is required' })} className="input" placeholder="e.g. TN-N" />
            <p className="mt-1 text-xs text-slate-500">Short unique identifier (e.g. TN-N, DL-W)</p>
            {errors.code && <p className="mt-1 text-xs text-red-400">{errors.code.message}</p>}
          </div>
          <div>
            <label className="label">Description</label>
            <textarea {...register('description')} className="input min-h-[70px] resize-none" placeholder="Optional description..." />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={() => { setModalOpen(false); reset(); }}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={creating || updating}>
              {creating || updating ? <Spinner size={16} /> : null} {editTarget ? 'Update Region' : 'Add Region'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && del(deleteTarget.id)}
        title="Deactivate Region"
        message={`Deactivate "${deleteTarget?.name}"? This will hide it from active lists. Existing data will be preserved.`}
        confirmText="Deactivate"
        loading={deleting}
      />
    </div>
  );
};
