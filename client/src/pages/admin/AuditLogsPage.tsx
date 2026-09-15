import React, { useState, useCallback } from 'react';
import { ClipboardList, Download, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { auditService, reportService } from '../../services/api.service';
import { TableSkeleton, EmptyState, Pagination } from '../../components/ui';
import { toast } from 'react-hot-toast';

const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'badge-green', LOGOUT: 'badge-gray', CREATE: 'badge-blue',
  UPDATE: 'badge-yellow', DELETE: 'badge-red', VOTE_CAST: 'badge-purple',
  PUBLISH_RESULTS: 'badge-purple', LOCK_MACHINE: 'badge-red',
  PAUSE_POLLING: 'badge-yellow', UNLOCK_MACHINE: 'badge-green',
  CLOSE_POLLING: 'badge-gray', VERIFY_VOTER: 'badge-blue', EXPORT: 'badge-blue',
};

const ACTIONS = [
  'LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'VOTE_CAST',
  'VERIFY_VOTER', 'LOCK_MACHINE', 'UNLOCK_MACHINE', 'PAUSE_POLLING',
  'CLOSE_POLLING', 'PUBLISH_RESULTS', 'EXPORT',
];

export const AuditLogsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const limit = 50;

  const fetchLogs = useCallback(
    () => auditService.getAll({
      page, limit,
      action: actionFilter || undefined,
      module: moduleFilter || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
    [page, limit, actionFilter, moduleFilter, startDate, endDate],
  );
  const { data: logsRes, loading } = useAsync(fetchLogs, true, [fetchLogs]);
  const logs = logsRes?.data ?? [];
  const total = logsRes?.meta?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      await reportService.downloadAuditLogPDF({ startDate: startDate || undefined, endDate: endDate || undefined });
      toast.success('Audit log PDF downloaded');
    } catch {
      toast.error('Failed to generate audit log PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleClearFilters = () => {
    setActionFilter('');
    setModuleFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const hasFilters = actionFilter || moduleFilter || startDate || endDate;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ClipboardList size={22} className="text-primary-400" /> Audit Logs
          </h1>
          <p className="page-subtitle">{total.toLocaleString()} events {hasFilters ? '(filtered)' : 'total'}</p>
        </div>
        <button
          onClick={handleDownloadPdf}
          disabled={downloadingPdf}
          className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
        >
          <Download size={13} />
          {downloadingPdf ? 'Generating…' : 'Export PDF'}
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Action filter */}
          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Action</label>
            <select className="input py-2 text-xs" value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}>
              <option value="">All Actions</option>
              {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {/* Module filter */}
          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Module</label>
            <div className="relative">
              <input
                value={moduleFilter}
                onChange={(e) => { setModuleFilter(e.target.value); setPage(1); }}
                placeholder="e.g. ELECTION, VOTER…"
                className="input py-2 text-xs pl-8 w-full"
              />
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>
          </div>

          {/* Date range */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">From Date</label>
            <input type="date" className="input py-2 text-xs" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">To Date</label>
            <input type="date" className="input py-2 text-xs" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} />
          </div>

          {hasFilters && (
            <button onClick={handleClearFilters} className="text-xs text-slate-400 hover:text-slate-200 transition-colors py-2 px-2 mt-auto underline">
              Clear filters
            </button>
          )}
        </div>
      </div>

      {loading ? <TableSkeleton rows={10} cols={6} /> : (
        <>
          <div className="card overflow-hidden">
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Module</th>
                    <th>User</th>
                    <th>Description</th>
                    <th>IP</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log: {
                    id: number; createdAt: string; action: string; module: string;
                    description: string; ipAddress?: string; metadata?: unknown;
                    user?: { email: string }
                  }) => (
                    <React.Fragment key={log.id}>
                      <tr className={expandedRow === log.id ? 'bg-slate-800/50' : ''}>
                        <td className="text-xs text-slate-500 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString('en-IN')}
                        </td>
                        <td><span className={`badge ${ACTION_COLORS[log.action] ?? 'badge-gray'}`}>{log.action}</span></td>
                        <td className="text-xs text-slate-300">{log.module}</td>
                        <td className="text-xs text-slate-400">{log.user?.email ?? 'System'}</td>
                        <td className="text-xs text-slate-300 max-w-xs truncate">{log.description}</td>
                        <td className="text-xs text-slate-500 font-mono">{log.ipAddress ?? '–'}</td>
                        <td>
                          {log.metadata && (
                            <button
                              onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                              className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition-colors"
                            >
                              {expandedRow === log.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          )}
                        </td>
                      </tr>
                      {/* Expanded metadata row */}
                      {expandedRow === log.id && (
                        <tr>
                          <td colSpan={7} className="px-6 py-3 bg-slate-900/50">
                            <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1">Full Description</p>
                            <p className="text-xs text-slate-300 mb-2">{log.description}</p>
                            {log.metadata && (
                              <>
                                <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1">Metadata</p>
                                <pre className="text-[10px] font-mono text-slate-400 bg-slate-800 rounded-lg p-3 overflow-x-auto">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            {logs.length === 0 && (
              <EmptyState icon={<ClipboardList size={28} />} title="No audit logs" description="No events match the current filters" />
            )}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
};

