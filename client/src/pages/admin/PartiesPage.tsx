import React, { useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Flag, Upload } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAsync, useMutation } from '../../hooks/useAsync';
import { partyService } from '../../services/api.service';
import { Modal, ConfirmDialog, TableSkeleton, EmptyState, Spinner } from '../../components/ui';
import { toast } from 'react-hot-toast';

import { normaliseValidationErrors } from '../../lib/validationErrors';

interface Party { id: number; name: string; abbreviation: string; symbol?: string; symbolUrl?: string; color: string; foundedYear?: number; isActive: boolean; _count: { candidates: number } }

export const PartiesPage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Party | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Party | null>(null);
  const [uploadTarget, setUploadTarget] = useState<Party | null>(null);

  const fetchParties = useCallback(() => partyService.getAll(), []);
  const { data: parties, loading, execute: refetch } = useAsync<Party[]>(fetchParties);

  const { register, handleSubmit, reset, setValue, setError, formState: { errors } } = useForm<{
    name: string; abbreviation: string; symbol?: string; color: string; foundedYear?: number;
  }>();

  const handleServerErrors = (data: { message?: string; errors?: Array<{ field: string; message: string }> }) => {
    const fieldErrors = normaliseValidationErrors(data);
    if (fieldErrors) {
      Object.entries(fieldErrors).forEach(([field, message]) => setError(field as any, { message }));
    } else {
      toast.error(data.message || 'Operation failed');
    }
  };

  const { mutate: createParty, loading: creating } = useMutation(
    (data: object) => partyService.create(data),
    {
      onSuccess: () => { refetch(); setModalOpen(false); reset(); },
      successMessage: 'Party created',
      onServerErrors: handleServerErrors,
    },
  );

  const { mutate: updateParty, loading: updating } = useMutation(
    ({ id, data }: { id: number; data: object }) => partyService.update(id, data),
    {
      onSuccess: () => { refetch(); setModalOpen(false); setEditTarget(null); reset(); },
      successMessage: 'Party updated',
      onServerErrors: handleServerErrors,
    },
  );

  const { mutate: deleteParty, loading: deleting } = useMutation(
    (id: number) => partyService.delete(id),
    { onSuccess: () => { refetch(); setDeleteTarget(null); }, successMessage: 'Party deleted' },
  );

  const openEdit = (p: Party) => {
    setEditTarget(p);
    setValue('name', p.name); setValue('abbreviation', p.abbreviation);
    setValue('symbol', p.symbol ?? ''); setValue('color', p.color);
    setValue('foundedYear', p.foundedYear);
    setModalOpen(true);
  };

  const handleSymbolUpload = async (file: File) => {
    if (!uploadTarget) return;
    try {
      await partyService.uploadSymbol(uploadTarget.id, file);
      toast.success('Symbol uploaded'); refetch(); setUploadTarget(null);
    } catch { toast.error('Upload failed'); }
  };

  const onSubmit = (data: object) => {
    if (editTarget) updateParty({ id: editTarget.id, data });
    else createParty(data);
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Political Parties</h1>
          <p className="page-subtitle">Manage registered political parties and their symbols</p>
        </div>
        <button onClick={() => { reset(); setEditTarget(null); setModalOpen(true); }} className="btn-primary">
          <Plus size={16} /> Add Party
        </button>
      </div>

      {loading ? <TableSkeleton rows={5} cols={5} /> : (
        <div className="card overflow-hidden">
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>#</th><th>Party</th><th>Abbreviation</th><th>Symbol</th><th>Founded</th><th>Candidates</th><th>Actions</th></tr></thead>
              <tbody>
                {parties?.map((p, i) => (
                  <tr key={p.id}>
                    <td className="text-slate-500">{i + 1}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                        <span className="font-medium text-white">{p.name}</span>
                      </div>
                    </td>
                    <td><span className="badge badge-blue">{p.abbreviation}</span></td>
                    <td>
                      {p.symbolUrl ? (
                        <img src={p.symbolUrl} alt={p.symbol} className="w-8 h-8 object-contain rounded" />
                      ) : (
                        <span className="text-slate-500 text-xs">{p.symbol || 'No symbol'}</span>
                      )}
                    </td>
                    <td>{p.foundedYear ?? '–'}</td>
                    <td>{p._count.candidates}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setUploadTarget(p)} className="p-1.5 text-slate-400 hover:text-amber-400" title="Upload Symbol"><Upload size={14} /></button>
                        <button onClick={() => openEdit(p)} className="p-1.5 text-slate-400 hover:text-blue-400"><Pencil size={14} /></button>
                        <button onClick={() => setDeleteTarget(p)} className="p-1.5 text-slate-400 hover:text-red-400"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(!parties || parties.length === 0) && (
            <EmptyState icon={<Flag size={28} />} title="No parties" description="Add political parties to get started" />
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditTarget(null); reset(); }} title={editTarget ? 'Edit Party' : 'Add Political Party'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div><label className="label">Party Name *</label><input {...register('name', { required: 'Required' })} className="input" placeholder="National Democratic Alliance" />{errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>}</div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Abbreviation *</label><input {...register('abbreviation', { required: 'Required' })} className="input" placeholder="NDA" />{errors.abbreviation && <p className="mt-1 text-xs text-red-400">{errors.abbreviation.message}</p>}</div>
            <div><label className="label">Symbol Name</label><input {...register('symbol')} className="input" placeholder="Lotus" />{errors.symbol && <p className="mt-1 text-xs text-red-400">{errors.symbol.message}</p>}</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Color</label><input {...register('color')} type="color" className="input h-11 p-1 cursor-pointer" defaultValue="#1a73e8" />{errors.color && <p className="mt-1 text-xs text-red-400">{errors.color.message}</p>}</div>
            <div><label className="label">Founded Year</label><input {...register('foundedYear', { valueAsNumber: true })} type="number" className="input" placeholder="2000" />{errors.foundedYear && <p className="mt-1 text-xs text-red-400">{errors.foundedYear.message}</p>}</div>
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" className="btn-secondary" onClick={() => { setModalOpen(false); reset(); }}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={creating || updating}>
              {creating || updating ? <Spinner size={16} /> : null} {editTarget ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Symbol Upload Modal */}
      <Modal open={!!uploadTarget} onClose={() => setUploadTarget(null)} title={`Upload Symbol – ${uploadTarget?.name}`} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-400">Select an image file (PNG, SVG, or WebP recommended)</p>
          <input type="file" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) handleSymbolUpload(e.target.files[0]); }}
            className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-600 file:text-white file:cursor-pointer hover:file:bg-primary-700" />
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && deleteParty(deleteTarget.id)}
        title="Delete Party" message={`Delete "${deleteTarget?.name}"? Candidates linked to this party will become independent.`} confirmText="Delete" loading={deleting} />
    </div>
  );
};
