import React, { useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, UserCog, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAsync, useMutation } from '../../hooks/useAsync';
import { officerService, pollingStationService } from '../../services/api.service';
import { Modal, ConfirmDialog, TableSkeleton, EmptyState, Spinner } from '../../components/ui';
import { normaliseValidationErrors } from '../../lib/validationErrors';
import { toast } from 'react-hot-toast';

interface Officer {
  id: number;
  fullName: string;
  employeeId: string;
  phone: string;
  pollingStationId?: number;
  user: { id: number; email: string; isActive: boolean; lastLoginAt?: string };
  pollingStation?: { id: number; name: string; code: string };
}

type OfficerForm = {
  email: string;
  password: string;
  fullName: string;
  employeeId: string;
  phone: string;
  pollingStationId?: number;
};

export const OfficersPage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Officer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Officer | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const fetchOfficers = useCallback(() => officerService.getAll(), []);
  const { data: officers, loading, execute: refetch } = useAsync<Officer[]>(fetchOfficers);

  const fetchStations = useCallback(() => pollingStationService.getAll(), []);
  const { data: stations } = useAsync(fetchStations);

  const { register, handleSubmit, reset, setValue, setError, formState: { errors } } = useForm<OfficerForm>({
    shouldFocusError: true,
  });

  const focusFirstField = (fields: string[]) => {
    for (const f of fields) {
      const el = document.getElementById(`of-${f.toLowerCase()}`) || document.querySelector(`[name="${f}"]`);
      if (el instanceof HTMLElement) {
        el.focus();
        break;
      }
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditTarget(null);
    setGeneralError(null);
    reset();
  };

  const { mutate: createOfficer, loading: creating } = useMutation(
    (data: object) => officerService.create(data),
    {
      onSuccess: () => {
        refetch();
        closeModal();
      },
      successMessage: 'Officer registered successfully.',
      onServerErrors: (data) => {
        const fieldErrors = normaliseValidationErrors(data);
        if (fieldErrors) {
          const fieldKeys: string[] = [];
          Object.entries(fieldErrors).forEach(([field, message]) => {
            if (field === '_form' || field === 'root') {
              setGeneralError(message);
            } else if (['fullName', 'employeeId', 'phone', 'email', 'password', 'pollingStationId'].includes(field)) {
              setError(field as keyof OfficerForm, { message });
              fieldKeys.push(field);
            } else {
              setGeneralError(message);
            }
          });
          if (fieldKeys.length > 0) {
            focusFirstField(fieldKeys);
          }
        } else {
          setGeneralError(data.message || 'Failed to register officer.');
          toast.error(data.message || 'Failed to register officer.');
        }
      },
      onError: (msg) => {
        setGeneralError(msg);
      },
    },
  );

  const { mutate: updateOfficer, loading: updating } = useMutation(
    ({ id, data }: { id: number; data: object }) => officerService.update(id, data),
    {
      onSuccess: () => {
        refetch();
        closeModal();
      },
      successMessage: 'Officer updated successfully.',
      onServerErrors: (data) => {
        const fieldErrors = normaliseValidationErrors(data);
        if (fieldErrors) {
          const fieldKeys: string[] = [];
          Object.entries(fieldErrors).forEach(([field, message]) => {
            if (field === '_form' || field === 'root') {
              setGeneralError(message);
            } else if (['fullName', 'employeeId', 'phone', 'pollingStationId'].includes(field)) {
              setError(field as keyof OfficerForm, { message });
              fieldKeys.push(field);
            } else {
              setGeneralError(message);
            }
          });
          if (fieldKeys.length > 0) {
            focusFirstField(fieldKeys);
          }
        } else {
          setGeneralError(data.message || 'Failed to update officer.');
          toast.error(data.message || 'Failed to update officer.');
        }
      },
      onError: (msg) => {
        setGeneralError(msg);
      },
    },
  );

  const { mutate: deleteOfficer, loading: deleting } = useMutation(
    (id: number) => officerService.delete(id),
    { onSuccess: () => { refetch(); setDeleteTarget(null); }, successMessage: 'Officer removed' },
  );

  const openEdit = (o: Officer) => {
    setEditTarget(o);
    setGeneralError(null);
    setValue('fullName', o.fullName);
    setValue('employeeId', o.employeeId);
    setValue('phone', o.phone);
    setValue('pollingStationId', o.pollingStationId);
    setModalOpen(true);
  };

  const onInvalid = (invalidErrors: Record<string, unknown>) => {
    setGeneralError('Please correct the highlighted fields before submitting.');
    focusFirstField(Object.keys(invalidErrors));
  };

  const onSubmit = (data: object) => {
    setGeneralError(null);
    const payload = {
      ...data,
      pollingStationId: (data as { pollingStationId?: string }).pollingStationId
        ? Number((data as { pollingStationId: string }).pollingStationId)
        : null,
    };
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
        <button
          onClick={() => {
            reset();
            setEditTarget(null);
            setGeneralError(null);
            setModalOpen(true);
          }}
          className="btn-primary"
        >
          <Plus size={16} /> Register Officer
        </button>
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : (
        <div className="card overflow-hidden">
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Employee ID</th>
                  <th>Email</th>
                  <th>Polling Station</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {officers?.map((o, i) => (
                  <tr key={o.id}>
                    <td className="text-slate-500">{i + 1}</td>
                    <td className="font-medium text-white">{o.fullName}</td>
                    <td className="font-mono text-xs text-slate-300">{o.employeeId}</td>
                    <td className="text-xs text-slate-400">{o.user.email}</td>
                    <td className="text-xs text-slate-400">{o.pollingStation?.name ?? '–'}</td>
                    <td className="text-xs text-slate-500">
                      {o.user.lastLoginAt ? new Date(o.user.lastLoginAt).toLocaleDateString('en-IN') : 'Never'}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(o)} className="p-1.5 text-slate-400 hover:text-blue-400">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setDeleteTarget(o)} className="p-1.5 text-slate-400 hover:text-red-400">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(!officers || officers.length === 0) && (
            <EmptyState
              icon={<UserCog size={28} />}
              title="No officers"
              description="Register election officers to manage polling stations"
            />
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={closeModal} title={editTarget ? 'Edit Officer' : 'Register Election Officer'}>
        <form
          onSubmit={handleSubmit(onSubmit, onInvalid)}
          onChange={() => {
            if (generalError) setGeneralError(null);
          }}
          className="space-y-4"
          noValidate
        >
          {generalError && (
            <div
              className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-sm text-red-300"
              role="alert"
              aria-live="polite"
            >
              <AlertCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
              <span className="flex-1">{generalError}</span>
            </div>
          )}

          <div>
            <label className="label" htmlFor="of-name">
              Full Name *
            </label>
            <input
              id="of-name"
              {...register('fullName', {
                required: 'Full name is required.',
                minLength: { value: 2, message: 'Full name must be at least 2 characters.' },
                maxLength: { value: 150, message: 'Full name must be at most 150 characters.' },
              })}
              className={`input ${errors.fullName ? 'input-error' : ''}`}
              placeholder="e.g. Arjun Mehta"
              aria-invalid={!!errors.fullName}
              aria-describedby={errors.fullName ? 'of-name-error' : undefined}
            />
            {errors.fullName && (
              <p id="of-name-error" className="field-error-message" role="alert">
                <AlertCircle size={12} />
                {errors.fullName.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="of-empid">
                Employee ID *
              </label>
              <input
                id="of-empid"
                {...register('employeeId', {
                  required: 'Employee ID is required.',
                  minLength: { value: 3, message: 'Employee ID must be at least 3 characters.' },
                  maxLength: { value: 50, message: 'Employee ID must be at most 50 characters.' },
                })}
                className={`input ${errors.employeeId ? 'input-error' : ''}`}
                placeholder="EO-DL-001"
                aria-invalid={!!errors.employeeId}
                aria-describedby={errors.employeeId ? 'of-empid-error' : undefined}
              />
              {errors.employeeId && (
                <p id="of-empid-error" className="field-error-message" role="alert">
                  <AlertCircle size={12} />
                  {errors.employeeId.message}
                </p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="of-phone">
                Phone *
              </label>
              <input
                id="of-phone"
                {...register('phone', {
                  required: 'Phone number is required.',
                  minLength: { value: 10, message: 'Phone number must be at least 10 digits.' },
                  maxLength: { value: 20, message: 'Phone number must be at most 20 digits.' },
                })}
                className={`input ${errors.phone ? 'input-error' : ''}`}
                placeholder="+91-9000000000"
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? 'of-phone-error' : undefined}
              />
              {errors.phone && (
                <p id="of-phone-error" className="field-error-message" role="alert">
                  <AlertCircle size={12} />
                  {errors.phone.message}
                </p>
              )}
            </div>
          </div>

          {!editTarget && (
            <>
              <div>
                <label className="label" htmlFor="of-email">
                  Email *
                </label>
                <input
                  id="of-email"
                  {...register('email', {
                    required: 'Email address is required.',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Please enter a valid email address.',
                    },
                  })}
                  type="email"
                  className={`input ${errors.email ? 'input-error' : ''}`}
                  placeholder="officer@example.com"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'of-email-error' : undefined}
                />
                {errors.email && (
                  <p id="of-email-error" className="field-error-message" role="alert">
                    <AlertCircle size={12} />
                    {errors.email.message}
                  </p>
                )}
              </div>
              <div>
                <label className="label" htmlFor="of-password">
                  Password *
                </label>
                <input
                  id="of-password"
                  {...register('password', {
                    required: 'Password is required.',
                    minLength: { value: 8, message: 'Password must be at least 8 characters.' },
                  })}
                  type="password"
                  className={`input ${errors.password ? 'input-error' : ''}`}
                  placeholder="Min 8 characters"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'of-password-error' : undefined}
                />
                {errors.password && (
                  <p id="of-password-error" className="field-error-message" role="alert">
                    <AlertCircle size={12} />
                    {errors.password.message}
                  </p>
                )}
              </div>
            </>
          )}

          <div>
            <label className="label" htmlFor="of-station">
              Assign Polling Station
            </label>
            <select id="of-station" {...register('pollingStationId')} className="input">
              <option value="">Unassigned</option>
              {(stations as { id: number; name: string; code: string }[] || []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={creating || updating}>
              {creating || updating ? <Spinner size={16} /> : null} {editTarget ? 'Update' : 'Register'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteOfficer(deleteTarget.id)}
        title="Remove Officer"
        message={`Remove officer "${deleteTarget?.fullName}"? Their login access will be revoked.`}
        confirmText="Remove"
        loading={deleting}
      />
    </div>
  );
};
