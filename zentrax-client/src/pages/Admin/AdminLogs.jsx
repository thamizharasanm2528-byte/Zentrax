import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ScrollText, Loader2, Clock, Shield, FolderKanban, Users, ShieldAlert } from 'lucide-react';
import { API_BASE_URL } from '../../apiConfig';
import { auth } from '../../firebase';

const API = `${API_BASE_URL}/api/admin`;

const ACTION_ICONS = {
    user: Users,
    project: FolderKanban,
    report: ShieldAlert,
};

const ACTION_COLORS = {
    user_deactivate: 'text-amber-700 bg-amber-50 border border-amber-100',
    user_reactivate: 'text-emerald-700 bg-emerald-50 border border-emerald-100',
    user_flag: 'text-amber-700 bg-amber-50 border border-amber-100',
    user_unflag: 'text-slate-500 bg-slate-100 border border-slate-200',
    user_delete: 'text-red-700 bg-red-50 border border-red-100',
    project_flag: 'text-amber-700 bg-amber-50 border border-amber-100',
    project_unflag: 'text-slate-500 bg-slate-100 border border-slate-200',
    project_delete: 'text-red-700 bg-red-50 border border-red-100',
    report_resolved: 'text-emerald-700 bg-emerald-50 border border-emerald-100',
    report_reviewed: 'text-blue-700 bg-blue-50 border border-blue-100',
    report_ignored: 'text-slate-500 bg-slate-100 border border-slate-200',
};

const AdminLogs = () => {
    const { user } = useAuth();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchLogs = useCallback(async () => {
        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch(`${API}/logs`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.success) setLogs(json.data.logs);
            else if (json.logs) setLogs(json.logs);
        } catch (err) {
            console.error('Fetch logs error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <ScrollText className="h-5 w-5" style={{ color: '#4F46E5' }} /> Admin Logs
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">Recent admin actions and platform events</p>
            </div>

            {loading ? (
                <div className="flex justify-center py-32"><Loader2 className="h-6 w-6 animate-spin" style={{ color: '#4F46E5' }} /></div>
            ) : logs.length === 0 ? (
                <div className="zen-card zen-empty py-16">
                    <Shield className="h-8 w-8 zen-empty-icon" />
                    <p className="zen-empty-title">No admin actions logged yet</p>
                    <p className="zen-empty-desc">Actions will appear here as you manage the platform</p>
                </div>
            ) : (
                <div className="zen-card overflow-hidden">
                    <div className="divide-y" style={{ borderColor: 'var(--color-zen-border)', maxHeight: '600px', overflowY: 'auto' }}>
                        {logs.map((log, i) => {
                            const Icon = ACTION_ICONS[log.target_type] || Shield;
                            const colorClass = ACTION_COLORS[log.action] || 'text-indigo-700 bg-indigo-50 border border-indigo-100';
                            return (
                                <div key={log.id || i} className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                                    <div className={`p-2 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-slate-900">
                                            <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">[{log.action}]</span>
                                            {log.target_type && <span className="ml-2 text-slate-500 capitalize">{log.target_type}</span>}
                                            {log.target_id && <span className="ml-1 text-slate-400 font-mono text-xs">{log.target_id.substring(0, 12)}...</span>}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-0.5">by {log.admin_email}</p>
                                    </div>
                                    <span className="text-[11px] text-slate-400 flex items-center gap-1 shrink-0 font-medium">
                                        <Clock className="h-3 w-3" />
                                        {log.created_at ? new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminLogs;