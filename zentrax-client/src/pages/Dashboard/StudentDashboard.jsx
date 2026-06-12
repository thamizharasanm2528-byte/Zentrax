import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { auth, db } from '../../firebase';
import { API_BASE_URL } from '../../apiConfig';
import { Link } from 'react-router-dom';
import {
    FolderKanban, Users, GraduationCap, TrendingUp,
    Plus, ArrowRight, Clock, Loader2, XCircle
} from 'lucide-react';
import useFirestoreListener from '../../hooks/useFirestoreListener';
import { collection, query, where, limit } from 'firebase/firestore';

const StudentDashboard = () => {
    const { user, userData } = useAuth();
    const [projects, setProjects] = useState([]);
    const [mentorRequests, setMentorRequests] = useState([]);
    const [teamInvites, setTeamInvites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    // Fetch projects via API (more reliable than Firestore direct)
    useEffect(() => {
        if (!user) return;
        const fetchData = async () => {
            try {
                const token = await auth.currentUser?.getIdToken();
                const headers = { 'Authorization': `Bearer ${token}` };

                const [projRes, reqRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/projects/user`, { headers }).catch(() => null),
                    fetch(`${API_BASE_URL}/api/mentor/requests?role=student`, { headers }).catch(() => null),
                ]);

                if (projRes?.ok) {
                    const data = await projRes.json();
                    setProjects(data.data?.projects || data.projects || []);
                }
                if (reqRes?.ok) {
                    const data = await reqRes.json();
                    setMentorRequests(data.requests || []);
                }
            } catch (err) {
                console.error('[Dashboard] Fetch error:', err);
            }
            setLoading(false);
        };
        fetchData();
    }, [user, refreshKey]);

    // Real-time team invites
    useFirestoreListener(
        () => {
            if (!user) return null;
            return query(collection(db, 'team_invites'), where('receiverId', '==', user.uid), where('status', '==', 'pending'), limit(10));
        },
        (data) => setTeamInvites(data),
        [user?.uid]
    );

    const pendingRequests = mentorRequests.filter(r => r.status === 'pending');
    const activeProjects = projects.filter(p => p.status !== 'completed');
    const avgProgress = projects.length > 0
        ? Math.round(projects.reduce((sum, p) => sum + (p.progress || 0), 0) / projects.length)
        : 0;

    const handleWithdrawMentorRequest = async (requestId) => {
        // Optimistic UI update
        const previousRequests = [...mentorRequests];
        setMentorRequests(prev => prev.filter(r => r.id !== requestId));

        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/mentor/request/${requestId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to withdraw');
        } catch (err) {
            console.error('Withdraw error:', err);
            setMentorRequests(previousRequests);
            alert('Failed to withdraw request. Please try again.');
        }
    };

    const handleRespondToInvite = async (inviteId, action) => {
        // Optimistic UI update
        const previousInvites = [...teamInvites];
        setTeamInvites(prev => prev.filter(inv => inv.id !== inviteId));

        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/team-invite/respond`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ inviteId, action })
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to respond to invite');
            }
            if (action === 'accepted') {
                setRefreshKey(prev => prev + 1);
            }
        } catch (err) {
            console.error('[Dashboard] Invitation response error:', err);
            setTeamInvites(previousInvites);
            alert(err.message || 'Failed to respond to invitation. Please try again.');
        }
    };

    const stats = [
        { label: 'Active Projects', value: activeProjects.length, icon: FolderKanban, color: '#4F46E5' },
        { label: 'Mentor Requests', value: pendingRequests.length, icon: GraduationCap, color: '#f59e0b', sub: 'pending' },
        { label: 'Team Invites', value: teamInvites.length, icon: Users, color: '#3b82f6', sub: 'pending' },
        { label: 'Avg Progress', value: `${avgProgress}%`, icon: TrendingUp, color: '#8b5cf6' },
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">Welcome back, {userData?.name || 'Student'}</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Here's your project overview</p>
                </div>
                <Link to="/projects/create" className="zen-btn-primary flex items-center gap-1.5 text-sm">
                    <Plus className="h-3.5 w-3.5" /> New Project
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {stats.map(stat => (
                    <div key={stat.label} className="zen-card p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: `${stat.color}10` }}>
                                <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
                            </div>
                            {stat.sub && <span className="text-[10px] text-slate-400 font-medium">{stat.sub}</span>}
                        </div>
                        <p className="zen-stat-value text-2xl">{stat.value}</p>
                        <p className="zen-stat-label">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Recent Projects */}
                <div className="lg:col-span-2 zen-card">
                    <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-zen-border)' }}>
                        <h2 className="text-sm font-semibold text-slate-900">Recent Projects</h2>
                        <Link to="/projects/my" className="text-xs font-medium flex items-center gap-1 hover:underline" style={{ color: '#4F46E5' }}>
                            View all <ArrowRight className="h-3 w-3" />
                        </Link>
                    </div>
                    <div className="divide-y" style={{ borderColor: 'var(--color-zen-border)' }}>
                        {projects.length === 0 ? (
                            <div className="zen-empty py-12">
                                <FolderKanban className="h-8 w-8 zen-empty-icon" />
                                <p className="zen-empty-title">No projects yet</p>
                                <p className="zen-empty-desc">Create your first project to get started</p>
                                <Link to="/projects/create" className="zen-btn-primary mt-4 text-xs">Create Project</Link>
                            </div>
                        ) : projects.slice(0, 5).map(project => (
                            <Link
                                key={project.id}
                                to={`/projects/${project.id}`}
                                className="flex items-center justify-between p-3 hover:bg-slate-50/50 transition-colors"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-slate-900 truncate">{project.title}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        {project.domain && <span className="zen-badge-neutral text-[10px]">{project.domain}</span>}
                                        <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                            <Users className="h-2.5 w-2.5" />
                                            {project.members?.length || 1} members
                                        </span>
                                    </div>
                                </div>
                                {project.progress !== undefined && (
                                    <div className="ml-3 text-right flex-shrink-0">
                                        <p className="text-xs font-medium" style={{ color: '#4F46E5' }}>{project.progress || 0}%</p>
                                        <div className="w-16 zen-progress mt-1">
                                            <div className="zen-progress-bar" style={{ width: `${project.progress || 0}%` }} />
                                        </div>
                                    </div>
                                )}
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Activity & Invites */}
                <div className="space-y-4">
                    {/* Team Invites */}
                    <div className="zen-card">
                        <div className="p-4" style={{ borderBottom: '1px solid var(--color-zen-border)' }}>
                            <h2 className="text-sm font-semibold text-slate-900">Team Invitations</h2>
                        </div>
                        <div className="p-2 divide-y divide-slate-100 dark:divide-slate-800">
                            {teamInvites.length === 0 ? (
                                <p className="text-xs text-slate-400 text-center py-6 font-medium">No pending invitations</p>
                            ) : teamInvites.slice(0, 3).map(invite => (
                                <div key={invite.id} className="p-2.5 flex flex-col gap-2">
                                    <div className="min-w-0">
                                        <p className="text-sm text-slate-900 font-medium truncate">{invite.projectTitle || 'Project'}</p>
                                        <p className="text-xs text-slate-400 mt-0.5 font-medium">from {invite.inviterName || 'Someone'}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleRespondToInvite(invite.id, 'accepted')}
                                            className="px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 text-[10px] font-bold hover:bg-indigo-100 transition-colors"
                                        >
                                            Accept
                                        </button>
                                        <button
                                            onClick={() => handleRespondToInvite(invite.id, 'rejected')}
                                            className="px-2.5 py-1 rounded bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/20 text-[10px] font-bold hover:bg-red-100 transition-colors"
                                        >
                                            Decline
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Mentor Requests */}
                    <div className="zen-card">
                        <div className="p-4" style={{ borderBottom: '1px solid var(--color-zen-border)' }}>
                            <h2 className="text-sm font-semibold text-slate-900">Mentor Requests</h2>
                        </div>
                        <div className="p-2">
                            {mentorRequests.length === 0 ? (
                                <div className="py-6 text-center">
                                    <p className="text-xs text-slate-400 font-medium">No mentor requests</p>
                                    <Link to="/request-mentor" className="text-xs font-semibold mt-1 inline-block hover:underline" style={{ color: '#4F46E5' }}>Find a mentor</Link>
                                </div>
                            ) : mentorRequests.slice(0, 3).map(req => (
                                <div key={req.id} className="p-2 rounded-lg flex items-center justify-between">
                                    <div className="min-w-0">
                                        <p className="text-sm text-slate-900 font-medium truncate">{req.mentorName || 'Mentor'}</p>
                                        <p className="text-xs text-slate-400 font-medium">{req.projectTitle || ''}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                            req.status === 'accepted' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                            req.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-100' :
                                            'bg-amber-50 text-amber-700 border-amber-100'
                                        }`}>
                                            {req.status}
                                        </span>
                                        {req.status === 'pending' && (
                                            <button 
                                                onClick={() => handleWithdrawMentorRequest(req.id)}
                                                className="text-[10px] text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                                            >
                                                <XCircle className="h-3 w-3" /> Withdraw
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="zen-card p-4 space-y-2">
                        <h2 className="text-sm font-semibold text-slate-900 mb-3">Quick Actions</h2>
                        <Link to="/find-team" className="zen-btn-secondary w-full text-center text-xs py-2 block font-medium">Find Teammates</Link>
                        <Link to="/ai-chat" className="zen-btn-secondary w-full text-center text-xs py-2 block font-medium">Ask AI Assistant</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;