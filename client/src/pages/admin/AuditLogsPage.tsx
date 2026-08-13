import React, { useState, useCallback } from 'react';
import { ClipboardList, Filter } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { auditService } from '../../services/api.service';
import { TableSkeleton, EmptyState, Pagination, StatusBadge } from '../../components/ui';

const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'badge-green', LOGOUT: 'badge-gray', CREATE: 'badge-blue',
  UPDATE: 'badge-yellow', DELETE: 'badge-red', VOTE_CAST: 'badge-purple',
  PUBLISH_RESULTS: 'badge-purple', LOCK_MACHINE: 'badge-red',
};

export const AuditLogsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const limit = 50;

  const fetchLogs = useCallback(
    () => auditService.getAll({ page, limit, action: actionFilter || undefined }),
    [page, limit, actionFilter],
  );
  const { data: logsRes, loading } = useAsync(fetchLogs);
  const logs = logsRes?.data ?? [];
  const total = logsRes?.meta?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const ACTIONS = ['LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'VOTE_CAST', 'VERIFY_VOTER', 'LOCK_MACHINE', 'PAUSE_POLLING', 'CLOSE_POLLING', 'PUBLISH_RESULTS'];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-subtitle">{total.toLocaleString()} total events logged</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex gap-3 items-center flex-wrap">
        <select className="input w-48" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
          <option value="">All Actions</option>
          {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {loading ? <TableSkeleton rows={10} cols={5} /> : (
        <>
          <div className="card overflow-hidden">
            <div className="table-wrapper">
              <table className="table">
                <thead><tr><th>Timestamp</th><th>Action</th><th>Module</th><th>User</th><th>Description</th><th>IP</th></tr></thead>
                <tbody>
                  {logs.map((log: { id: number; createdAt: string; action: string; module: string; description: string; ipAddress?: string; user?: { email: string } }) => (
                    <tr key={log.id}>
                      <td className="text-xs text-slate-500 whitespace-nowrap">{new Date(log.createdAt).toLocaleString('en-IN')}</td>
                      <td><span className={`badge ${ACTION_COLORS[log.action] ?? 'badge-gray'}`}>{log.action}</span></td>
                      <td className="text-xs text-slate-300">{log.module}</td>
                      <td className="text-xs text-slate-400">{log.user?.email ?? 'System'}</td>
                      <td className="text-xs text-slate-300 max-w-xs truncate">{log.description}</td>
                      <td className="text-xs text-slate-500 font-mono">{log.ipAddress ?? '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {logs.length === 0 && (
              <EmptyState icon={<ClipboardList size={28} />} title="No audit logs" description="Audit events will appear here as users perform actions" />
            )}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
};
