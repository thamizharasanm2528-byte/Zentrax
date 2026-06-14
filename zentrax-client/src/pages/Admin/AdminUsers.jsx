import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../apiConfig';
import { auth } from '../../firebase';
import {
    Users, Search, Loader2, AlertCircle, Shield, ShieldOff,
    Trash2, UserCheck, UserX, Plus, Mail, Lock
} from 'lucide-react';

const API = `${API_BASE_URL}/api/admin`;
const ROLES = ['all', 'student', 'mentor'];
const STATUSES = ['all', 'active', 'deactivated', 'flagged'];

const AdminUsers = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [toast, setToast] = useState(null);
    const [modal, setModal] = useState(null);
    const [showCreateMentor, setShowCreateMentor] = useState(false);
    const [mentorForm, setMentorForm] = useState({ name: '', email: '', password: '' });
    const [creating, setCreating] = useState(false);

    const getHeaders = useCallback(async () => {
        const token = await auth.currentUser?.getIdToken();
        return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
    }, []);

    const fetchUsers = useCallback(async () => {
        try {
            const headers = await getHeaders();
            const params = new URLSearchParams();
            if (roleFilter !== 'all') params.set('role', roleFilter);
            if (statusFilter !== 'all') params.set('status', statusFilter);
            if (search) params.set('search', search);
            const res = await fetch(`${API}/users?${params}`, { headers });
            const json = await res.json();
            if (json.success) setUsers(json.data.users);
            else if (json.users) setUsers(json.users);
        } catch (err) { console.error('Fetch users error:', err); }
        finally { setLoading(false); }
    }, [getHeaders, roleFilter, statusFilter, search]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleAction = async (action, uid) => {
        try {
            const headers = await getHeaders();
            if (action === 'delete') {
                await fetch(`${API}/users/${uid}`, { method: 'DELETE', headers });
            } else if (action === 'delete-permanent') {
                await fetch(`${API}/users/${uid}?permanent=true`, { method: 'DELETE', headers });
            } else {
                await fetch(`${API}/users/${uid}/status`, {
                    method: 'PUT', headers, body: JSON.stringify({ action })
                });
            }
            setToast({ message: `User ${action === 'delete-permanent' ? 'permanently deleted' : action + 'd'} successfully`, type: 'success' });
            setModal(null);
            fetchUsers();
        } catch {
            setToast({ message: `Failed to ${action} user`, type: 'error' });
        }
        setTimeout(() => setToast(null), 3000);
    };

    const createMentor = async () => {
        if (!mentorForm.name || !mentorForm.email || !mentorForm.password) return;
        setCreating(true);
        try {
            const headers = await getHeaders();
            const res = await fetch(`${API}/create-mentor`, {
                method: 'POST', headers,
                body: JSON.stringify({ ...mentorForm, role: 'mentor' })
            });
            if (res.ok) {
                setToast({ message: 'Mentor account created successfully', type: 'success' });
                setShowCreateMentor(false);
                setMentorForm({ name: '', email: '', password: '' });
                fetchUsers();
            } else {
                const data = await res.json();
                setToast({ message: data.error || 'Failed to create mentor', type: 'error' });
            }
        } catch {
            setToast({ message: 'Failed to create mentor', type: 'error' });
        }
        setCreating(false);
        setTimeout(() => setToast(null), 3000);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Toast */}
            {toast && (
                <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-semibold shadow-lg animate-fade-in" style={{
                    background: toast.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    color: toast.type === 'success' ? '#10B981' : '#EF4444',
                    border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                    backdropFilter: 'blur(8px)'
                }}>
                    {toast.message}
                </div>
            )}

            {/* Confirm Modal */}
            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
                    <div className="zen-card p-6 w-full max-w-sm">
                        <h3 className="text-base font-semibold text-slate-900 mb-2">
                            {modal.action === 'delete' && modal.isInactive ? 'Permanently Delete User' : 'Confirm Action'}
                        </h3>
                        <p className="text-sm text-slate-500 mb-6">
                            {modal.action === 'delete' && modal.isInactive ? (
                                <>
                                    Are you sure you want to <span className="text-red-500 font-semibold">permanently delete</span> user <span style={{ color: '#4F46E5' }}>{modal.name}</span>?
                                    <span className="block mt-2 text-red-500 text-xs font-semibold">WARNING: This will erase all user data permanently. This action cannot be undone.</span>
                                </>
                            ) : (
                                <>
                                    Are you sure you want to <span className="text-slate-900 font-medium">{modal.action}</span> user <span style={{ color: '#4F46E5' }}>{modal.name}</span>?
                                    {modal.action === 'delete' && <span className="block mt-1 text-red-400 text-xs">This action cannot be undone.</span>}
                                </>
                            )}
                        </p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setModal(null)} className="zen-btn-secondary text-sm">Cancel</button>
                            <button onClick={() => handleAction(modal.action === 'delete' && modal.isInactive ? 'delete-permanent' : modal.action, modal.uid)}
                                className={modal.action === 'delete' ? 'zen-btn-danger text-sm' : 'zen-btn-primary text-sm'}>
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Mentor Modal */}
            {showCreateMentor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
                    onClick={() => setShowCreateMentor(false)}>
                    <div className="zen-card p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-base font-semibold text-slate-900">Create Mentor Account</h3>
                        <div>
                            <label className="zen-label">Name</label>
                            <input type="text" value={mentorForm.name} onChange={e => setMentorForm({ ...mentorForm, name: e.target.value })} className="zen-input" placeholder="Mentor name" />
                        </div>
                        <div>
                            <label className="zen-label">Email</label>
                            <input type="email" value={mentorForm.email} onChange={e => setMentorForm({ ...mentorForm, email: e.target.value })} className="zen-input" placeholder="mentor@email.com" />
                        </div>
                        <div>
                            <label className="zen-label">Password</label>
                            <input type="password" value={mentorForm.password} onChange={e => setMentorForm({ ...mentorForm, password: e.target.value })} className="zen-input" placeholder="Min 6 characters" />
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button onClick={() => setShowCreateMentor(false)} className="zen-btn-secondary text-sm">Cancel</button>
                            <button onClick={createMentor} disabled={creating} className="zen-btn-primary text-sm flex items-center gap-1.5">
                                {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                                Create Mentor
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Users className="h-5 w-5" style={{ color: '#4F46E5' }} /> Users
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">{users.length} users found</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowCreateMentor(true)} className="zen-btn-primary text-sm flex items-center gap-1.5">
                        <Plus className="h-3.5 w-3.5" /> Add Mentor
                    </button>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="zen-input pl-10 w-48" style={{ paddingLeft: '2.5rem' }} />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Role:</span>
                    {ROLES.map(r => (
                        <button key={r} onClick={() => setRoleFilter(r)}
                            className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-all capitalize ${
                                roleFilter === r
                                    ? 'border-[#4F46E5] text-[#4F46E5]'
                                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-[#D1D5DB]'
                            }`}
                            style={{ background: roleFilter === r ? 'rgba(79, 70, 229, 0.06)' : 'transparent' }}
                        >{r}</button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Status:</span>
                    {STATUSES.map(s => (
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
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex justify-center py-32"><Loader2 className="h-6 w-6 animate-spin" style={{ color: '#4F46E5' }} /></div>
            ) : users.length === 0 ? (
                <div className="zen-card zen-empty py-16">
                    <AlertCircle className="h-8 w-8 zen-empty-icon" />
                    <p className="zen-empty-title">No users found</p>
                </div>
            ) : (
                <div className="zen-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm block md:table">
                            <thead className="hidden md:table-header-group">
                                <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">User</th>
                                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
                                    <th className="text-right px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="block md:table-row-group p-4 md:p-0">
                                {users.map(u => (
                                    <tr key={u.uid} className="block md:table-row hover:bg-slate-50/50 transition-colors mb-4 md:mb-0 border border-slate-100 md:border-0 rounded-xl md:rounded-none" style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                                        <td className="block md:table-cell px-4 py-3 border-b border-slate-50 md:border-0">
                                            <p className="text-sm font-medium text-slate-900">{u.name || 'Unnamed'}</p>
                                            <p className="text-xs text-slate-500">{u.email}</p>
                                        </td>
                                        <td className="block md:table-cell px-4 py-2 md:py-3 border-b border-slate-50 md:border-0">
                                            <div className="flex md:block items-center justify-between">
                                                <span className="md:hidden text-xs text-slate-500 font-medium">Role:</span>
                                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                                                    u.role === 'mentor' ? 'bg-purple-500/10 text-purple-600' :
                                                    u.role === 'admin' ? 'bg-yellow-500/10 text-yellow-600' :
                                                    'bg-green-500/10 text-green-600'
                                                }`}>{u.role}</span>
                                            </div>
                                        </td>
                                        <td className="block md:table-cell px-4 py-2 md:py-3 border-b border-slate-50 md:border-0">
                                            <div className="flex md:block items-center justify-between">
                                                <span className="md:hidden text-xs text-slate-500 font-medium">Status:</span>
                                                <div className="flex items-center gap-1">
                                                    {u.is_flagged && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-600">FLAGGED</span>}
                                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                                        u.is_active === false ? 'bg-red-500/10 text-red-600' : 'bg-green-500/10 text-green-600'
                                                    }`}>{u.is_active === false ? 'INACTIVE' : 'ACTIVE'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="hidden md:table-cell px-4 py-3 text-xs text-slate-500">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                                        <td className="block md:table-cell px-4 py-3">
                                            <div className="flex justify-end gap-1">
                                                {u.is_active !== false ? (
                                                    <button title="Deactivate" onClick={() => setModal({ action: 'deactivate', uid: u.uid, name: u.name || u.email })}
                                                        className="p-1.5 text-slate-500 hover:text-yellow-600 rounded-md transition-colors"><UserX className="h-3.5 w-3.5" /></button>
                                                ) : (
                                                    <button title="Reactivate" onClick={() => setModal({ action: 'reactivate', uid: u.uid, name: u.name || u.email })}
                                                        className="p-1.5 text-slate-500 hover:text-green-600 rounded-md transition-colors"><UserCheck className="h-3.5 w-3.5" /></button>
                                                )}
                                                {u.is_flagged ? (
                                                    <button title="Unflag" onClick={() => handleAction('unflag', u.uid)}
                                                        className="p-1.5 text-yellow-600 hover:text-slate-500 rounded-md transition-colors"><ShieldOff className="h-3.5 w-3.5" /></button>
                                                ) : (
                                                    <button title="Flag" onClick={() => handleAction('flag', u.uid)}
                                                        className="p-1.5 text-slate-500 hover:text-yellow-600 rounded-md transition-colors"><Shield className="h-3.5 w-3.5" /></button>
                                                )}
                                                <button title="Delete" onClick={() => setModal({ action: 'delete', uid: u.uid, name: u.name || u.email, isInactive: u.is_active === false })}
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

export default AdminUsers;