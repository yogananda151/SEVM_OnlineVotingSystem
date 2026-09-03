import React, { useState, useCallback, useEffect } from 'react';
import { Plus, Pencil, Trash2, Building2, Lock, Unlock, Pause, Play, ArrowRight, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAsync, useMutation } from '../../hooks/useAsync';
import { pollingStationService, constituencyService, regionService } from '../../services/api.service';
import { Modal, ConfirmDialog, TableSkeleton, EmptyState, Spinner, StatusBadge } from '../../components/ui';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { normaliseValidationErrors } from '../../lib/validationErrors';

interface Station {
  id: number; name: string; code: string; address: string;
  totalBooths: number; machineStatus: string; isPollingActive: boolean;
  constituency: { name: string; code: string; region: { name: string } };
  officers: { user: { email: string } }[];
  _count: { voters: number; votes: number };
}
interface Region { id: number; name: string }
interface Constituency { id: number; name: string; code: string }
type FormData = { constituencyId: number; name: string; code: string; address: string; capacity?: number; totalBooths?: number };

export const PollingStationsPage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Station | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Station | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState('');
  const [filteredConstituencies, setFilteredConstituencies] = useState<Constituency[]>([]);
  const navigate = useNavigate();

  const fetchData = useCallback(() => pollingStationService.getAll(), []);
  const { data: stations, loading, execute: refetch } = useAsync<Station[]>(fetchData);

  const fetchRegions = useCallback(() => regionService.getAll(), []);
  const { data: regions } = useAsync<Region[]>(fetchRegions);

  const fetchConstituencies = useCallback(() => constituencyService.getAll(), []);
  const { data: allConstituencies } = useAsync<Constituency[]>(fetchConstituencies);

  // When region changes in the form, filter constituencies
  useEffect(() => {
    if (!selectedRegionId || !allConstituencies) {
      setFilteredConstituencies(allConstituencies || []);
      return;
    }
    constituencyService.getAll(Number(selectedRegionId))
      .then((data) => setFilteredConstituencies(data as Constituency[]))
      .catch(() => {});
  }, [selectedRegionId, allConstituencies]);

  const { register, handleSubmit, reset, setValue, setError, formState: { errors } } = useForm<FormData>();

  const { mutate: create, loading: creating } = useMutation(
    (d: object) => pollingStationService.create(d),
    {
      onSuccess: () => { refetch(); setModalOpen(false); reset(); },
      successMessage: 'Station created',
      onServerErrors: (data) => {
        const fieldErrors = normaliseValidationErrors(data);
        if (fieldErrors) {
          Object.entries(fieldErrors).forEach(([field, message]) => setError(field as keyof FormData, { message }));
        } else {
          toast.error(data.message || 'Failed to create station.');
        }
      },
    },
  );
  const { mutate: update, loading: updating } = useMutation(
    ({ id, d }: { id: number; d: object }) => pollingStationService.update(id, d),
    {
      onSuccess: () => { refetch(); setModalOpen(false); setEditTarget(null); reset(); },
      successMessage: 'Updated',
      onServerErrors: (data) => {
        const fieldErrors = normaliseValidationErrors(data);
        if (fieldErrors) {
          Object.entries(fieldErrors).forEach(([field, message]) => setError(field as keyof FormData, { message }));
        } else {
          toast.error(data.message || 'Failed to update station.');
        }
      },
    },
  );
  const { mutate: del, loading: deleting } = useMutation(
    (id: number) => pollingStationService.delete(id),
    { onSuccess: () => { refetch(); setDeleteTarget(null); }, successMessage: 'Deleted' },
  );

  const changeStatus = async (id: number, status: string, isPollingActive?: boolean) => {
    try {
      await pollingStationService.updateMachineStatus(id, status, isPollingActive);
      toast.success(`Machine status: ${status}`);
      refetch();
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Update failed');
    }
  };

  const openEdit = (s: Station) => {
    setEditTarget(s);
    setValue('name', s.name);
    setValue('code', s.code);
    setValue('address', s.address);
    setValue('totalBooths', s.totalBooths);
    setModalOpen(true);
  };

  const onSubmit = (data: FormData) => {
    const d = { ...data, constituencyId: Number(data.constituencyId) };
    if (editTarget) update({ id: editTarget.id, d });
    else create(d);
  };

  const hasNoConstituencies = allConstituencies && allConstituencies.length === 0;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Polling Stations</h1>
          <p className="page-subtitle">Manage voting locations — each belongs to a constituency</p>
        </div>
        {!hasNoConstituencies && (
          <button onClick={() => { reset(); setEditTarget(null); setSelectedRegionId(''); setModalOpen(true); }} className="btn-primary">
            <Plus size={16} /> Add Station
          </button>
        )}
      </div>

      {/* Guard: no constituencies */}
      {hasNoConstituencies && (
        <div className="card p-8 text-center border-amber-500/20 bg-amber-500/5">
          <Building2 size={40} className="text-amber-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">No constituencies available</h3>
          <p className="text-slate-400 text-sm mb-4">Create constituencies before adding polling stations.</p>
          <button onClick={() => navigate('/admin/constituencies')} className="btn-primary">
            <ArrowRight size={16} /> Go to Constituencies
          </button>
        </div>
      )}

      {!hasNoConstituencies && (
        <>
          {loading ? <TableSkeleton rows={5} cols={8} /> : (
            <div className="card overflow-hidden">
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>#</th><th>Name</th><th>Code</th><th>Region / Constituency</th>
                      <th>Officer</th><th>Voters</th><th>Votes Cast</th><th>Machine</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stations?.map((s, i) => (
                      <tr key={s.id}>
                        <td className="text-slate-500">{i + 1}</td>
                        <td className="font-medium text-white">{s.name}</td>
                        <td><span className="badge badge-blue font-mono text-xs">{s.code}</span></td>
                        <td>
                          <div className="text-xs">
                            <p className="text-slate-400">{s.constituency.region?.name}</p>
                            <p className="text-white">{s.constituency.name}</p>
                          </div>
                        </td>
                        <td>
                          {s.officers.length > 0
                            ? <span className="badge badge-green text-xs">{s.officers[0].user.email}</span>
                            : <span className="badge badge-red text-xs">⚠ No Officer</span>}
                        </td>
                        <td>{s._count.voters}</td>
                        <td>{s._count.votes}</td>
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
                    ))}
                  </tbody>
                </table>
              </div>
              {(!stations || stations.length === 0) && (
                <EmptyState icon={<Building2 size={28} />} title="No polling stations" description="Add polling stations to your constituencies" />
              )}
            </div>
          )}
        </>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); reset(); setEditTarget(null); setSelectedRegionId(''); }} title={editTarget ? 'Edit Station' : 'Add Polling Station'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {!editTarget && (
            <>
              <div>
                <label className="label" htmlFor="ps-region">Region</label>
                <select id="ps-region" className="input" value={selectedRegionId} onChange={(e) => setSelectedRegionId(e.target.value)}>
                  <option value="">All Regions</option>
                  {(regions || []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <p className="mt-1 text-xs text-slate-500">Filter constituencies by region</p>
              </div>
              <div>
                <label className="label" htmlFor="ps-constituency">Constituency *</label>
                <select
                  id="ps-constituency"
                  {...register('constituencyId', { required: 'Please select a constituency.' })}
                  className={`input ${errors.constituencyId ? 'input-error' : ''}`}
                  aria-invalid={!!errors.constituencyId}
                  aria-describedby={errors.constituencyId ? 'ps-constituency-error' : undefined}
                >
                  <option value="">{selectedRegionId ? 'Select constituency...' : 'Select (filter by region above)'}</option>
                  {filteredConstituencies.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                </select>
                {errors.constituencyId && (
                  <p id="ps-constituency-error" className="field-error-message" role="alert">
                    <AlertCircle size={12} />{errors.constituencyId.message}
                  </p>
                )}
                {filteredConstituencies.length === 0 && selectedRegionId && (
                  <p className="mt-1 text-xs text-amber-400">No constituencies in this region. Add constituencies first.</p>
                )}
              </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="ps-name">Station Name *</label>
              <input
                id="ps-name"
                {...register('name', { required: 'Station name is required.' })}
                className={`input ${errors.name ? 'input-error' : ''}`}
                placeholder="e.g. Government School Hall A"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'ps-name-error' : undefined}
              />
              {errors.name && <p id="ps-name-error" className="field-error-message" role="alert"><AlertCircle size={12} />{errors.name.message}</p>}
            </div>
            <div>
              <label className="label" htmlFor="ps-code">Code *</label>
              <input
                id="ps-code"
                {...register('code', { required: 'Station code is required.' })}
                className={`input ${errors.code ? 'input-error' : ''}`}
                placeholder="e.g. PS-CN01-001"
                aria-invalid={!!errors.code}
                aria-describedby={errors.code ? 'ps-code-error' : undefined}
              />
              <p className="mt-1 text-xs text-slate-500">Must be globally unique</p>
              {errors.code && <p id="ps-code-error" className="field-error-message" role="alert"><AlertCircle size={12} />{errors.code.message}</p>}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="ps-address">Address *</label>
            <textarea
              id="ps-address"
              {...register('address', { required: 'Address is required.' })}
              className={`input min-h-[70px] resize-none ${errors.address ? 'input-error' : ''}`}
              placeholder="Full address..."
              aria-invalid={!!errors.address}
              aria-describedby={errors.address ? 'ps-address-error' : undefined}
            />
            {errors.address && <p id="ps-address-error" className="field-error-message" role="alert"><AlertCircle size={12} />{errors.address.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="ps-capacity">Capacity</label>
              <input id="ps-capacity" {...register('capacity', { valueAsNumber: true })} type="number" className="input" defaultValue={1000} />
            </div>
            <div>
              <label className="label" htmlFor="ps-booths">Total Booths</label>
              <input id="ps-booths" {...register('totalBooths', { valueAsNumber: true })} type="number" className="input" defaultValue={1} />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" className="btn-secondary" onClick={() => { setModalOpen(false); reset(); }}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={creating || updating}>
              {creating || updating ? <Spinner size={16} /> : null} Save
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && del(deleteTarget.id)}
        title="Delete Station" message={`Delete "${deleteTarget?.name}"? This will fail if voters are registered here.`} confirmText="Delete" loading={deleting} />
    </div>
  );
};
