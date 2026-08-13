import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';

// ── Modal ─────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, size = 'md' }) => {
  const maxWidths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            className={`card w-full ${maxWidths[size]} p-6 max-h-[90vh] overflow-y-auto`}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{title}</h2>
              <button onClick={onClose} className="btn-ghost p-2 rounded-lg">
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ── Confirm Dialog ────────────────────────────────────────────────

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open, onClose, onConfirm, title, message,
  confirmText = 'Confirm', variant = 'danger', loading,
}) => {
  const icons = { danger: <AlertTriangle className="text-red-400" size={24} />, warning: <AlertTriangle className="text-amber-400" size={24} />, info: <Info className="text-blue-400" size={24} /> };
  const btnClass = { danger: 'btn-danger', warning: 'bg-amber-600 hover:bg-amber-700 text-white btn-primary', info: 'btn-primary' };

  return (
    <Modal open={open} onClose={onClose} title="" size="sm">
      <div className="text-center">
        <div className="flex justify-center mb-4">{icons[variant]}</div>
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-slate-400 mb-6">{message}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={onClose} className="btn-secondary" disabled={loading}>Cancel</button>
          <button onClick={onConfirm} className={btnClass[variant]} disabled={loading}>
            {loading ? 'Please wait...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ── Loading Skeleton ──────────────────────────────────────────────

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-700/50 rounded-lg ${className}`} />
);

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 5 }) => (
  <div className="table-wrapper">
    <table className="table">
      <thead>
        <tr>
          {Array.from({ length: cols }).map((_, i) => (
            <th key={i}><Skeleton className="h-4 w-20" /></th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, r) => (
          <tr key={r}>
            {Array.from({ length: cols }).map((_, c) => (
              <td key={c}><Skeleton className="h-4 w-full" /></td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ── Empty State ───────────────────────────────────────────────────

export const EmptyState: React.FC<{ icon: React.ReactNode; title: string; description: string; action?: React.ReactNode }> = ({
  icon, title, description, action,
}) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center mb-4 text-slate-500">{icon}</div>
    <h3 className="text-lg font-semibold text-slate-300 mb-2">{title}</h3>
    <p className="text-slate-500 mb-6 max-w-sm">{description}</p>
    {action}
  </div>
);

// ── Status Badge ──────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'badge-gray' },
  SCHEDULED: { label: 'Scheduled', className: 'badge-blue' },
  ACTIVE: { label: 'Active', className: 'badge-green' },
  PAUSED: { label: 'Paused', className: 'badge-yellow' },
  CLOSED: { label: 'Closed', className: 'badge-red' },
  RESULTS_PUBLISHED: { label: 'Published', className: 'badge-purple' },
  IDLE: { label: 'Idle', className: 'badge-gray' },
  LOCKED: { label: 'Locked', className: 'badge-red' },
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config = statusConfig[status] ?? { label: status, className: 'badge-gray' };
  return <span className={`badge ${config.className}`}>{config.label}</span>;
};

// ── Stat Card ─────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
  change?: string;
  changeDir?: 'up' | 'down' | 'neutral';
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, iconBg, change, changeDir }) => (
  <motion.div
    className="stat-card"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <div className={`stat-icon ${iconBg}`}>{icon}</div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">{title}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {change && (
        <p className={`text-xs mt-1 ${changeDir === 'up' ? 'text-emerald-400' : changeDir === 'down' ? 'text-red-400' : 'text-slate-400'}`}>
          {change}
        </p>
      )}
    </div>
  </motion.div>
);

// ── Spinner ───────────────────────────────────────────────────────

export const Spinner: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <svg
    className={`animate-spin text-primary-400 ${className}`}
    width={size} height={size}
    viewBox="0 0 24 24" fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

// ── Pagination ────────────────────────────────────────────────────

interface PaginationProps { page: number; totalPages: number; onPageChange: (p: number) => void; }

export const Pagination: React.FC<PaginationProps> = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => onPageChange(page - 1)} disabled={page === 1}>← Prev</button>
      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
        const p = Math.max(1, Math.min(page - 2 + i, totalPages - 4 + i));
        return (
          <button key={p} onClick={() => onPageChange(p)}
            className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${p === page ? 'bg-primary-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>
            {p}
          </button>
        );
      })}
      <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => onPageChange(page + 1)} disabled={page === totalPages}>Next →</button>
    </div>
  );
};
