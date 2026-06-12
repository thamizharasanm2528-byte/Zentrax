import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { auth, db } from '../../firebase';
import { API_BASE_URL } from '../../apiConfig';
import { Link } from 'react-router-dom';
import {
    Users, ClipboardList, UserCheck, Calendar,
    ArrowRight, Loader2, CheckCircle, Clock, XCircle
} from 'lucide-react';
import useFirestoreListener from '../../hooks/useFirestoreListener';
import { collection, query, where, limit } from 'firebase/firestore';

const MentorDashboard = () => {
    const { user, userData } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequests, setSelectedRequests] = useState(new Set());

    useEffect(() => {
        if (!user) return;
        const fetchData = async () => {
            try {
                const token = await auth.currentUser?.getIdToken();
                const res = await fetch(`${API_BASE_URL}/api/mentor/requests`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setRequests(data.requests || []);
                }
            } catch (err) {
                console.error('[MentorDashboard] Fetch error:', err);
            }
            setLoading(false);
        };
        fetchData();
    }, [user]);

    const handleAction = async (requestId, action) => {
        try {
            const token = await auth.currentUser?.getIdToken();
            const endpoint = action === 'accept' ? 'accept' : 'reject';
            await fetch(`${API_BASE_URL}/api/mentor/${endpoint}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ requestId })
            });
            setRequests(prev => prev.map(r =>
                r.id === requestId ? { ...r, status: action === 'accept' ? 'accepted' : 'rejected' } : r
            ));
        } catch (err) {
            console.error(`[MentorDashboard] ${action} error:`, err);
        }
    };

    const handleSelect = (id) => {
        const next = new Set(selectedRequests);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedRequests(next);
    };

    const handleSelectAll = (ids) => {
        if (selectedRequests.size === ids.length) setSelectedRequests(new Set());
        else setSelectedRequests(new Set(ids));
    };

    const handleBulkAction = async (action) => {
        const ids = Array.from(selectedRequests);
        // Optimistic update
        setRequests(prev => prev.map(r =>
            ids.includes(r.id) ? { ...r, status: action === 'accept' ? 'accepted' : 'rejected' } : r
        ));
        setSelectedRequests(new Set());

        try {
            const token = await auth.currentUser?.getIdToken();
            const endpoint = action === 'accept' ? 'accept' : 'reject';
            await Promise.all(ids.map(id =>
                fetch(`${API_BASE_URL}/api/mentor/${endpoint}`, {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify({ requestId: id })
                })
            ));
        } catch (err) {
            console.error('[MentorDashboard] Bulk action error:', err);
        }
    };

    const accepted = requests.filter(r => r.status === 'accepted');
    const pending = requests.filter(r => r.status === 'pending');
    const uniqueStudents = new Set(accepted.map(r => r.studentId || r.student_id)).size;

    const stats = [
        { label: 'Active Mentorships', value: accepted.length, icon: UserCheck, color: '#4F46E5' },
        { label: 'Pending Requests', value: pending.length, icon: ClipboardList, color: '#f59e0b' },
        { label: 'Students Guided', value: uniqueStudents, icon: Users, color: '#3b82f6' },
        { label: 'This Week', value: accepted.length, icon: Calendar, color: '#8b5cf6' },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#4F46E5' }} />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-slate-900">Welcome back, {userData?.name || 'Mentor'}</h1>
                <p className="text-sm text-slate-500 mt-0.5">Your mentoring overview</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {stats.map(stat => (
                    <div key={stat.label} className="zen-card p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: `${stat.color}10` }}>
                                <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
                            </div>
                        </div>
                        <p className="zen-stat-value text-2xl">{stat.value}</p>
                        <p className="zen-stat-label">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Pending Requests */}
                <div className="zen-card">
                    <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ borderBottom: '1px solid var(--color-zen-border)' }}>
                        <div className="flex items-center gap-3">
                            {pending.length > 0 && (
                                <input 
                                    type="checkbox" 
                                    className="zen-checkbox" 
                                    checked={selectedRequests.size === pending.length && pending.length > 0}
                                    onChange={() => handleSelectAll(pending.map(p => p.id))}
                                />
                            )}
                            <h2 className="text-sm font-semibold text-slate-900">Pending Requests</h2>
                            <span className="zen-badge text-[10px]">{pending.length}</span>
                        </div>
                        {selectedRequests.size > 0 && (
                            <div className="flex items-center gap-2 animate-fade-in">
                                <button onClick={() => handleBulkAction('accept')} className="text-[10px] font-semibold px-2 py-1 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors">
                                    Accept ({selectedRequests.size})
                                </button>
                                <button onClick={() => handleBulkAction('reject')} className="text-[10px] font-semibold px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                                    Decline
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="divide-y" style={{ borderColor: 'var(--color-zen-border)' }}>
                        {pending.length === 0 ? (
                            <div className="zen-empty py-10">
                                <ClipboardList className="h-8 w-8 zen-empty-icon" />
                                <p className="zen-empty-title">No pending requests</p>
                            </div>
                        ) : pending.map(req => (
                            <div key={req.id} className="p-4 flex gap-3">
                                <div className="pt-0.5">
                                    <input 
                                        type="checkbox" 
                                        className="zen-checkbox"
                                        checked={selectedRequests.has(req.id)}
                                        onChange={() => handleSelect(req.id)}
                                    />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-start justify-between">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-slate-900">{req.studentName || 'Student'}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">{req.projectTitle || 'Project'}</p>
                                            {req.message && <p className="text-xs text-slate-500 mt-1 italic">"{req.message}"</p>}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-3">
                                    <button
                                        onClick={() => handleAction(req.id, 'accept')}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
                                        style={{ background: 'rgba(79,70,229,0.08)', color: '#4F46E5', border: '1px solid rgba(79,70,229,0.2)' }}
                                    >
                                        <CheckCircle className="h-3 w-3" /> Accept
                                    </button>
                                    <button
                                        onClick={() => handleAction(req.id, 'reject')}
                                        className="zen-btn-danger text-xs px-3 py-1.5 flex items-center gap-1 font-semibold"
                                    >
                                        <XCircle className="h-3 w-3" /> Decline
                                    </button>
                                </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Active Mentorships */}
                <div className="zen-card">
                    <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-zen-border)' }}>
                        <h2 className="text-sm font-semibold text-slate-900">Active Mentorships</h2>
                        <Link to="/messages/mentor" className="text-xs font-semibold flex items-center gap-1 hover:underline" style={{ color: '#4F46E5' }}>
                            Messages <ArrowRight className="h-3 w-3" />
                        </Link>
                    </div>
                    <div className="divide-y" style={{ borderColor: 'var(--color-zen-border)' }}>
                        {accepted.length === 0 ? (
                            <div className="zen-empty py-10">
                                <UserCheck className="h-8 w-8 zen-empty-icon" />
                                <p className="zen-empty-title">No active mentorships</p>
                                <p className="zen-empty-desc">Accept requests to start mentoring</p>
                            </div>
                        ) : accepted.map(req => (
                            <div key={req.id} className="p-3 flex items-center gap-3">
                                <div className="zen-avatar h-9 w-9 text-xs">{(req.studentName || 'S').charAt(0)}</div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-900 truncate">{req.studentName || 'Student'}</p>
                                    <p className="text-xs text-slate-500 truncate">{req.projectTitle || ''}</p>
                                </div>
                                <span className="zen-badge text-[10px]">Active</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MentorDashboard;