import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GraduationCap, Loader2, AlertCircle, MessageSquare, Clock, Calendar } from 'lucide-react';
import { API_BASE_URL } from '../../apiConfig';
import { auth } from '../../firebase';

const API = `${API_BASE_URL}/api/admin`;
const TABS = ['all', 'doubts', 'sessions'];

const STATUS_CLASSES = {
    Open: 'bg-orange-50 text-orange-700 border border-orange-100',
    Pending: 'bg-orange-50 text-orange-700 border border-orange-100',
    'In Progress': 'bg-blue-50 text-blue-700 border border-blue-100',
    Answered: 'bg-blue-50 text-blue-700 border border-blue-100',
    Resolved: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    Closed: 'bg-slate-100 text-slate-500 border border-slate-200',
    pending: 'bg-orange-50 text-orange-700 border border-orange-100',
    accepted: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    rejected: 'bg-red-50 text-red-700 border border-red-100',
    completed: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
};

const AdminMentorship = () => {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('all');

    const fetchData = useCallback(async () => {
        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch(`${API}/mentorship?type=${tab}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.success) setData(json.data);
            else if (json.mentorship) setData(json.mentorship);
        } catch (err) {
            console.error('Fetch mentorship error:', err);
        } finally {
            setLoading(false);
        }
    }, [tab]);

    useEffect(() => { setLoading(true); fetchData(); }, [fetchData]);

    const d = data || { doubts: [], sessions: [], totalDoubts: 0, pendingDoubts: 0, totalSessions: 0 };

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" style={{ color: '#4F46E5' }} /> Mentorship
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">Monitor doubts, sessions, and mentor activity</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="zen-card p-5">
                    <p className="zen-stat-value text-2xl">{d.totalDoubts}</p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Total Doubts</p>
                </div>
                <div className="zen-card p-5">
                    <p className="text-2xl font-bold text-orange-500">{d.pendingDoubts}</p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Pending Doubts</p>
                </div>
                <div className="zen-card p-5">
                    <p className="text-2xl font-bold text-purple-600">{d.totalSessions}</p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Sessions</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
                {TABS.map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-all capitalize ${
                            tab === t
                                ? 'border-[#4F46E5] text-[#4F46E5]'
                                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-[#D1D5DB]'
                        }`}
                        style={{ background: tab === t ? 'rgba(79, 70, 229, 0.06)' : 'transparent' }}
                    >{t}</button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-32"><Loader2 className="h-6 w-6 animate-spin" style={{ color: '#4F46E5' }} /></div>
            ) : (
                <div className="space-y-6">
                    {/* Doubts */}
                    {(tab === 'all' || tab === 'doubts') && (
                        <div className="zen-card overflow-hidden">
                            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--color-zen-border)' }}>
                                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4" style={{ color: '#4F46E5' }} /> Doubts ({d.doubts.length})
                                </h3>
                            </div>
                            <div className="divide-y" style={{ borderColor: 'var(--color-zen-border)', maxHeight: '500px', overflowY: 'auto' }}>
                                {d.doubts.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500 text-sm">No doubts found</div>
                                ) : d.doubts.map(doubt => (
                                    <div key={doubt.id} className="px-5 py-4 hover:bg-slate-50/50 transition-colors">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-slate-900 line-clamp-2">{doubt.problemDescription || 'No description'}</p>
                                                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                                                    <span>Student: {doubt.studentName || doubt.student_id || '—'}</span>
                                                    {doubt.mentorName && <span>Mentor: {doubt.mentorName}</span>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${STATUS_CLASSES[doubt.status] || 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                                    {doubt.status}
                                                </span>
                                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {doubt.createdAt ? new Date(doubt.createdAt).toLocaleDateString() : '—'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Sessions */}
                    {(tab === 'all' || tab === 'sessions') && (
                        <div className="zen-card overflow-hidden">
                            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--color-zen-border)' }}>
                                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                    <Calendar className="h-4 w-4" style={{ color: '#8B5CF6' }} /> Sessions ({d.sessions.length})
                                </h3>
                            </div>
                            <div className="divide-y" style={{ borderColor: 'var(--color-zen-border)', maxHeight: '500px', overflowY: 'auto' }}>
                                {d.sessions.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500 text-sm">No sessions found</div>
                                ) : d.sessions.map(s => (
                                    <div key={s.id} className="px-5 py-4 hover:bg-slate-50/50 transition-colors">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-sm text-slate-900">{s.topic || s.reason || 'Session'}</p>
                                                <p className="text-xs text-slate-500 mt-1">Student: {s.studentName || s.student_id || '—'} → Mentor: {s.mentorName || s.mentor_id || '—'}</p>
                                            </div>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${STATUS_CLASSES[s.status] || 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                                {s.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminMentorship;