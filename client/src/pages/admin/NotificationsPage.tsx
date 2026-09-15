import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, BellOff, CheckCheck, Trash2, Info, AlertTriangle,
  AlertCircle, CheckCircle, RefreshCw, Vote, Filter,
} from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { notificationService } from '../../services/api.service';
import { Spinner, EmptyState, Pagination } from '../../components/ui';
import { toast } from 'react-hot-toast';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  election?: { id: number; name: string } | null;
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  info:    <Info size={16} className="text-blue-400" />,
  warning: <AlertTriangle size={16} className="text-amber-400" />,
  error:   <AlertCircle size={16} className="text-red-400" />,
  success: <CheckCircle size={16} className="text-emerald-400" />,
};

const TYPE_BG: Record<string, string> = {
  info:    'bg-blue-500/10 border-blue-500/20',
  warning: 'bg-amber-500/10 border-amber-500/20',
  error:   'bg-red-500/10 border-red-500/20',
  success: 'bg-emerald-500/10 border-emerald-500/20',
};

export const NotificationsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [actionLoading, setActionLoading] = useState(false);
  const limit = 20;

  const fetchNotifications = useCallback(
    () => notificationService.getAll({
      page,
      limit,
      ...(filter === 'unread' ? { isRead: false } : filter === 'read' ? { isRead: true } : {}),
    }),
    [page, limit, filter],
  );

  const { data: res, loading, execute: refetch } = useAsync(fetchNotifications, true, [fetchNotifications]);
  const notifications: Notification[] = res?.data ?? [];
  const total: number = res?.meta?.total ?? 0;
  const totalPages = Math.ceil(total / limit);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkRead = async (id: number) => {
    try {
      await notificationService.markRead(id);
      refetch();
    } catch { toast.error('Failed to mark as read'); }
  };

  const handleMarkAllRead = async () => {
    setActionLoading(true);
    try {
      await notificationService.markAllRead();
      toast.success('All notifications marked as read');
      refetch();
    } catch { toast.error('Failed to mark all as read'); }
    finally { setActionLoading(false); }
  };

  const handleDelete = async (id: number) => {
    try {
      await notificationService.delete(id);
      toast.success('Notification deleted');
      refetch();
    } catch { toast.error('Failed to delete notification'); }
  };

  const handleClearRead = async () => {
    setActionLoading(true);
    try {
      await notificationService.clearRead();
      toast.success('Cleared all read notifications');
      refetch();
    } catch { toast.error('Failed to clear notifications'); }
    finally { setActionLoading(false); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Bell size={24} className="text-primary-400" />
            <span className="text-gradient">Notifications</span>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-primary-600 text-white text-xs font-bold animate-pulse">
                {unreadCount} unread
              </span>
            )}
          </h1>
          <p className="page-subtitle">{total} total notifications · System alerts and election events</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleMarkAllRead}
            disabled={actionLoading || filter === 'read'}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 disabled:opacity-40"
          >
            {actionLoading ? <Spinner size={13} /> : <CheckCheck size={13} />}
            Mark All Read
          </button>
          <button
            onClick={handleClearRead}
            disabled={actionLoading}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 text-red-400 hover:bg-red-500/10 border-red-500/20 disabled:opacity-40"
          >
            <Trash2 size={13} />
            Clear Read
          </button>
          <button
            onClick={() => refetch()}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-800/50 rounded-xl border border-slate-700/50 w-fit">
        {(['all', 'unread', 'read'] as const).map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
              filter === f
                ? 'bg-primary-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {f === 'unread' ? <BellOff size={11} className="inline mr-1" /> : null}
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card h-20 animate-pulse bg-slate-800/40" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<Bell size={32} className="text-slate-500" />}
          title="No notifications"
          description={filter === 'unread' ? 'You are all caught up!' : 'No notifications found for the selected filter.'}
        />
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-2">
            {notifications.map((n, i) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.03 }}
                className={`card p-4 border flex items-start gap-4 transition-all ${
                  !n.isRead
                    ? `${TYPE_BG[n.type] ?? TYPE_BG.info} ring-1 ring-inset ring-primary-500/10`
                    : 'border-slate-700/40 bg-slate-800/30 opacity-70'
                }`}
              >
                {/* Type icon */}
                <div className="mt-0.5 flex-shrink-0">
                  {TYPE_ICON[n.type] ?? TYPE_ICON.info}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className={`text-sm font-semibold ${n.isRead ? 'text-slate-400' : 'text-white'}`}>
                      {n.title}
                    </p>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />
                    )}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border capitalize ${TYPE_BG[n.type] ?? TYPE_BG.info} ${n.type === 'info' ? 'text-blue-300' : n.type === 'warning' ? 'text-amber-300' : n.type === 'error' ? 'text-red-300' : 'text-emerald-300'}`}>
                      {n.type}
                    </span>
                    {n.election && (
                      <span className="text-[10px] text-primary-400 flex items-center gap-0.5">
                        <Vote size={9} /> {n.election.name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{n.message}</p>
                  <p className="text-[10px] text-slate-600 mt-1.5">
                    {new Date(n.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!n.isRead && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      title="Mark as read"
                      className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                    >
                      <CheckCheck size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(n.id)}
                    title="Delete"
                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
};
