import React, { useState, useCallback, useEffect } from 'react';
import { Plus, Pencil, Trash2, MapPin, ArrowRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAsync, useMutation } from '../../hooks/useAsync';
import { constituencyService, regionService } from '../../services/api.service';
import { Modal, ConfirmDialog, TableSkeleton, EmptyState, Spinner } from '../../components/ui';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface Constituency {
  id: number;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  region: { id: number; name: string; code: string };
  _count: { pollingStations: number; voters: number };
}
interface Region { id: number; name: string; code: string }
type FormData = { regionId: number; name: string; code: string; description?: string };

export const ConstituenciesPage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Constituency | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Constituency | null>(null);
  const [filterRegion, setFilterRegion] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Pre-select region from query param (e.g. coming from RegionsPage)
  useEffect(() => {
    const regionId = searchParams.get('regionId');
    if (regionId) setFilterRegion(regionId);
  }, [searchParams]);

  const fetchConstituencies = useCallback(
    () => constituencyService.getAll(filterRegion ? Number(filterRegion) : undefined),
    [filterRegion],
  );
  const { data: constituencies, loading, execute: refetch } = useAsync<Constituency[]>(fetchConstituencies);

  const fetchRegions = useCallback(() => regionService.getAll(), []);
  const { data: regions } = useAsync<Region[]>(fetchRegions);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>();

  const { mutate: create, loading: creating } = useMutation(
    (d: object) => constituencyService.create(d),
    { onSuccess: () => { refetch(); setModalOpen(false); reset(); }, successMessage: 'Constituency created' },
  );
  const { mutate: update, loading: updating } = useMutation(
    ({ id, data }: { id: number; data: object }) => constituencyService.update(id, data),
    { onSuccess: () => { refetch(); setModalOpen(false); setEditTarget(null); reset(); }, successMessage: 'Constituency updated' },
  );
  const { mutate: del, loading: deleting } = useMutation(
    (id: number) => constituencyService.delete(id),
    { onSuccess: () => { refetch(); setDeleteTarget(null); }, successMessage: 'Constituency deleted' },
  );

  const openEdit = (c: Constituency) => {
    setEditTarget(c);
    setValue('name', c.name);
    setValue('code', c.code);
    setValue('description', c.description ?? '');
    setValue('regionId', c.region.id);
    setModalOpen(true);
  };

  const onSubmit = (data: FormData) => {
    const payload = { ...data, regionId: Number(data.regionId) };
    if (editTarget) update({ id: editTarget.id, data: payload });
    else create(payload);
  };

  const hasNoRegions = regions && regions.length === 0;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Constituencies</h1>
          <p className="page-subtitle">Manage constituencies — each belongs to a region</p>
        </div>
        {!hasNoRegions && (
          <button onClick={() => { reset(); setEditTarget(null); setModalOpen(true); }} className="btn-primary">
            <Plus size={16} /> Add Constituency
          </button>
        )}
      </div>

      {/* Guard: no regions */}
      {hasNoRegions && (
        <div className="card p-8 text-center border-amber-500/20 bg-amber-500/5">
          <MapPin size={40} className="text-amber-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">No regions available</h3>
          <p className="text-slate-400 text-sm mb-4">You need to add at least one region before creating constituencies.</p>
          <button onClick={() => navigate('/admin/regions')} className="btn-primary">
            <ArrowRight size={16} /> Go to Regions
          </button>
        </div>
      )}

      {!hasNoRegions && (
        <>
          {/* Filters */}
          <div className="card p-4 flex gap-3 items-center">
            <select className="input max-w-xs" value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)}>
              <option value="">All Regions</option>
              {(regions || []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <button onClick={() => refetch()} className="btn-secondary">Filter</button>
            {filterRegion && <button onClick={() => setFilterRegion('')} className="text-xs text-slate-400 hover:text-white">Clear</button>}
          </div>

          {loading ? <TableSkeleton rows={5} cols={6} /> : (
            <div className="card overflow-hidden">
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Code</th>
                      <th>Region</th>
                      <th>Polling Stations</th>
                      <th>Voters</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {constituencies?.map((c, i) => (
                      <tr key={c.id}>
                        <td className="text-slate-500">{i + 1}</td>
                        <td className="font-medium text-white">{c.name}</td>
                        <td><span className="badge badge-blue font-mono text-xs">{c.code}</span></td>
                        <td>
                          <span className="text-xs text-slate-400">
                            <span className="badge badge-gray text-xs">{c.region.code}</span>{' '}
                            {c.region.name}
                          </span>
                        </td>
                        <td>{c._count.pollingStations}</td>
                        <td>{c._count.voters.toLocaleString()}</td>
                        <td>
                          <div className="flex gap-2">
                            <button onClick={() => openEdit(c)} className="p-1.5 text-slate-400 hover:text-blue-400"><Pencil size={14} /></button>
                            <button onClick={() => setDeleteTarget(c)} className="p-1.5 text-slate-400 hover:text-red-400"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(!constituencies || constituencies.length === 0) && (
                <EmptyState
                  icon={<MapPin size={28} />}
                  title="No constituencies"
                  description={filterRegion ? 'No constituencies in the selected region.' : 'Add constituencies to organize your elections.'}
                />
              )}
            </div>
          )}
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); reset(); setEditTarget(null); }}
        title={editTarget ? 'Edit Constituency' : 'Add Constituency'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Region *</label>
            <select {...register('regionId', { required: 'Please select a region' })} className="input">
              <option value="">Select region...</option>
              {(regions || []).map((r) => <option key={r.id} value={r.id}>{r.name} ({r.code})</option>)}
            </select>
            {errors.regionId && <p className="mt-1 text-xs text-red-400">{errors.regionId.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Constituency Name *</label>
              <input {...register('name', { required: 'Name is required' })} className="input" placeholder="e.g. Chennai North 01" />
              {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">Code *</label>
              <input {...register('code', { required: 'Code is required' })} className="input" placeholder="e.g. CN-01" />
              <p className="mt-1 text-xs text-slate-500">Must be globally unique</p>
              {errors.code && <p className="mt-1 text-xs text-red-400">{errors.code.message}</p>}
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea {...register('description')} className="input min-h-[60px] resize-none" placeholder="Optional..." />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" className="btn-secondary" onClick={() => { setModalOpen(false); reset(); }}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={creating || updating}>
              {creating || updating ? <Spinner size={16} /> : null} Save
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && del(deleteTarget.id)}
        title="Delete Constituency"
        message={`Delete "${deleteTarget?.name}"? This will fail if polling stations or voters are attached.`}
        confirmText="Delete"
        loading={deleting}
      />
    </div>
  );
};
