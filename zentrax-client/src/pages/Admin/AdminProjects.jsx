import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../apiConfig';
import { auth } from '../../firebase';
import {
    FolderKanban, Search, Loader2, AlertCircle, Shield, ShieldOff,
    Trash2, Users as UsersIcon
} from 'lucide-react';

const API = `${API_BASE_URL}/api/admin`;
const STATUS_TABS = ['all', 'planning', 'development', 'testing', 'completed'];

const STATUS_CLASSES = {
    planning: 'bg-blue-50 text-blue-700 border border-blue-100',
    development: 'bg-amber-50 text-amber-700 border border-amber-100',
    testing: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
    completed: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
};

const AdminProjects = () => {
    const { user } = useAuth();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [toast, setToast] = useState(null);
    const [modal, setModal] = useState(null);

    const getHeaders = useCallback(async () => {
        const token = await auth.currentUser?.getIdToken();
        return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
    }, []);

    const fetchProjects = useCallback(async () => {
        try {
            const headers = await getHeaders();
            const params = new URLSearchParams();
            if (statusFilter !== 'all') params.set('status', statusFilter);
            if (search) params.set('search', search);

            const res = await fetch(`${API}/projects?${params}`, { headers });
            const json = await res.json();
            if (json.success) setProjects(json.data.projects);
            else if (json.projects) setProjects(json.projects);
        } catch (err) {
            console.error('Fetch projects error:', err);
        } finally {
            setLoading(false);
        }
    }, [getHeaders, statusFilter, search]);

    useEffect(() => { fetchProjects(); }, [fetchProjects]);

    const handleAction = async (action, id) => {
        try {
            const headers = await getHeaders();
            if (action === 'delete') {
                await fetch(`${API}/projects/${id}`, { method: 'DELETE', headers });
            } else {
                await fetch(`${API}/projects/${id}/status`, {
                    method: 'PUT', headers, body: JSON.stringify({ action })
                });
            }
            setToast({ message: `Project ${action}d successfully`, type: 'success' });
            setModal(null);
            fetchProjects();
        } catch {
            setToast({ message: `Failed to ${action} project`, type: 'error' });
        }
        setTimeout(() => setToast(null), 3000);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {toast && (
                <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-semibold shadow-lg animate-fade-in" style={{
                    background: toast.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    color: toast.type === 'success' ? '#10B981' : '#EF4444',
                    border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                    backdropFilter: 'blur(8px)'
                }}>{toast.message}</div>
            )}

            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
                    <div className="zen-card p-6 w-full max-w-sm">
                        <h3 className="text-base font-semibold text-slate-900 mb-2">Confirm Action</h3>
                        <p className="text-sm text-slate-500 mb-6">
                            Are you sure you want to <span className="text-slate-900 font-medium">{modal.action}</span> project <span style={{ color: '#4F46E5' }}>&ldquo;{modal.name}&rdquo;</span>?
                            {modal.action === 'delete' && <span className="block mt-1 text-red-400 text-xs font-normal">This action cannot be undone.</span>}
                        </p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setModal(null)} className="zen-btn-secondary text-sm">Cancel</button>
                            <button onClick={() => handleAction(modal.action, modal.id)}
                                className={modal.action === 'delete' ? 'zen-btn-danger text-sm font-medium' : 'zen-btn-primary text-sm font-medium'}>
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <FolderKanban className="h-5 w-5" style={{ color: '#4F46E5' }} /> Projects
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">{projects.length} projects found</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input type="text" placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)}
                        className="zen-input pl-10 w-64" style={{ paddingLeft: '2.5rem' }} />
                </div>
            </div>

            {/* Status Tabs */}
            <div className="flex flex-wrap gap-2">
                {STATUS_TABS.map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-all capitalize ${
                            statusFilter === s
                                ? 'border-[#4F46E5] text-[#4F46E5]'
                                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-[#D1D5DB]'
                        }`}
                        style={{ background: statusFilter === s ? 'rgba(79, 70, 229, 0.06)' : 'transparent' }}
                    >{s}</button>
                ))}
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex justify-center py-32"><Loader2 className="h-6 w-6 animate-spin" style={{ color: '#4F46E5' }} /></div>
            ) : projects.length === 0 ? (
                <div className="zen-card zen-empty py-16">
                    <AlertCircle className="h-8 w-8 zen-empty-icon" />
                    <p className="zen-empty-title">No projects found</p>
                </div>
            ) : (
                <div className="zen-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm block md:table">
                            <thead className="hidden md:table-header-group">
                                <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Project</th>
                                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Owner</th>
                                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Team</th>
                                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Created</th>
                                    <th className="text-right px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="block md:table-row-group p-4 md:p-0">
                                {projects.map(p => (
                                    <tr key={p.id} className="block md:table-row hover:bg-slate-50/50 transition-colors mb-4 md:mb-0 border border-slate-100 md:border-0 rounded-xl md:rounded-none" style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                                        <td className="block md:table-cell px-4 py-3 border-b border-slate-50 md:border-0">
                                            <p className="text-sm font-medium text-slate-900">{p.title || p.name || 'Untitled'}</p>
                                            {p.is_flagged && <span className="text-[10px] text-amber-500 font-bold block mt-1">⚠ FLAGGED</span>}
                                        </td>
                                        <td className="block md:table-cell px-4 py-2 md:py-3 border-b border-slate-50 md:border-0">
                                            <div className="flex md:block items-center justify-between">
                                                <span className="md:hidden text-xs text-slate-500 font-medium">Owner:</span>
                                                <span className="text-xs text-slate-500">{p.ownerName}</span>
                                            </div>
                                        </td>
                                        <td className="block md:table-cell px-4 py-2 md:py-3 border-b border-slate-50 md:border-0">
                                            <div className="flex md:block items-center justify-between">
                                                <span className="md:hidden text-xs text-slate-500 font-medium">Team Size:</span>
                                                <span className="flex items-center gap-1 text-xs text-slate-500">
                                                    <UsersIcon className="h-3.5 w-3.5" /> {p.teamSize}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="block md:table-cell px-4 py-2 md:py-3 border-b border-slate-50 md:border-0">
                                            <div className="flex md:block items-center justify-between">
                                                <span className="md:hidden text-xs text-slate-500 font-medium">Status:</span>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${STATUS_CLASSES[p.status] || 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                                    {p.status || 'unknown'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="block md:table-cell px-4 py-2 md:py-3 border-b border-slate-50 md:border-0">
                                            <div className="flex md:block items-center justify-between">
                                                <span className="md:hidden text-xs text-slate-500 font-medium">Created:</span>
                                                <span className="text-xs text-slate-500">
                                                    {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="block md:table-cell px-4 py-3">
                                            <div className="flex justify-end gap-1">
                                                {p.is_flagged ? (
                                                    <button title="Unflag" onClick={() => handleAction('unflag', p.id)}
                                                        className="p-1.5 text-amber-500 hover:text-slate-500 rounded-md transition-colors"><ShieldOff className="h-3.5 w-3.5" /></button>
                                                ) : (
                                                    <button title="Flag" onClick={() => handleAction('flag', p.id)}
                                                        className="p-1.5 text-slate-500 hover:text-amber-500 rounded-md transition-colors"><Shield className="h-3.5 w-3.5" /></button>
                                                )}
                                                <button title="Delete" onClick={() => setModal({ action: 'delete', id: p.id, name: p.title || p.name })}
                                                    className="p-1.5 text-slate-500 hover:text-red-600 rounded-md transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminProjects;