import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../apiConfig';
import { auth } from '../../firebase';
import {
    KeyRound, Plus, Loader2, AlertCircle, Copy, Check,
    Trash2, Mail, User, Clock, CheckCircle2, XCircle, RefreshCw
} from 'lucide-react';

const API = `${API_BASE_URL}/api/admin`;

const AdminMentorInvites = () => {
    const { user } = useAuth();
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ name: '', email: '' });
    const [creating, setCreating] = useState(false);
    const [copiedCode, setCopiedCode] = useState(null);
    const [confirmRevoke, setConfirmRevoke] = useState(null);
    const [activeTab, setActiveTab] = useState('active'); // 'active' | 'history'
    const [clearingHistory, setClearingHistory] = useState(false);

    const getHeaders = useCallback(async () => {
        const token = await auth.currentUser?.getIdToken();
        return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
    }, []);

    const fetchInvites = useCallback(async () => {
        try {
            const headers = await getHeaders();
            const res = await fetch(`${API}/mentor-invites`, { headers });
            const json = await res.json();
            if (json.success) setInvites(json.invites || []);
        } catch (err) {
            console.error('Fetch invites error:', err);
        } finally {
            setLoading(false);
        }
    }, [getHeaders]);

    useEffect(() => { fetchInvites(); }, [fetchInvites]);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleCreate = async () => {
        if (!form.name.trim() || !form.email.trim()) {
            showToast('Name and email are required.', 'error');
            return;
        }
        setCreating(true);
        try {
            const headers = await getHeaders();
            const res = await fetch(`${API}/mentor-invites`, {
                method: 'POST', headers,
                body: JSON.stringify({ name: form.name.trim(), email: form.email.trim() }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showToast(`Invite code created: ${data.invite.code}`);
                setShowCreate(false);
                setForm({ name: '', email: '' });
                fetchInvites();
            } else {
                showToast(data.error || 'Failed to create invite.', 'error');
            }
        } catch {
            showToast('Failed to create invite.', 'error');
        }
        setCreating(false);
    };

    const handleRevoke = async (code) => {
        try {
            const headers = await getHeaders();
            const res = await fetch(`${API}/mentor-invites/${code}`, { method: 'DELETE', headers });
            if (res.ok) {
                showToast('Invite deleted successfully.');
                setConfirmRevoke(null);
                fetchInvites();
            } else {
                const data = await res.json();
                showToast(data.error || 'Failed to delete invite.', 'error');
            }
        } catch {
            showToast('Failed to delete invite.', 'error');
        }
    };

    const handleClearHistory = async () => {
        if (!window.confirm("Are you sure you want to clear all used and expired invite codes?")) return;
        setClearingHistory(true);
        try {
            const headers = await getHeaders();
            const res = await fetch(`${API}/mentor-invites/clear-history`, {
                method: 'POST',
                headers
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showToast('Invite history cleared successfully.');
                fetchInvites();
            } else {
                showToast(data.error || 'Failed to clear history.', 'error');
            }
        } catch {
            showToast('Failed to clear invite history.', 'error');
        }
        setClearingHistory(false);
    };

    const copyCode = (code) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const getStatusBadge = (status) => {
        const styles = {
            active: { classes: 'bg-emerald-50 text-emerald-700 border border-emerald-100', icon: CheckCircle2, label: 'Active' },
            used: { classes: 'bg-blue-50 text-blue-700 border border-blue-100', icon: Check, label: 'Used' },
            expired: { classes: 'bg-red-50 text-red-700 border border-red-100', icon: XCircle, label: 'Expired' },
        };
        const s = styles[status] || styles.expired;
        const Icon = s.icon;
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${s.classes}`}>
                <Icon className="h-3 w-3" /> {s.label}
            </span>
        );
    };

    const formatDate = (iso) => {
        if (!iso) return '—';
        return new Date(iso).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const activeCount = invites.filter(i => i.status === 'active').length;
    const usedCount = invites.filter(i => i.status === 'used').length;
    const expiredCount = invites.filter(i => i.status === 'expired').length;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Toast */}
            {toast && (
                <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-semibold shadow-lg animate-fade-in" style={{
                    background: toast.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    color: toast.type === 'success' ? '#10B981' : '#EF4444',
                    border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                    backdropFilter: 'blur(8px)',
                }}>
                    {toast.message}
                </div>
            )}

            {/* Revoke confirm modal */}
            {confirmRevoke && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
                    <div className="zen-card p-6 w-full max-w-sm">
                        <h3 className="text-base font-semibold text-slate-900 mb-2">
                            {confirmRevoke.status === 'active' ? 'Revoke Invite' : 'Delete Log'}
                        </h3>
                        <p className="text-sm text-slate-500 mb-2">
                            Are you sure you want to {confirmRevoke.status === 'active' ? 'revoke' : 'delete'} the invite record for <span style={{ color: '#4F46E5' }} className="font-medium">{confirmRevoke.email}</span>?
                        </p>
                        <p className="text-xs text-slate-400 mb-6">Code: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-700">{confirmRevoke.code}</code></p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setConfirmRevoke(null)} className="zen-btn-secondary text-sm">Cancel</button>
                            <button onClick={() => handleRevoke(confirmRevoke.code)} className="zen-btn-danger text-sm">
                                {confirmRevoke.status === 'active' ? 'Revoke' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Invite Modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
                    onClick={() => setShowCreate(false)}>
                    <div className="zen-card p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
                        <div>
                            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                                <KeyRound className="h-4 w-4" style={{ color: '#8B5CF6' }} /> Generate Mentor Invite
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">Create a one-time invite code tied to the mentor's email.</p>
                        </div>
                        <div>
                            <label className="zen-label">Mentor Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                    className="zen-input pl-10" style={{ paddingLeft: '2.5rem' }} placeholder="Dr. Mentor Name" autoFocus />
                            </div>
                        </div>
                        <div>
                            <label className="zen-label">Mentor Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                                    className="zen-input pl-10" style={{ paddingLeft: '2.5rem' }} placeholder="mentor@example.com" />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 ml-1">Invite is locked to this email — only this person can use it.</p>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button onClick={() => setShowCreate(false)} className="zen-btn-secondary text-sm">Cancel</button>
                            <button onClick={handleCreate} disabled={creating} className="zen-btn-primary text-sm flex items-center gap-1.5"
                                style={{ background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)' }}>
                                {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                                Generate Code
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <KeyRound className="h-5 w-5" style={{ color: '#8B5CF6' }} /> Mentor Invites
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">Generate and manage mentor registration invite codes</p>
                </div>
                <div className="flex gap-2">
                    {activeTab === 'history' && (usedCount > 0 || expiredCount > 0) && (
                        <button onClick={handleClearHistory} disabled={clearingHistory} className="zen-btn-danger text-sm flex items-center gap-1.5"
                            style={{ background: '#EF4444', color: '#FFFFFF' }}>
                            {clearingHistory ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            Clear History
                        </button>
                    )}
                    <button onClick={fetchInvites} className="zen-btn-secondary text-sm flex items-center gap-1.5">
                        <RefreshCw className="h-3.5 w-3.5" /> Refresh
                    </button>
                    <button onClick={() => setShowCreate(true)} className="zen-btn-primary text-sm flex items-center gap-1.5"
                        style={{ background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)' }}>
                        <Plus className="h-3.5 w-3.5" /> New Invite
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Active', value: activeCount, color: '#16A34A', bg: 'rgba(34,197,94,0.06)' },
                    { label: 'Used', value: usedCount, color: '#3B82F6', bg: 'rgba(59,130,246,0.06)' },
                    { label: 'Expired', value: expiredCount, color: '#EF4444', bg: 'rgba(239,68,68,0.06)' },
                ].map(s => (
                    <div key={s.label} className="zen-card p-4" style={{ borderLeft: `3px solid ${s.color}` }}>
                        <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">{s.label} Invites</p>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b" style={{ borderColor: 'var(--color-zen-border)', paddingBottom: '1px' }}>
                <button
                    onClick={() => setActiveTab('active')}
                    className={`px-4 py-2 text-sm font-semibold transition-all border-b-2 ${
                        activeTab === 'active'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    Active Invites ({activeCount})
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 text-sm font-semibold transition-all border-b-2 ${
                        activeTab === 'history'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    Invite History ({usedCount + expiredCount})
                </button>
            </div>

            {/* Invites Table */}
            {loading ? (
                <div className="flex justify-center py-32">
                    <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#8B5CF6' }} />
                </div>
            ) : (() => {
                const filteredInvites = invites.filter(inv => {
                    if (activeTab === 'active') return inv.status === 'active';
                    return inv.status === 'used' || inv.status === 'expired';
                });

                if (filteredInvites.length === 0) {
                    return (
                        <div className="zen-card zen-empty py-16">
                            <KeyRound className="h-8 w-8 zen-empty-icon" />
                            <p className="zen-empty-title">
                                {activeTab === 'active' ? 'No active invites' : 'No invite history'}
                            </p>
                            <p className="zen-empty-desc">
                                {activeTab === 'active' 
                                    ? 'Click "New Invite" to generate a mentor registration code.' 
                                    : 'Used and expired invite codes will appear here.'}
                            </p>
                        </div>
                    );
                }

                return (
                    <div className="zen-card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                                        <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Code</th>
                                        <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Mentor</th>
                                        <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                        <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Created</th>
                                        <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Expires</th>
                                        <th className="text-right px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredInvites.map(inv => (
                                        <tr key={inv.code} className="hover:bg-slate-50/50 transition-colors"
                                            style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <code className="bg-slate-100 px-2 py-1 rounded-md font-mono text-xs font-bold text-slate-800 tracking-wider">{inv.code}</code>
                                                    <button onClick={() => copyCode(inv.code)} title="Copy code"
                                                        className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors">
                                                        {copiedCode === inv.code ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-sm font-medium text-slate-900">{inv.name}</p>
                                                <p className="text-xs text-slate-500">{inv.email}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                {getStatusBadge(inv.status)}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-500">{formatDate(inv.createdAt)}</td>
                                            <td className="px-4 py-3 text-xs text-slate-500">{formatDate(inv.expiresAt)}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end gap-1">
                                                    {inv.status === 'active' ? (
                                                        <>
                                                            <button onClick={() => copyCode(inv.code)} title="Copy code"
                                                                className="p-1.5 text-slate-500 hover:text-blue-600 rounded-md transition-colors">
                                                                <Copy className="h-3.5 w-3.5" />
                                                            </button>
                                                            <button onClick={() => setConfirmRevoke(inv)} title="Revoke"
                                                                className="p-1.5 text-slate-500 hover:text-red-600 rounded-md transition-colors">
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button onClick={() => setConfirmRevoke(inv)} title="Delete Log"
                                                            className="p-1.5 text-slate-500 hover:text-red-600 rounded-md transition-colors">
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })()}

            {/* Info card */}
            <div className="zen-card p-4" style={{ borderLeft: '3px solid #8B5CF6' }}>
                <h4 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" style={{ color: '#8B5CF6' }} /> How Mentor Invites Work
                </h4>
                <ul className="text-xs text-slate-500 space-y-1 ml-6 list-disc">
                    <li>Each invite code is a unique 8-character alphanumeric code</li>
                    <li>Codes are bound to a specific email — only that email can register with it</li>
                    <li>Codes are single-use and expire after 72 hours</li>
                    <li>Mentors use the code at <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">/signup?role=mentor</code></li>
                    <li>After registration, the mentor account is created server-side via Firebase Admin SDK</li>
                </ul>
            </div>
        </div>
    );
};

export default AdminMentorInvites;
