import React, { useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Users, Search, Filter } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAsync, useMutation } from '../../hooks/useAsync';
import { voterService, constituencyService, pollingStationService } from '../../services/api.service';
import { Modal, ConfirmDialog, TableSkeleton, EmptyState, Spinner, Pagination } from '../../components/ui';

interface Voter {
  id: number; fullName: string; voterId: string; gender: string;
  hasVoted: boolean; serialNumber: number; dateOfBirth: string;
  pollingStation: { id: number; name: string };
  constituency: { id: number; name: string };
}

export const VotersPage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Voter | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Voter | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStation, setFilterStation] = useState('');
  const [hasVotedFilter, setHasVotedFilter] = useState('');
  const limit = 20;

  const fetchVoters = useCallback(
    () => voterService.getAll({ page, limit, search: search || undefined, pollingStationId: filterStation || undefined, hasVoted: hasVotedFilter !== '' ? hasVotedFilter : undefined }),
    [page, limit, search, filterStation, hasVotedFilter],
  );
  const { data: votersRes, loading, execute: refetch } = useAsync(fetchVoters);
  const voters: Voter[] = votersRes?.data ?? [];
  const total: number = votersRes?.meta?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const fetchConstituencies = useCallback(() => constituencyService.getAll(), []);
  const { data: constituencies } = useAsync(fetchConstituencies);

  const fetchStations = useCallback(() => pollingStationService.getAll(), []);
  const { data: stations } = useAsync(fetchStations);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<{
    constituencyId: number; pollingStationId: number; fullName: string; voterId: string;
    aadhaarNumber?: string; dateOfBirth: string; gender: string; address: string;
    phone?: string; serialNumber: number;
  }>();

  const { mutate: createVoter, loading: creating } = useMutation(
    (data: object) => voterService.create(data),
    { onSuccess: () => { refetch(); setModalOpen(false); reset(); }, successMessage: 'Voter registered' },
  );

  const { mutate: deleteVoter, loading: deleting } = useMutation(
    (id: number) => voterService.delete(id),
    { onSuccess: () => { refetch(); setDeleteTarget(null); }, successMessage: 'Voter removed' },
  );

  const onSubmit = (data: object) => {
    const payload = {
      ...data,
      constituencyId: Number((data as { constituencyId: string }).constituencyId),
      pollingStationId: Number((data as { pollingStationId: string }).pollingStationId),
      serialNumber: Number((data as { serialNumber: string }).serialNumber),
      dateOfBirth: new Date((data as { dateOfBirth: string }).dateOfBirth).toISOString(),
    };
    createVoter(payload);
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Voters</h1>
          <p className="page-subtitle">{total.toLocaleString()} registered voters</p>
        </div>
        <button onClick={() => { reset(); setModalOpen(true); }} className="btn-primary"><Plus size={16} /> Register Voter</button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or voter ID..."
            className="input pl-9" onKeyDown={(e) => e.key === 'Enter' && refetch()} />
        </div>
        <select className="input w-48" value={filterStation} onChange={(e) => setFilterStation(e.target.value)}>
          <option value="">All Stations</option>
          {(stations as { id: number; name: string }[] || []).map((s: { id: number; name: string }) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="input w-40" value={hasVotedFilter} onChange={(e) => setHasVotedFilter(e.target.value)}>
          <option value="">All Voters</option>
          <option value="false">Not Voted</option>
          <option value="true">Voted</option>
        </select>
        <button onClick={() => refetch()} className="btn-primary"><Filter size={14} /> Filter</button>
      </div>

      {loading ? <TableSkeleton rows={10} cols={7} /> : (
        <>
          <div className="card overflow-hidden">
            <div className="table-wrapper">
              <table className="table">
                <thead><tr><th>#</th><th>Full Name</th><th>Voter ID</th><th>Gender</th><th>Station</th><th>Voted</th><th>Actions</th></tr></thead>
                <tbody>
                  {voters.map((v) => (
                    <tr key={v.id}>
                      <td className="text-slate-500">{v.serialNumber}</td>
                      <td className="font-medium text-white">{v.fullName}</td>
                      <td className="font-mono text-xs text-slate-300">{v.voterId}</td>
                      <td><span className={`badge ${v.gender === 'Female' ? 'badge-purple' : v.gender === 'Male' ? 'badge-blue' : 'badge-gray'}`}>{v.gender}</span></td>
                      <td className="text-xs text-slate-400">{v.pollingStation?.name}</td>
                      <td><span className={`badge ${v.hasVoted ? 'badge-green' : 'badge-gray'}`}>{v.hasVoted ? 'Voted' : 'Pending'}</span></td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setDeleteTarget(v)} className="p-1.5 text-slate-400 hover:text-red-400" disabled={v.hasVoted}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {voters.length === 0 && (
              <EmptyState icon={<Users size={28} />} title="No voters found" description="Register voters or adjust your filters" />
            )}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); reset(); }} title="Register New Voter" size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Full Name *</label><input {...register('fullName', { required: 'Required' })} className="input" /></div>
            <div><label className="label">Voter ID *</label><input {...register('voterId', { required: 'Required' })} className="input" placeholder="DL/01/001/0001" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Constituency *</label>
              <select {...register('constituencyId', { required: true })} className="input">
                <option value="">Select...</option>
                {(constituencies as { id: number; name: string }[] || []).map((c: { id: number; name: string }) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Polling Station *</label>
              <select {...register('pollingStationId', { required: true })} className="input">
                <option value="">Select...</option>
                {(stations as { id: number; name: string }[] || []).map((s: { id: number; name: string }) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Gender *</label>
              <select {...register('gender', { required: true })} className="input">
                <option value="">Select...</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div><label className="label">Date of Birth *</label><input {...register('dateOfBirth', { required: true })} type="date" className="input" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Aadhaar (last 4 digits for simulation)</label><input {...register('aadhaarNumber')} className="input" placeholder="Enter for simulation" /></div>
            <div><label className="label">Phone</label><input {...register('phone')} className="input" placeholder="+91-9000000000" /></div>
          </div>
          <div><label className="label">Address *</label><textarea {...register('address', { required: true })} className="input min-h-[60px] resize-none" /></div>
          <div><label className="label">Serial Number *</label><input {...register('serialNumber', { required: true, valueAsNumber: true })} type="number" className="input w-32" /></div>
          <div className="flex gap-3 justify-end">
            <button type="button" className="btn-secondary" onClick={() => { setModalOpen(false); reset(); }}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={creating}>
              {creating ? <Spinner size={16} /> : null} Register Voter
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && deleteVoter(deleteTarget.id)}
        title="Remove Voter" message={`Remove "${deleteTarget?.fullName}" from the voters list?`} confirmText="Remove" loading={deleting} />
    </div>
  );
};
