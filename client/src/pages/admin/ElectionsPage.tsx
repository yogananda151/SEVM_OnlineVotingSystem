import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Vote, Play, Square, Eye, BarChart3, Settings2, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAsync, useMutation } from '../../hooks/useAsync';
import { electionService } from '../../services/api.service';
import { Modal, ConfirmDialog, StatusBadge, TableSkeleton, EmptyState, Spinner } from '../../components/ui';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { normaliseValidationErrors } from '../../lib/validationErrors';

const schema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().optional(),
  electionType: z.string().min(1, 'Election type is required'),
  scheduledDate: z.string().min(1, 'Scheduled date is required'),
});
type FormData = z.infer<typeof schema>;

const ELECTION_TYPES = ['General', 'State Legislative', 'Municipal', 'Panchayat', 'By-Election', 'Referendum'];

export const ElectionsPage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<{ id: number } & FormData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const navigate = useNavigate();

  const fetchElections = useCallback(() => electionService.getAll(), []);
  const { data: elections, loading, execute: refetch } = useAsync<{ id: number; name: string; electionType: string; scheduledDate: string; status: string; isResultPublished: boolean; _count: { electionConstituencies: number; candidates: number } }[]>(fetchElections);

  const { register, handleSubmit, reset, setValue, setError, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const { mutate: createElection, loading: creating } = useMutation(
    (data: FormData) => electionService.create({ ...data, scheduledDate: new Date(data.scheduledDate).toISOString() }),
    {
      onSuccess: () => { refetch(); setModalOpen(false); reset(); },
      successMessage: 'Election created successfully',
      onServerErrors: (data) => {
        const fieldErrors = normaliseValidationErrors(data);
        if (fieldErrors) {
          Object.entries(fieldErrors).forEach(([field, message]) => setError(field as keyof FormData, { message }));
        } else {
          toast.error(data.message || 'Failed to create election.');
        }
      },
    },
  );

  const { mutate: updateElection, loading: updating } = useMutation(
    (data: FormData & { id: number }) => electionService.update(data.id, { ...data, scheduledDate: new Date(data.scheduledDate).toISOString() }),
    {
      onSuccess: () => { refetch(); setModalOpen(false); setEditTarget(null); reset(); },
      successMessage: 'Election updated',
      onServerErrors: (data) => {
        const fieldErrors = normaliseValidationErrors(data);
        if (fieldErrors) {
          Object.entries(fieldErrors).forEach(([field, message]) => setError(field as keyof FormData, { message }));
        } else {
          toast.error(data.message || 'Failed to update election.');
        }
      },
    },
  );

  const { mutate: deleteElection, loading: deleting } = useMutation(
    (id: number) => electionService.delete(id),
    { onSuccess: () => { refetch(); setDeleteTarget(null); }, successMessage: 'Election deleted' },
  );

  const { mutate: changeStatus } = useMutation(
    ({ id, status }: { id: number; status: string }) => electionService.updateStatus(id, status),
    { onSuccess: () => refetch() },
  );

  const openCreate = () => { reset(); setEditTarget(null); setModalOpen(true); };

  const openEdit = (e: { id: number; name: string; description?: string; electionType: string; scheduledDate: string; status: string; isResultPublished: boolean; _count: { constituencies: number } }) => {
    setEditTarget({ id: e.id, name: e.name, description: e.description ?? '', electionType: e.electionType, scheduledDate: e.scheduledDate.split('T')[0] });
    setValue('name', e.name);
    setValue('description', e.description ?? '');
    setValue('electionType', e.electionType);
    setValue('scheduledDate', e.scheduledDate.split('T')[0]);
    setModalOpen(true);
  };

  const onSubmit = (data: FormData) => {
    if (editTarget) updateElection({ ...data, id: editTarget.id });
    else createElection(data);
  };

  const statusActions: Record<string, { label: string; next: string; icon: React.ReactNode; class: string }> = {
    DRAFT: { label: 'Schedule', next: 'SCHEDULED', icon: <Play size={14} />, class: 'text-blue-400 hover:text-blue-300' },
    SCHEDULED: { label: 'Activate', next: 'ACTIVE', icon: <Play size={14} />, class: 'text-emerald-400 hover:text-emerald-300' },
    ACTIVE: { label: 'Close', next: 'CLOSED', icon: <Square size={14} />, class: 'text-red-400 hover:text-red-300' },
    PAUSED: { label: 'Resume', next: 'ACTIVE', icon: <Play size={14} />, class: 'text-emerald-400 hover:text-emerald-300' },
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Elections</h1>
          <p className="page-subtitle">Manage all elections – create, schedule, and monitor</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus size={16} /> New Election</button>
      </div>

      {loading ? <TableSkeleton rows={5} cols={5} /> : (
        <div className="card overflow-hidden">
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th><th>Election Name</th><th>Type</th><th>Scheduled Date</th>
                  <th>Constituencies</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {elections?.map((e, i) => {
                  const action = statusActions[e.status];
                  return (
                    <tr key={e.id}>
                      <td className="text-slate-500">{i + 1}</td>
                      <td className="font-medium text-white">{e.name}</td>
                      <td><span className="badge badge-blue">{e.electionType}</span></td>
                      <td>{new Date(e.scheduledDate).toLocaleDateString('en-IN')}</td>
                      <td>{e._count?.electionConstituencies ?? 0}</td>
                      <td><StatusBadge status={e.status} /></td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button onClick={() => navigate(`/admin/elections/${e.id}/setup`)} className="p-1.5 text-primary-400 hover:text-primary-300" title="Setup Wizard">
                            <Settings2 size={14} />
                          </button>
                          <button onClick={() => navigate(`/admin/elections/${e.id}`)} className="p-1.5 text-slate-400 hover:text-white" title="View"><Eye size={14} /></button>
                          {e.status === 'CLOSED' && !e.isResultPublished && (
                            <button onClick={() => { electionService.publishResults(e.id).then(() => { toast.success('Results published!'); refetch(); }); }}
                              className="p-1.5 text-emerald-400 hover:text-emerald-300" title="Publish Results">
                              <BarChart3 size={14} />
                            </button>
                          )}
                          {action && (
                            <button onClick={() => changeStatus({ id: e.id, status: action.next })}
                              className={`p-1.5 ${action.class}`} title={action.label}>
                              {action.icon}
                            </button>
                          )}
                          {e.status === 'DRAFT' && (
                            <button onClick={() => openEdit(e)} className="p-1.5 text-slate-400 hover:text-blue-400"><Pencil size={14} /></button>
                          )}
                          <button onClick={() => setDeleteTarget({ id: e.id, name: e.name })} className="p-1.5 text-slate-400 hover:text-red-400"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {(!elections || elections.length === 0) && (
            <EmptyState icon={<Vote size={28} />} title="No elections yet" description="Create your first election to get started"
              action={<button onClick={openCreate} className="btn-primary"><Plus size={16} /> Create Election</button>} />
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditTarget(null); reset(); }} title={editTarget ? 'Edit Election' : 'Create New Election'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label className="label" htmlFor="el-name">Election Name *</label>
            <input
              id="el-name"
              {...register('name')}
              className={`input ${errors.name ? 'input-error' : ''}`}
              placeholder="e.g. General Elections 2025"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'el-name-error' : undefined}
            />
            {errors.name && <p id="el-name-error" className="field-error-message" role="alert"><AlertCircle size={12} />{errors.name.message}</p>}
          </div>
          <div>
            <label className="label" htmlFor="el-description">Description</label>
            <textarea id="el-description" {...register('description')} className="input min-h-[80px] resize-none" placeholder="Brief description..." />
          </div>
          <div>
            <label className="label" htmlFor="el-type">Election Type *</label>
            <select
              id="el-type"
              {...register('electionType')}
              className={`input ${errors.electionType ? 'input-error' : ''}`}
              aria-invalid={!!errors.electionType}
              aria-describedby={errors.electionType ? 'el-type-error' : undefined}
            >
              <option value="">Select type...</option>
              {ELECTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {errors.electionType && <p id="el-type-error" className="field-error-message" role="alert"><AlertCircle size={12} />{errors.electionType.message}</p>}
          </div>
          <div>
            <label className="label" htmlFor="el-date">Scheduled Date *</label>
            <input
              id="el-date"
              {...register('scheduledDate')}
              type="date"
              className={`input ${errors.scheduledDate ? 'input-error' : ''}`}
              aria-invalid={!!errors.scheduledDate}
              aria-describedby={errors.scheduledDate ? 'el-date-error' : undefined}
            />
            {errors.scheduledDate && <p id="el-date-error" className="field-error-message" role="alert"><AlertCircle size={12} />{errors.scheduledDate.message}</p>}
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={() => { setModalOpen(false); setEditTarget(null); reset(); }}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={creating || updating}>
              {creating || updating ? <><Spinner size={16} /> Saving...</> : editTarget ? 'Update Election' : 'Create Election'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteElection(deleteTarget.id)}
        title="Delete Election"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        loading={deleting}
      />
    </div>
  );
};
