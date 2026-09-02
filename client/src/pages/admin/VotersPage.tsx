import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Plus, Trash2, Users, Search, Filter, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { useAsync, useMutation } from '../../hooks/useAsync';
import {
  voterService,
  constituencyService,
  pollingStationService,
} from '../../services/api.service';
import {
  Modal,
  ConfirmDialog,
  TableSkeleton,
  EmptyState,
  Spinner,
  Pagination,
} from '../../components/ui';
import { normaliseValidationErrors } from '../../lib/validationErrors';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Voter {
  id: number;
  fullName: string;
  voterId: string;
  gender: string;
  hasVoted: boolean;
  serialNumber: number;
  dateOfBirth: string;
  pollingStation: { id: number; name: string };
  constituency: { id: number; name: string };
}

interface ConstituencyOption {
  id: number;
  name: string;
}

interface StationOption {
  id: number;
  name: string;
  constituencyId?: number;
}

// ── Client-side validation schema ──────────────────────────────────────────────
// Mirrors the server-side createVoterSchema with human-readable messages.

const voterFormSchema = z.object({
  fullName: z
    .string({ required_error: 'Full name is required.' })
    .min(2, 'Full name must be at least 2 characters.')
    .max(150, 'Full name must be at most 150 characters.'),

  voterId: z
    .string({ required_error: 'Voter ID is required.' })
    .min(5, 'Voter ID must be at least 5 characters.')
    .max(50, 'Voter ID must be at most 50 characters.'),

  constituencyId: z
    .number({ required_error: 'Please select a constituency.', invalid_type_error: 'Please select a constituency.' })
    .int()
    .positive('Please select a constituency.'),

  pollingStationId: z
    .number({ required_error: 'Please select a polling station.', invalid_type_error: 'Please select a polling station.' })
    .int()
    .positive('Please select a polling station.'),

  gender: z.enum(['Male', 'Female', 'Other'], {
    errorMap: () => ({ message: 'Please select a gender.' }),
  }),

  dateOfBirth: z
    .string({ required_error: 'Date of birth is required.' })
    .min(1, 'Date of birth is required.')
    .refine((val) => {
      const d = new Date(val);
      if (isNaN(d.getTime())) return false;
      const today = new Date();
      const age = today.getFullYear() - d.getFullYear();
      return age >= 18 && d < today;
    }, 'Voter must be at least 18 years old and the date must be in the past.'),

  aadhaarNumber: z
    .string()
    .regex(/^\d{12}$/, 'Aadhaar number must contain exactly 12 digits.')
    .optional()
    .or(z.literal('')),

  phone: z
    .string()
    .regex(/^[+\d\s\-()]{7,20}$/, 'Please enter a valid phone number.')
    .optional()
    .or(z.literal('')),

  address: z
    .string({ required_error: 'Address is required.' })
    .min(5, 'Address must be at least 5 characters.'),

  serialNumber: z
    .number({
      required_error: 'Serial number is required.',
      invalid_type_error: 'Serial number must be a positive number.',
    })
    .int('Serial number must be a whole number.')
    .positive('Serial number must be a positive number.'),
});

type VoterFormData = z.infer<typeof voterFormSchema>;

// ── Small reusable sub-components ──────────────────────────────────────────────

/** Renders the red error text below an invalid field */
const FieldError: React.FC<{ id: string; message?: string }> = ({ id, message }) => {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="field-error-message">
      <AlertCircle size={12} className="flex-shrink-0 mt-px" />
      {message}
    </p>
  );
};

// ── Main Page Component ────────────────────────────────────────────────────────

