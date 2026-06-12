import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Activity, Loader2, CheckCircle, AlertTriangle, XCircle, Cpu, Database, Mail, Bot, Clock } from 'lucide-react';
import { API_BASE_URL } from '../../apiConfig';
import { auth } from '../../firebase';

const API = `${API_BASE_URL}/api/admin`;

const STATUS_STYLES = {
    operational: { icon: CheckCircle, classes: 'bg-emerald-50 text-emerald-700 border border-emerald-100', label: 'Operational' },
    warning: { icon: AlertTriangle, classes: 'bg-amber-50 text-amber-700 border border-amber-100', label: 'Warning' },
    error: { icon: XCircle, classes: 'bg-red-50 text-red-700 border border-red-100', label: 'Error' },
    checking: { icon: Loader2, classes: 'bg-slate-50 text-slate-500 border border-slate-200', label: 'Checking...' },
};

const SERVICE_ICONS = {
    backend: Cpu,
    firestore: Database,
    email: Mail,
    ai: Bot,
};

function formatUptime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
}

function formatBytes(bytes) {
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

const AdminSystemHealth = () => {
    const { user } = useAuth();
    const [health, setHealth] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchHealth = useCallback(async () => {
        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch(`${API}/system-health`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.success) setHealth(json.data);
            else if (json.health) setHealth(json.health);
        } catch (err) {
            console.error('System health error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchHealth(); }, [fetchHealth]);

    if (loading) return (
        <div className="flex justify-center py-32"><Loader2 className="h-6 w-6 animate-spin" style={{ color: '#4F46E5' }} /></div>
    );

    const services = health ? ['backend', 'firestore', 'email', 'ai'] : [];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Activity className="h-5 w-5" style={{ color: '#4F46E5' }} /> System Health
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">Service status and infrastructure monitoring</p>
                </div>
                <button onClick={() => { setLoading(true); fetchHealth(); }}
                    className="zen-btn-secondary text-xs px-3 py-1.5 flex items-center gap-1">
                    Refresh
                </button>
            </div>

            {/* Service Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {services.map(key => {
                    const svc = health[key] || { status: 'checking', message: '' };
                    const style = STATUS_STYLES[svc.status] || STATUS_STYLES.checking;
                    const Icon = SERVICE_ICONS[key] || Cpu;
                    const StatusIcon = style.icon;
                    return (
                        <div key={key} className={`zen-card p-5 border flex flex-col justify-between ${style.classes}`}>
                            <div className="flex items-center justify-between mb-4">
                                <Icon className="h-5 w-5 opacity-70" />
                                <StatusIcon className={`h-4 w-4 ${svc.status === 'checking' ? 'animate-spin' : ''}`} />
                            </div>
                            <div>
                                <p className="text-sm font-bold capitalize">{key}</p>
                                <p className="text-xs opacity-75 mt-1 font-medium">{svc.message || style.label}</p>
                            </div>
                            <div className="mt-3">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border border-current">
                                    {style.label}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Runtime Info */}
            {health && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="zen-card p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Clock className="h-4 w-4 text-indigo-500" />
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Uptime</p>
                        </div>
                        <p className="text-xl font-bold text-slate-900">{formatUptime(health.uptime || 0)}</p>
                    </div>
                    <div className="zen-card p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Cpu className="h-4 w-4 text-indigo-500" />
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Memory (Heap)</p>
                        </div>
                        <p className="text-xl font-bold text-slate-900">{health.memory ? formatBytes(health.memory.heapUsed) : '—'}</p>
                        <p className="text-xs text-slate-500 mt-1 font-medium">of {health.memory ? formatBytes(health.memory.heapTotal) : '—'} total</p>
                    </div>
                    <div className="zen-card p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Activity className="h-4 w-4 text-indigo-500" />
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Check</p>
                        </div>
                        <p className="text-sm font-semibold text-slate-900">{health.timestamp ? new Date(health.timestamp).toLocaleString() : '—'}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminSystemHealth;