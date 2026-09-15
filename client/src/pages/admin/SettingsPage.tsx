import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, RefreshCw, CheckCircle, AlertTriangle, Edit3, X } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { settingsService } from '../../services/api.service';
import { Spinner } from '../../components/ui';
import { toast } from 'react-hot-toast';

interface Setting {
  id: number;
  key: string;
  value: string;
  group: string;
  label: string;
}

const GROUP_ICONS: Record<string, string> = {
  general: '⚙️',
  security: '🔒',
  voting: '🗳️',
  reporting: '📊',
  notifications: '🔔',
};

const GROUP_DESCRIPTIONS: Record<string, string> = {
  general: 'Core application settings and defaults',
  security: 'Authentication, rate limiting, and session settings',
  voting: 'Voting process configuration',
  reporting: 'Report generation options',
  notifications: 'Notification delivery settings',
};

export const SettingsPage: React.FC = () => {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const fetchSettings = useCallback(() => settingsService.getAll(), []);
  const { data, loading, execute: refetch } = useAsync(fetchSettings);

  const grouped: Record<string, Setting[]> = data?.grouped ?? {};
  const hasSettings = Object.keys(grouped).length > 0;

  const startEdit = (setting: Setting) => {
    setEditingKey(setting.key);
    setEditValue(setting.value);
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditValue('');
  };

  const handleSave = async (key: string) => {
    if (savingKey) return;
    setSavingKey(key);
    try {
      await settingsService.update(key, editValue.trim());
      toast.success(`Setting "${key}" updated successfully`);
      setEditingKey(null);
      refetch();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to update setting';
      toast.error(msg);
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="page-header">
          <div>
            <h1 className="page-title"><span className="text-gradient">System Settings</span></h1>
            <p className="page-subtitle">Configure application settings and defaults</p>
          </div>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card h-40 animate-pulse bg-slate-800/40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Settings size={24} className="text-primary-400" />
            <span className="text-gradient">System Settings</span>
          </h1>
          <p className="page-subtitle">Configure application behaviour, security, and defaults</p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Caution notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/25">
        <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-300 leading-relaxed">
          <span className="font-semibold">Caution:</span> Changing system settings may affect election operations.
          Restart the server after modifying security or database settings.
        </div>
      </div>

      {!hasSettings ? (
        <div className="card p-12 text-center">
          <Settings size={48} className="text-slate-600 mx-auto mb-4" />
          <h3 className="text-base font-bold text-slate-300 mb-2">No Settings Configured</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No settings have been seeded in the database yet. Run the database seeder to populate default settings.
          </p>
          <code className="mt-4 inline-block px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono text-primary-400">
            npm run db:seed
          </code>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([group, settings], groupIdx) => (
            <motion.div
              key={group}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: groupIdx * 0.07 }}
              className="card overflow-hidden"
            >
              {/* Group header */}
              <div className="px-6 py-4 border-b border-slate-700/50 bg-slate-800/60 flex items-center gap-3">
                <span className="text-xl">{GROUP_ICONS[group] ?? '🔧'}</span>
                <div>
                  <h3 className="text-sm font-bold text-white capitalize">{group}</h3>
                  <p className="text-xs text-slate-400">{GROUP_DESCRIPTIONS[group] ?? `${group} configuration`}</p>
                </div>
                <span className="ml-auto badge badge-blue text-[10px]">{settings.length} settings</span>
              </div>

              {/* Settings rows */}
              <div className="divide-y divide-slate-700/30">
                {settings.map((setting) => {
                  const isEditing = editingKey === setting.key;
                  const isSaving = savingKey === setting.key;

                  return (
                    <div key={setting.key} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-800/30 transition-colors group">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">{setting.label}</p>
                        <p className="text-[11px] font-mono text-slate-500 mt-0.5">{setting.key}</p>
                      </div>

                      {/* Value / Editor */}
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <input
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSave(setting.key);
                                if (e.key === 'Escape') cancelEdit();
                              }}
                              className="input text-sm py-1.5 w-48 font-mono"
                            />
                            <button
                              onClick={() => handleSave(setting.key)}
                              disabled={isSaving}
                              className="p-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                            >
                              {isSaving ? <Spinner size={13} /> : <Save size={13} />}
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1.5 rounded-lg bg-slate-700/40 text-slate-400 hover:bg-slate-700 transition-colors"
                            >
                              <X size={13} />
                            </button>
                          </>
                        ) : (
                          <>
                            <code className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300 max-w-xs truncate">
                              {setting.value || <span className="text-slate-600 italic">empty</span>}
                            </code>
                            <button
                              onClick={() => startEdit(setting)}
                              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 bg-slate-700/40 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
                              title="Edit setting"
                            >
                              <Edit3 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Saved indicator */}
      {!loading && hasSettings && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <CheckCircle size={12} className="text-emerald-500" />
          Changes are saved immediately and persist across server restarts.
        </div>
      )}
    </div>
  );
};
