import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Bell, Users, MessageSquare, Briefcase, Loader2, Inbox, Clock, Check, X, ExternalLink, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../../apiConfig';
import { db } from '../../firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import useFirestoreListener from '../../hooks/useFirestoreListener';

const Notifications = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [pendingInvites, setPendingInvites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [respondingId, setRespondingId] = useState(null);
    const [errorBanner, setErrorBanner] = useState(null);

    useFirestoreListener(
        () => {
            if (!user) return null;
            return query(collection(db, 'notifications'), where('userId', '==', user.uid), limit(50));
        },
        (data) => {
            const notifs = [...data].sort((a, b) => (b.time || '').localeCompare(a.time || ''));
            setNotifications(notifs);
            setLoading(false);
        },
        [],
        () => setLoading(false)
    );

    useFirestoreListener(
        () => {
            if (!user) return null;
            return query(collection(db, 'team_invites'), where('receiverId', '==', user.uid));
        },
        (data) => {
            const invites = data.filter(inv => inv.status === 'pending').sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
            setPendingInvites(invites);
        },
        []
    );

    const respondToInvite = async (inviteId, action) => {
        // Optimistic UI Update
        const previousInvites = [...pendingInvites];
        const previousNotifs = [...notifications];

        setPendingInvites(prev => prev.filter(i => i.id !== inviteId));
        setNotifications(prev => prev.map(n => {
            if (n.metadata?.inviteId === inviteId) {
                return { ...n, read: true, title: action === 'accepted' ? '✅ Invite Accepted' : '❌ Invite Declined' };
            }
            return n;
        }));

        try {
            const response = await fetch(`${API_BASE_URL}/api/team-invite/respond`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await user.getIdToken()}` },
                body: JSON.stringify({ inviteId, action })
            });
            if (!response.ok) throw new Error('API request failed');
        } catch (err) { 
            console.error('Error responding to invite:', err); 
            // Revert state on failure
            setPendingInvites(previousInvites);
            setNotifications(previousNotifs);
            setErrorBanner('Failed to process your response. Please check your connection and try again.');
        }
    };

    const markAsRead = async (notifId) => {
        try {
            await fetch(`${API_BASE_URL}/api/notifications/${notifId}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${await user.getIdToken()}` }
            });
            setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
        } catch (err) { console.error('Error marking notification as read:', err); }
    };

    const iconColors = { invite: '#3b82f6', team: '#4F46E5', mentor: '#8b5cf6', system: '#f59e0b' };
    const IconMap = { invite: Briefcase, team: Users, mentor: MessageSquare, system: Bell };

    const filtered = filter === 'all' ? notifications : notifications.filter(n => n.type === filter);
    const getInviteForNotif = (notif) => {
        if (notif.type !== 'invite' || !notif.metadata?.inviteId) return null;
        return pendingInvites.find(i => i.id === notif.metadata.inviteId);
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
            {/* Persistent Error Banner */}
            {errorBanner && (
                <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700 animate-fade-in">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                        <span>{errorBanner}</span>
                    </div>
                    <button onClick={() => setErrorBanner(null)} className="p-0.5 hover:bg-red-100 rounded transition-colors">
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Bell className="h-5 w-5" style={{ color: '#4F46E5' }} /> Notifications
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">Stay updated with project invites and mentor responses</p>
                </div>
                {notifications.filter(n => !n.read).length > 0 && (
                    <span className="zen-badge text-[10px]">{notifications.filter(n => !n.read).length} new</span>
                )}
            </div>

            {/* Pending Invites */}
            {pendingInvites.length > 0 && (
                <div className="zen-card p-4 space-y-3" style={{ background: 'rgba(79,70,229,0.03)', borderColor: 'rgba(79,70,229,0.15)' }}>
                    <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <Users className="h-4 w-4" style={{ color: '#4F46E5' }} />
                        Pending Team Invites ({pendingInvites.length})
                    </h3>
                    {pendingInvites.map(invite => (
                        <div key={invite.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(15,23,42,0.03)', border: '1px solid var(--color-zen-border)' }}>
                            <div>
                                <p className="text-sm font-medium text-slate-900">Project Invite</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">From: {invite.senderId?.substring(0, 8)}... • {new Date(invite.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Link to={`/projects/${invite.projectId}`} className="zen-btn-secondary text-xs py-1 px-2 flex items-center gap-1">
                                    <ExternalLink className="h-3 w-3" /> View
                                </Link>
                                <button onClick={() => respondToInvite(invite.id, 'accepted')} disabled={respondingId === invite.id}
                                    className="px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-all"
                                    style={{ background: 'rgba(79,70,229,0.15)', color: '#4F46E5', border: '1px solid rgba(79,70,229,0.2)' }}>
                                    {respondingId === invite.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Accept
                                </button>
                                <button onClick={() => respondToInvite(invite.id, 'rejected')} disabled={respondingId === invite.id}
                                    className="zen-btn-danger text-xs py-1 px-2 flex items-center gap-1">
                                    <X className="h-3 w-3" /> Decline
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Filter */}
            <div className="zen-tabs">
                {['all', 'invite', 'team', 'mentor', 'system'].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`zen-tab capitalize ${filter === f ? 'zen-tab-active' : ''}`}>
                        {f}
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="space-y-2">
                {loading ? (
                    <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" style={{ color: '#4F46E5' }} /></div>
                ) : filtered.length === 0 ? (
                    <div className="zen-card zen-empty py-16">
                        <Inbox className="h-10 w-10 zen-empty-icon" />
                        <p className="zen-empty-title">No notifications</p>
                    </div>
                ) : filtered.map(n => {
                    const pendingInvite = getInviteForNotif(n);
                    const Icon = IconMap[n.type] || Bell;
                    const color = iconColors[n.type] || '#64748B';

                    return (
                        <div key={n.id} onClick={() => !n.read && markAsRead(n.id)}
                            className="zen-card p-4 flex items-start gap-3 cursor-pointer transition-all"
                            style={{ background: !n.read ? 'rgba(79,70,229,0.03)' : undefined, borderColor: !n.read ? 'rgba(79,70,229,0.1)' : undefined }}>
                            <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${color}15` }}>
                                <Icon className="h-4 w-4" style={{ color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <h4 className={`text-sm truncate ${!n.read ? 'font-semibold text-slate-900' : 'font-medium text-slate-500'}`}>{n.title}</h4>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <Clock className="h-2.5 w-2.5 text-slate-400" />
                                        <span className="text-[10px] text-slate-400">{new Date(n.time).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}</span>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>

                                {pendingInvite && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <button onClick={(e) => { e.stopPropagation(); respondToInvite(pendingInvite.id, 'accepted'); }}
                                            disabled={respondingId === pendingInvite.id}
                                            className="px-2.5 py-1 rounded-md text-[10px] font-medium flex items-center gap-1"
                                            style={{ background: 'rgba(79,70,229,0.1)', color: '#4F46E5', border: '1px solid rgba(79,70,229,0.2)' }}>
                                            <Check className="h-2.5 w-2.5" /> Accept
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); respondToInvite(pendingInvite.id, 'rejected'); }}
                                            disabled={respondingId === pendingInvite.id}
                                            className="zen-btn-danger text-[10px] py-1 px-2 flex items-center gap-1">
                                            <X className="h-2.5 w-2.5" /> Decline
                                        </button>
                                        <Link to={`/projects/${pendingInvite.projectId}`} onClick={e => e.stopPropagation()}
                                            className="text-[10px] font-medium hover:underline" style={{ color: '#4F46E5' }}>View Project →</Link>
                                    </div>
                                )}
                            </div>
                            {!n.read && <div className="h-2 w-2 rounded-full flex-shrink-0 mt-2" style={{ background: '#4F46E5' }} />}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Notifications;