export const VotersPage: React.FC = () => {
  // ── List state
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Voter | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStation, setFilterStation] = useState('');
  const [hasVotedFilter, setHasVotedFilter] = useState('');
  const limit = 20;

  // ── Ref to scroll/focus the first error field inside the modal
  const firstErrorRef = useRef<HTMLElement | null>(null);

  // ── Data fetching
  const fetchVoters = useCallback(
    () =>
      voterService.getAll({
        page,
        limit,
        search: search || undefined,
        pollingStationId: filterStation || undefined,
        hasVoted: hasVotedFilter !== '' ? hasVotedFilter : undefined,
      }),
    [page, limit, search, filterStation, hasVotedFilter],
  );
  const { data: votersRes, loading, execute: refetch } = useAsync(fetchVoters);
  const voters: Voter[] = votersRes?.data ?? [];
  const total: number = votersRes?.meta?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const fetchConstituencies = useCallback(() => constituencyService.getAll(), []);
  const { data: constituencies } = useAsync(fetchConstituencies);
  const constituencyList: ConstituencyOption[] = (constituencies as ConstituencyOption[]) ?? [];

  const fetchStations = useCallback(() => pollingStationService.getAll(), []);
  const { data: stations } = useAsync(fetchStations);
  const allStations: StationOption[] = (stations as StationOption[]) ?? [];

  // ── Form setup (with Zod resolver for rich client-side validation)
  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<VoterFormData>({
    resolver: zodResolver(voterFormSchema),
    mode: 'onTouched', // validate after the user leaves a field
  });

  // Watch constituency to filter polling stations dynamically
  const watchedConstituencyId = watch('constituencyId');

  const filteredStations = watchedConstituencyId
    ? allStations.filter(
        (s) =>
          !s.constituencyId ||
          s.constituencyId === Number(watchedConstituencyId),
      )
    : allStations;

  // ── Compute ordered list of error messages for the summary banner
  const errorFields: { field: keyof VoterFormData; label: string }[] = [
    { field: 'fullName', label: 'Full name' },
    { field: 'voterId', label: 'Voter ID' },
    { field: 'constituencyId', label: 'Constituency' },
    { field: 'pollingStationId', label: 'Polling station' },
    { field: 'gender', label: 'Gender' },
    { field: 'dateOfBirth', label: 'Date of birth' },
    { field: 'aadhaarNumber', label: 'Aadhaar' },
    { field: 'phone', label: 'Phone' },
    { field: 'address', label: 'Address' },
    { field: 'serialNumber', label: 'Serial number' },
  ];

  const activeErrors = errorFields.filter((f) => errors[f.field]);

  // ── Handle server-side errors returned by the API
  const handleServerErrors = useCallback(
    (responseData: {
      message?: string;
      errors?: Array<{ field: string; message: string }>;
    }) => {
      const fieldErrors = normaliseValidationErrors(responseData);

      if (fieldErrors && Object.keys(fieldErrors).length > 0) {
        // Map each server field error → RHF setError()
        let isFirst = true;
        for (const [field, message] of Object.entries(fieldErrors)) {
          setError(field as keyof VoterFormData, { type: 'server', message });

          // Focus the first errored field after a tick (modal may still be animating)
          if (isFirst) {
            isFirst = false;
            setTimeout(() => {
              const el = document.getElementById(`voter-field-${field}`);
              if (el) {
                el.scrollIntoView({ block: 'center', behavior: 'smooth' });
                el.focus();
              }
            }, 80);
          }
        }

        const count = Object.keys(fieldErrors).length;
        toast.error(
          count === 1
            ? 'Validation failed — please correct the highlighted field.'
            : `Validation failed — please correct ${count} highlighted fields.`,
        );
      } else {
        // No field-specific errors — show a generic toast
        toast.error(responseData.message ?? 'Validation failed. Please try again.');
      }
    },
    [setError],
  );

  // ── Focus first invalid field after RHF client-side validation fails
  const focusFirstError = useCallback(
    (errs: typeof errors) => {
      for (const { field } of errorFields) {
        if (errs[field]) {
          const el = document.getElementById(`voter-field-${field}`);
          if (el) {
            el.scrollIntoView({ block: 'center', behavior: 'smooth' });
            el.focus();
          }
          return;
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ── Mutation
  const { mutate: createVoter, loading: creating } = useMutation(
    (data: object) => voterService.create(data),
    {
      onSuccess: () => {
        refetch();
        setModalOpen(false);
        reset();
        toast.success('Voter registered successfully.');
      },
      onServerErrors: handleServerErrors,
    },
  );

  const { mutate: deleteVoter, loading: deleting } = useMutation(
    (id: number) => voterService.delete(id),
    {
      onSuccess: () => {
        refetch();
        setDeleteTarget(null);
      },
      successMessage: 'Voter removed',
    },
  );

  // ── Submit handler
  const onSubmit = (data: VoterFormData) => {
    const payload = {
      ...data,
      constituencyId: Number(data.constituencyId),
      pollingStationId: Number(data.pollingStationId),
      serialNumber: Number(data.serialNumber),
      dateOfBirth: new Date(data.dateOfBirth).toISOString(),
      // Normalise optional empty-string fields to undefined so Zod is happy
      aadhaarNumber: data.aadhaarNumber || undefined,
      phone: data.phone || undefined,
    };
    createVoter(payload);
  };

  // ── Close + reset modal
  const handleCloseModal = () => {
    setModalOpen(false);
    reset();
    firstErrorRef.current = null;
  };

  // ── Register helper — attaches id, aria-invalid, aria-describedby
  const field = (
    name: keyof VoterFormData,
    extra?: React.InputHTMLAttributes<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => ({
    id: `voter-field-${name}`,
    'aria-invalid': !!errors[name],
    'aria-describedby': errors[name] ? `voter-error-${name}` : undefined,
    className: `input ${errors[name] ? 'input-error' : ''}`,
    ...extra,
  });

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Voters</h1>
          <p className="page-subtitle">{total.toLocaleString()} registered voters</p>
        </div>
        <button
          onClick={() => {
            reset();
            setModalOpen(true);
          }}
          className="btn-primary"
          id="register-voter-btn"
        >
          <Plus size={16} /> Register Voter
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or voter ID..."
            className="input pl-9"
            onKeyDown={(e) => e.key === 'Enter' && refetch()}
          />
        </div>
        <select
          className="input w-48"
          value={filterStation}
          onChange={(e) => setFilterStation(e.target.value)}
        >
          <option value="">All Stations</option>
          {allStations.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          className="input w-40"
          value={hasVotedFilter}
          onChange={(e) => setHasVotedFilter(e.target.value)}
        >
          <option value="">All Voters</option>
          <option value="false">Not Voted</option>
          <option value="true">Voted</option>
        </select>
        <button onClick={() => refetch()} className="btn-primary">
          <Filter size={14} /> Filter
        </button>
      </div>

      {/* ── Voter table ── */}
      {loading ? (
        <TableSkeleton rows={10} cols={7} />
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Full Name</th>
                    <th>Voter ID</th>
                    <th>Gender</th>
                    <th>Station</th>
                    <th>Voted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {voters.map((v) => (
                    <tr key={v.id}>
                      <td className="text-slate-500">{v.serialNumber}</td>
                      <td className="font-medium text-white">{v.fullName}</td>
                      <td className="font-mono text-xs text-slate-300">{v.voterId}</td>
                      <td>
                        <span
                          className={`badge ${
                            v.gender === 'Female'
                              ? 'badge-purple'
                              : v.gender === 'Male'
                              ? 'badge-blue'
                              : 'badge-gray'
                          }`}
                        >
                          {v.gender}
                        </span>
                      </td>
                      <td className="text-xs text-slate-400">{v.pollingStation?.name}</td>
                      <td>
                        <span className={`badge ${v.hasVoted ? 'badge-green' : 'badge-gray'}`}>
                          {v.hasVoted ? 'Voted' : 'Pending'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setDeleteTarget(v)}
                            className="p-1.5 text-slate-400 hover:text-red-400"
                            disabled={v.hasVoted}
                            aria-label={`Remove ${v.fullName}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {voters.length === 0 && (
              <EmptyState
                icon={<Users size={28} />}
                title="No voters found"
                description="Register voters or adjust your filters"
              />
            )}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {/* ── Register Voter Modal ── */}
      <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        title="Register New Voter"
        size="lg"
      >
        <form
          onSubmit={handleSubmit(onSubmit, focusFirstError)}
          className="space-y-4"
          noValidate
          aria-label="Register new voter form"
        >
          {/* ── Error summary banner ── */}
          {activeErrors.length > 1 && (
            <div className="error-summary" role="alert" aria-live="polite">
              <p className="font-semibold">
                Please correct the following {activeErrors.length} errors:
              </p>
              <ul>
                {activeErrors.map(({ field: f, label }) => (
                  <li key={f}>
                    <button
                      type="button"
                      className="underline underline-offset-2 hover:text-red-200 text-left"
                      onClick={() => {
                        const el = document.getElementById(`voter-field-${f}`);
                        el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
                        el?.focus();
                      }}
                    >
                      {label}: {errors[f]?.message}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Row 1: Full Name + Voter ID ── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="voter-field-fullName" className="label">
                Full Name <span className="text-red-400">*</span>
              </label>
              <input
                {...register('fullName')}
                {...field('fullName', { placeholder: 'e.g. Yogananda Reddy' })}
              />
              <FieldError id="voter-error-fullName" message={errors.fullName?.message} />
            </div>

            <div>
              <label htmlFor="voter-field-voterId" className="label">
                Voter ID <span className="text-red-400">*</span>
              </label>
              <input
                {...register('voterId')}
                {...field('voterId', { placeholder: 'DL/01/001/0001' })}
              />
              <FieldError id="voter-error-voterId" message={errors.voterId?.message} />
            </div>
          </div>

          {/* ── Row 2: Constituency + Polling Station ── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="voter-field-constituencyId" className="label">
                Constituency <span className="text-red-400">*</span>
              </label>
              <select
                {...register('constituencyId', { valueAsNumber: true })}
                id="voter-field-constituencyId"
                aria-invalid={!!errors.constituencyId}
                aria-describedby={errors.constituencyId ? 'voter-error-constituencyId' : undefined}
                className={`input ${errors.constituencyId ? 'input-error' : ''}`}
              >
                <option value="">Select Constituency...</option>
                {constituencyList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <FieldError
                id="voter-error-constituencyId"
                message={errors.constituencyId?.message}
              />
            </div>

            <div>
              <label htmlFor="voter-field-pollingStationId" className="label">
                Polling Station <span className="text-red-400">*</span>
              </label>
              <select
                {...register('pollingStationId', { valueAsNumber: true })}
                id="voter-field-pollingStationId"
                aria-invalid={!!errors.pollingStationId}
                aria-describedby={
                  errors.pollingStationId ? 'voter-error-pollingStationId' : undefined
                }
                className={`input ${errors.pollingStationId ? 'input-error' : ''}`}
              >
                <option value="">Select Polling Station...</option>
                {filteredStations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <FieldError
                id="voter-error-pollingStationId"
                message={errors.pollingStationId?.message}
              />
            </div>
          </div>

          {/* ── Row 3: Gender + Date of Birth ── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="voter-field-gender" className="label">
                Gender <span className="text-red-400">*</span>
              </label>
              <select
                {...register('gender')}
                id="voter-field-gender"
                aria-invalid={!!errors.gender}
                aria-describedby={errors.gender ? 'voter-error-gender' : undefined}
                className={`input ${errors.gender ? 'input-error' : ''}`}
              >
                <option value="">Select Gender...</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              <FieldError id="voter-error-gender" message={errors.gender?.message} />
            </div>

            <div>
              <label htmlFor="voter-field-dateOfBirth" className="label">
                Date of Birth <span className="text-red-400">*</span>
              </label>
              <input
                {...register('dateOfBirth')}
                {...field('dateOfBirth', { type: 'date' })}
              />
              <FieldError
                id="voter-error-dateOfBirth"
                message={errors.dateOfBirth?.message}
              />
            </div>
          </div>

          {/* ── Row 4: Aadhaar + Phone ── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="voter-field-aadhaarNumber" className="label">
                Aadhaar Number{' '}
                <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              <input
                {...register('aadhaarNumber')}
                {...field('aadhaarNumber', {
                  placeholder: '123456789012',
                  maxLength: 12,
                  inputMode: 'numeric',
                  pattern: '[0-9]*',
                  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
                    // Allow: backspace, delete, tab, escape, enter, arrow keys, home, end
                    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
                    // Allow: Ctrl+A/C/V/X/Z
                    if (allowedKeys.includes(e.key) || (e.ctrlKey && ['a', 'c', 'v', 'x', 'z'].includes(e.key.toLowerCase()))) return;
                    // Block non-digit keys
                    if (!/^\d$/.test(e.key)) e.preventDefault();
                  },
                })}
              />
              <FieldError
                id="voter-error-aadhaarNumber"
                message={errors.aadhaarNumber?.message}
              />
            </div>

            <div>
              <label htmlFor="voter-field-phone" className="label">
                Phone{' '}
                <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              <input
                {...register('phone')}
                {...field('phone', { placeholder: '+91-9000000000' })}
              />
              <FieldError id="voter-error-phone" message={errors.phone?.message} />
            </div>
          </div>

          {/* ── Row 5: Address ── */}
          <div>
            <label htmlFor="voter-field-address" className="label">
              Address <span className="text-red-400">*</span>
            </label>
            <textarea
              {...register('address')}
              id="voter-field-address"
              aria-invalid={!!errors.address}
              aria-describedby={errors.address ? 'voter-error-address' : undefined}
              className={`input min-h-[60px] resize-none ${errors.address ? 'input-error' : ''}`}
              placeholder="Full residential address"
            />
            <FieldError id="voter-error-address" message={errors.address?.message} />
          </div>

          {/* ── Row 6: Serial Number ── */}
          <div>
            <label htmlFor="voter-field-serialNumber" className="label">
              Serial Number <span className="text-red-400">*</span>
            </label>
            <input
              {...register('serialNumber', { valueAsNumber: true })}
              {...field('serialNumber', { type: 'number', min: 1 })}
              className={`input w-32 ${errors.serialNumber ? 'input-error' : ''}`}
            />
            <FieldError
              id="voter-error-serialNumber"
              message={errors.serialNumber?.message}
            />
          </div>

          {/* ── Actions ── */}
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleCloseModal}
              disabled={creating || isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={creating || isSubmitting}
              aria-busy={creating || isSubmitting}
            >
              {creating || isSubmitting ? <Spinner size={16} /> : null}
              {creating ? 'Registering…' : 'Register Voter'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Delete confirmation ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteVoter(deleteTarget.id)}
        title="Remove Voter"
        message={`Remove "${deleteTarget?.fullName}" from the voters list?`}
        confirmText="Remove"
        loading={deleting}
      />
    </div>
  );
};
