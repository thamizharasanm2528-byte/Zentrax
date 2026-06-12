import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../apiConfig';
import {
    Rocket,
    Users,
    CheckCircle2,
    Circle,
    Plus,
    ArrowLeft,
    Calendar,
    Layout,
    Trash2,
    Loader2,
    X,
    User,
    Star,
    Zap,
    PlayCircle,
    Target,
    MessageCircle,
    Send,
    Check,
    UserPlus,
    Shield,
    AlertTriangle,
    Settings,
    UserMinus,
    Crown,
    Clock,
    List,
    HelpCircle,
    Search
} from 'lucide-react';

import ProjectActivityTimeline from '../../components/ProjectActivityTimeline';
import PresenceDot from '../../components/PresenceDot';
import KanbanBoard from '../../components/KanbanBoard';
import TaskCard from '../../components/TaskCard';
import TaskDetailModal from '../../components/TaskDetailModal';
import { useAuth } from '../../context/AuthContext';

const STATUS_COLORS = {
    'Planning': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    'Development': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    'Testing': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
    'Completed': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
    'Searching': 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800',
};

const ProjectRoom = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tasks, setTasks] = useState([]);
    const [newTask, setNewTask] = useState('');
    const [showAddTask, setShowAddTask] = useState(false);
    const [editingStatus, setEditingStatus] = useState(false);
    const [saving, setSaving] = useState(false);
    const [memberInfo, setMemberInfo] = useState({});

    // Task view mode & detail
    const [taskViewMode, setTaskViewMode] = useState('list'); // 'list' | 'board'
    const [selectedTask, setSelectedTask] = useState(null);

    // Color palette for member avatars
    const MEMBER_COLORS = ['bg-emerald-500', 'bg-violet-500', 'bg-sky-500', 'bg-rose-500', 'bg-teal-500', 'bg-indigo-500'];

    // Delete project modal
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Remove member
    const [removingMember, setRemovingMember] = useState(null);
    const [memberToRemove, setMemberToRemove] = useState(null); // { id, name, role }

    // Team Discussion state
    const [messages, setMessages] = useState([]);
    const [msgInput, setMsgInput] = useState('');
    const [msgLoading, setMsgLoading] = useState(false);
    const chatEndRef = useRef(null);

    // Join Requests state (for project owners)
    const [joinRequests, setJoinRequests] = useState([]);
    const [respondingJoinId, setRespondingJoinId] = useState(null);

    // Invite Students state
    const [showInvitePanel, setShowInvitePanel] = useState(false);
    const [inviteSearch, setInviteSearch] = useState('');
    const [inviteResults, setInviteResults] = useState([]);
    const [inviteSearching, setInviteSearching] = useState(false);
    const [invitedIds, setInvitedIds] = useState(new Set());
    const [invitingId, setInvitingId] = useState(null);

    // ─── Ownership check ───
    const isOwner = project && user && (project.createdBy === user.uid || project.authorId === user.uid || project.owner_id === user.uid);

    const getToken = async () => {
        if (!user) return null;
        try {
            return await user.getIdToken();
        } catch (err) {
            console.error("Token error:", err);
            return null;
        }
    };

    const fetchProject = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/projects/${id}`, {
                headers: { 'Authorization': `Bearer ${await getToken()}` }
            });
            const data = await response.json();
            const projectData = data.success ? data.data.project : data.project;
            if (projectData) {
                setProject(projectData);
                if (projectData.tasks) setTasks(projectData.tasks);
                // Fetch member names
                fetchMemberNames(projectData.members || []);
            }
        } catch (err) {
            console.error('Error fetching project:', err);
        }
        setLoading(false);
    };

    const fetchMemberNames = async (memberIds) => {
        try {
            const token = await getToken();
            const info = {};
            for (const mid of memberIds) {
                try {
                    const res = await fetch(`${API_BASE_URL}/api/users/${mid}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const data = await res.json();
                    info[mid] = {
                        name: data.user?.name || data.name || `User ${mid.substring(0, 6)}`,
                        role: data.user?.role || data.role || 'student'
                    };
                } catch { info[mid] = { name: `User ${mid.substring(0, 6)}`, role: 'student' }; }
            }
            setMemberInfo(info);
        } catch { /* ignore */ }
    };

    const fetchMessages = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/projects/${id}/discussions`, {
                headers: { 'Authorization': `Bearer ${await getToken()}` }
            });
            const data = await response.json();
            if (data.messages) setMessages(data.messages);
        } catch (err) {
            console.error('Error fetching discussions:', err);
        }
    };

    const fetchJoinRequests = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/join/requests/${id}`, {
                headers: { 'Authorization': `Bearer ${await getToken()}` }
            });
            const data = await response.json();
            if (data.requests) setJoinRequests(data.requests);
        } catch (err) {
            console.error('Error fetching join requests:', err);
        }
    };

    useEffect(() => {
        if (id && user) {
            fetchProject();
            fetchMessages();
            fetchJoinRequests();
            const interval = setInterval(fetchMessages, 10000);
            return () => clearInterval(interval);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, user]);

    const respondToJoinRequest = async (requestId, action) => {
        setRespondingJoinId(requestId);
        try {
            await fetch(`${API_BASE_URL}/api/join/${action}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await getToken()}`
                },
                body: JSON.stringify({ requestId })
            });
            fetchJoinRequests();
            fetchProject();
        } catch (err) {
            console.error('Error responding to join request:', err);
        }
        setRespondingJoinId(null);
    };

    // Only scroll to bottom when user sends a message, not on background polling
    const shouldScrollChat = useRef(false);
    useEffect(() => {
        if (shouldScrollChat.current) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            shouldScrollChat.current = false;
        }
    }, [messages]);

    const sendMessage = async () => {
        if (!msgInput.trim()) return;
        const text = msgInput.trim();

        shouldScrollChat.current = true;
        const tempMsg = { id: 'temp-' + Date.now(), userId: user.uid, userName: user.email?.split('@')[0] || 'You', text, createdAt: new Date().toISOString() };
        setMessages(prev => [...prev, tempMsg]);
        setMsgInput('');
        setMsgLoading(true);

        try {
            await fetch(`${API_BASE_URL}/api/projects/${id}/discussions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await getToken()}`
                },
                body: JSON.stringify({ text })
            });
            fetchMessages();
        } catch (err) {
            console.error('Error sending message:', err);
        }
        setMsgLoading(false);
    };

    const saveTasks = async (updatedTasks) => {
        try {
            await fetch(`${API_BASE_URL}/api/projects/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await getToken()}`
                },
                body: JSON.stringify({ tasks: updatedTasks })
            });
        } catch (err) {
            console.error('Error saving tasks:', err);
        }
    };

    const addTask = () => {
        if (!newTask.trim() || !isOwner) return;
        const updated = [...tasks, { id: Date.now(), title: newTask.trim(), status: 'pending' }];
        setTasks(updated);
        setNewTask('');
        setShowAddTask(false);
        saveTasks(updated);
    };

    const toggleTask = async (taskId) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const nextStatus = task.status === 'completed' ? 'pending' : task.status === 'pending' ? 'in-progress' : 'completed';

        if (isOwner) {
            // Owner can toggle any task
            const updated = tasks.map(t => t.id === taskId ? { ...t, status: nextStatus } : t);
            setTasks(updated);
            saveTasks(updated);
        } else {
            // Member: use the dedicated endpoint (server checks ownership)
            try {
                await fetch(`${API_BASE_URL}/api/projects/${id}/task-status`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${await getToken()}`
                    },
                    body: JSON.stringify({ taskId, status: nextStatus })
                });
                setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: nextStatus } : t));
            } catch (err) {
                console.error('Error toggling task:', err);
            }
        }
    };

    const deleteTask = (taskId) => {
        if (!isOwner) return;
        const updated = tasks.filter(t => t.id !== taskId);
        setTasks(updated);
        saveTasks(updated);
        setSelectedTask(null);
    };

    // Move task to a new status column (for Kanban drag-and-drop)
    const moveTask = (taskId, newStatus) => {
        const updated = tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
        setTasks(updated);
        saveTasks(updated);
    };

    // Save full task detail (from TaskDetailModal)
    const saveTaskDetail = (updatedTask) => {
        const updated = tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
        setTasks(updated);
        saveTasks(updated);
        setSelectedTask(null);
    };

    const updateStatus = async (newStatus) => {
        if (!isOwner) return;
        setSaving(true);
        try {
            await fetch(`${API_BASE_URL}/api/projects/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await getToken()}`
                },
                body: JSON.stringify({ status: newStatus })
            });
            setProject(prev => ({ ...prev, status: newStatus }));
        } catch (err) {
            console.error('Error updating status:', err);
        }
        setSaving(false);
        setEditingStatus(false);
    };

    const handleDeleteProject = async () => {
        setDeleting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/projects/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${await getToken()}` }
            });
            if (res.ok) {
                navigate('/projects/my');
            }
        } catch (err) {
            console.error('Error deleting project:', err);
        }
        setDeleting(false);
        setShowDeleteModal(false);
    };

    const handleRemoveMember = (memberId) => {
        if (!isOwner || memberId === user.uid) return;
        const info = memberInfo[memberId] || {};
        const name = info.name || `User ${memberId.substring(0, 8)}`;
        const role = (info.role || 'student').toLowerCase();
        setMemberToRemove({ id: memberId, name, role });
    };

    const confirmRemoveMember = async () => {
        if (!memberToRemove) return;
        const memberId = memberToRemove.id;
        setRemovingMember(memberId);
        setMemberToRemove(null);
        try {
            await fetch(`${API_BASE_URL}/api/projects/${id}/remove-member`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await getToken()}`
                },
                body: JSON.stringify({ memberId })
            });
            fetchProject();
        } catch (err) {
            console.error('Error removing member:', err);
        }
        setRemovingMember(null);
    };

    // ─── Invite Student Search ───
    const searchStudents = async (query) => {
        if (!query.trim() || query.length < 2) {
            setInviteResults([]);
            return;
        }
        setInviteSearching(true);
        try {
            const token = await getToken();
            const res = await fetch(`${API_BASE_URL}/api/users?role=student`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const users = data.users || data.data || (Array.isArray(data) ? data : []);
                // Filter: match name, exclude current members and self
                const members = new Set(project?.members || []);
                members.add(user.uid);
                const filtered = users.filter(u => 
                    !members.has(u.id || u.uid) &&
                    (u.name || '').toLowerCase().includes(query.toLowerCase())
                ).slice(0, 5);
                setInviteResults(filtered);
            }
        } catch (err) {
            console.error('[Invite] Search error:', err);
        }
        setInviteSearching(false);
    };

    // Debounced search
    useEffect(() => {
        if (!showInvitePanel) return;
        const timer = setTimeout(() => searchStudents(inviteSearch), 300);
        return () => clearTimeout(timer);
    }, [inviteSearch, showInvitePanel]);

    const inviteStudent = async (studentId) => {
        setInvitingId(studentId);
        try {
            const token = await getToken();
            await fetch(`${API_BASE_URL}/api/team-invite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ projectId: id, inviteeId: studentId })
            });
            setInvitedIds(prev => new Set(prev).add(studentId));
        } catch (err) {
            console.error('[Invite] Error:', err);
        }
        setInvitingId(null);
    };

    const completedCount = tasks.filter(t => t.status === 'completed').length;
    const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
    const ownerId = project?.createdBy || project?.authorId || project?.owner_id;
    const hasMentor = Object.values(memberInfo).some(m => (m.role || '').toLowerCase() === 'mentor');
    // Count only students toward team size (mentors are separate)
    const studentMembers = (project?.members || []).filter(mid => (memberInfo[mid]?.role || 'student').toLowerCase() !== 'mentor');
    const mentorMembers = (project?.members || []).filter(mid => (memberInfo[mid]?.role || '').toLowerCase() === 'mentor');
    const studentCount = studentMembers.length;
    const maxTeamSize = project?.teamSize || 5;
    const isTeamFull = studentCount >= maxTeamSize;

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
        </div>
    );

    if (!project) return (
        <div className="py-20 text-center space-y-4">
            <Rocket className="h-12 w-12 mx-auto text-gray-300" />
            <p className="text-gray-500">Project not found.</p>
            <Link to="/projects/my" className="text-primary-600 text-sm font-semibold hover:underline">← Back to My Projects</Link>
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-2xl p-8 max-w-md w-full space-y-6">
                        <div className="text-center space-y-3">
                            <div className="h-14 w-14 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto">
                                <AlertTriangle className="h-7 w-7 text-red-500" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Project?</h3>
                            <p className="text-sm text-gray-500 leading-relaxed">
                                Are you sure you want to delete <strong>"{project.title}"</strong>? This will permanently remove all tasks, join requests, and discussions. This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteModal(false)} disabled={deleting}
                                className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all">
                                Cancel
                            </button>
                            <button onClick={handleDeleteProject} disabled={deleting}
                                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all flex items-center justify-center disabled:opacity-50">
                                {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                                Delete Forever
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Remove Member Confirmation Modal */}
            {memberToRemove && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-2xl p-8 max-w-md w-full space-y-6 animate-fade-in">
                        <div className="text-center space-y-3">
                            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center mx-auto ${
                                memberToRemove.role === 'mentor'
                                    ? 'bg-purple-100 dark:bg-purple-900/30'
                                    : 'bg-red-100 dark:bg-red-900/30'
                            }`}>
                                <UserMinus className={`h-7 w-7 ${
                                    memberToRemove.role === 'mentor' ? 'text-purple-500' : 'text-red-500'
                                }`} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                Remove {memberToRemove.role === 'mentor' ? 'Mentor' : 'Member'}?
                            </h3>
                            <p className="text-sm text-gray-500 leading-relaxed">
                                Are you sure you want to remove <strong>"{memberToRemove.name}"</strong> from this project?
                                {memberToRemove.role === 'mentor'
                                    ? ' They will no longer be able to guide or review this project.'
                                    : ' They will lose access to all project tasks and discussions.'}
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setMemberToRemove(null)}
                                className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all">
                                Cancel
                            </button>
                            <button onClick={confirmRemoveMember}
                                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all flex items-center justify-center">
                                <UserMinus className="h-4 w-4 mr-2" />
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <Link to="/projects/my" className="flex items-center text-sm text-gray-500 hover:text-primary-600 transition-colors">
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back to My Projects
                </Link>
                <div className="flex items-center gap-4">
                    <Link to={`/mentorship/doubts?projectId=${id}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-colors">
                        <HelpCircle className="h-3.5 w-3.5" /> Ask Mentor
                    </Link>
                    {isOwner && (
                        <button onClick={() => setShowDeleteModal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
                            <Trash2 className="h-3.5 w-3.5" /> Delete Project
                        </button>
                    )}
                </div>
            </div>

            {/* Project Header */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start space-x-5">
                        <div className="h-16 w-16 bg-primary-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary-500/30 shrink-0">
                            <Rocket className="h-8 w-8" />
                        </div>
                        <div>
                            <div className="flex items-center flex-wrap gap-3">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{project.title}</h1>
                                {/* Status — clickable only for owner */}
                                {isOwner && editingStatus ? (
                                    <div className="flex items-center gap-2">
                                        {['Planning', 'Development', 'Testing', 'Completed'].map(s => (
                                            <button key={s} onClick={() => updateStatus(s)} disabled={saving}
                                                className={`px-3 py-1 text-xs font-bold rounded-full border transition-all hover:scale-105 ${STATUS_COLORS[s] || ''}`}>{s}</button>
                                        ))}
                                        <button onClick={() => setEditingStatus(false)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
                                    </div>
                                ) : (
                                    <button onClick={() => isOwner && setEditingStatus(true)}
                                        className={`px-3 py-1 text-xs font-bold rounded-full border transition-all ${isOwner ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} ${STATUS_COLORS[project.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                        {project.status}
                                    </button>
                                )}
                            </div>
                            <p className="text-gray-500 mt-1 max-w-2xl text-sm leading-relaxed">{project.description}</p>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                                    Students: {studentCount} / {maxTeamSize}
                                </p>
                                {isTeamFull && (
                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3" /> Team Complete
                                    </span>
                                )}
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border flex items-center gap-1 ${hasMentor
                                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700'}`}>
                                    <Shield className="h-3 w-3" /> Mentor: {hasMentor ? '1/1' : '0/1'}
                                </span>
                            </div>
                        </div>
                    </div>
                    {/* Team member avatars — students + mentor separated */}
                    <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-3">
                            {/* Student avatars */}
                            <div className="flex -space-x-2">
                                {studentMembers.map((memberId, i) => {
                                    const isThisOwner = memberId === ownerId;
                                    const mName = memberInfo[memberId]?.name || (memberId === user?.uid ? 'You' : `S${i + 1}`);
                                    const initials = mName.length >= 2 ? mName.substring(0, 2).toUpperCase() : mName.toUpperCase();
                                    const colorClass = MEMBER_COLORS[i % MEMBER_COLORS.length];
                                    return (
                                        <div key={memberId}
                                            title={`${mName}${isThisOwner ? ' (Leader)' : ''}`}
                                            className={`inline-flex h-10 w-10 rounded-full ring-2 ring-white dark:ring-gray-800 items-center justify-center text-[11px] font-bold text-white shadow-lg transition-transform hover:scale-110 hover:z-10 cursor-default ${isThisOwner
                                                ? 'bg-gradient-to-br from-amber-400 to-amber-600'
                                                : colorClass
                                            }`}>
                                            {isThisOwner ? <Crown className="h-4 w-4 drop-shadow" /> : initials}
                                        </div>
                                    );
                                })}
                                {isOwner && !isTeamFull && (
                                    <Link to="/find-team" className="inline-flex h-10 w-10 rounded-full ring-2 ring-white dark:ring-gray-800 bg-gray-200 dark:bg-gray-600 items-center justify-center text-gray-500 dark:text-gray-300 hover:text-primary-600 hover:bg-primary-100 dark:hover:bg-primary-700 transition-all shadow-lg hover:scale-110">
                                        <Plus className="h-4 w-4" />
                                    </Link>
                                )}
                            </div>
                            {/* Mentor avatar — separated with divider */}
                            {mentorMembers.length > 0 && (
                                <>
                                    <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
                                    {mentorMembers.map((memberId) => {
                                        const mName = memberInfo[memberId]?.name || 'Mentor';
                                        const initials = mName.length >= 2 ? mName.substring(0, 2).toUpperCase() : mName.toUpperCase();
                                        return (
                                            <div key={memberId}
                                                title={`${mName} (Mentor)`}
                                                className="inline-flex h-10 w-10 rounded-full ring-2 ring-purple-300 dark:ring-purple-700 items-center justify-center text-[11px] font-bold text-white shadow-lg transition-transform hover:scale-110 hover:z-10 cursor-default bg-gradient-to-br from-purple-500 to-indigo-600">
                                                {initials}
                                            </div>
                                        );
                                    })}
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                    {project.techStack?.map(tech => (
                        <span key={tech} className="px-3 py-1 bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 text-xs rounded-lg border border-gray-200 dark:border-gray-600">{tech}</span>
                    ))}
                    {project.requiredSkills?.map(skill => (
                        <span key={skill} className="px-3 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 text-xs rounded-lg border border-purple-200 dark:border-purple-800">{skill}</span>
                    ))}
                </div>
                {tasks.length > 0 && (
                    <div className="mt-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Progress</span>
                            <span className="text-xs font-bold text-primary-600">{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                            <div className="bg-primary-600 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                )}
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Task List */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                            <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
                                <Layout className="h-5 w-5 mr-2 text-primary-500" /> Project Tasks
                                {tasks.length > 0 && <span className="ml-2 text-xs text-gray-400 font-normal">({completedCount}/{tasks.length})</span>}
                            </h3>
                            <div className="flex items-center gap-2">
                                {/* View Mode Toggle */}
                                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-0.5">
                                    <button onClick={() => setTaskViewMode('list')}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 ${taskViewMode === 'list' ? 'bg-white dark:bg-gray-600 text-gray-700 dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                                        <List className="h-3 w-3" /> List
                                    </button>
                                    <button onClick={() => setTaskViewMode('board')}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 ${taskViewMode === 'board' ? 'bg-white dark:bg-gray-600 text-gray-700 dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                                        <Layout className="h-3 w-3" /> Board
                                    </button>
                                </div>
                                {/* Add Task — owner only */}
                                {isOwner && (
                                    <button onClick={() => setShowAddTask(!showAddTask)} className="text-sm font-semibold text-primary-600 hover:text-primary-500 flex items-center">
                                        {showAddTask ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                                        {showAddTask ? 'Cancel' : 'Add'}
                                    </button>
                                )}
                            </div>
                        </div>
                        {showAddTask && isOwner && (
                            <div className="p-4 bg-primary-50/50 dark:bg-primary-900/10 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
                                <input type="text" className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                    placeholder="Enter task name..." value={newTask} onChange={(e) => setNewTask(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addTask(); }} autoFocus />
                                <button onClick={addTask} disabled={!newTask.trim()} className="px-4 py-2.5 bg-primary-600 text-white text-xs font-bold rounded-xl hover:bg-primary-500 disabled:opacity-50 transition-all">Add</button>
                            </div>
                        )}
                        <div className={taskViewMode === 'board' ? 'p-4' : 'divide-y divide-gray-50 dark:divide-gray-700'}>
                            {tasks.length === 0 ? (
                                <div className="p-10 text-center space-y-3">
                                    <Target className="h-10 w-10 mx-auto text-gray-200" />
                                    <p className="text-sm text-gray-400">{isOwner ? 'No tasks yet. Click "+ Add" to start.' : 'No tasks yet.'}</p>
                                </div>
                            ) : taskViewMode === 'board' ? (
                                <KanbanBoard
                                    tasks={tasks}
                                    memberInfo={memberInfo}
                                    onToggle={toggleTask}
                                    onDelete={deleteTask}
                                    onTaskClick={(task) => setSelectedTask(task)}
                                    onMoveTask={moveTask}
                                    isOwner={isOwner}
                                />
                            ) : tasks.map(task => (
                                <div key={task.id} className="p-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors group cursor-pointer" onClick={() => setSelectedTask(task)}>
                                    <div className="flex items-center space-x-4 flex-1">
                                        <button onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }} className="shrink-0">
                                            {task.status === 'completed' ? <CheckCircle2 className="h-5 w-5 text-green-500" /> :
                                                task.status === 'in-progress' ? <PlayCircle className="h-5 w-5 text-primary-500" /> :
                                                    <Circle className="h-5 w-5 text-gray-300 hover:text-primary-400 transition-colors" />}
                                        </button>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-sm ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-200'}`}>{task.title}</span>
                                                {task.priority && task.priority !== 'medium' && (
                                                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${task.priority === 'critical' ? 'bg-red-500 text-white' : task.priority === 'high' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>
                                                        {task.priority}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                <span className={`text-[10px] uppercase tracking-wider font-bold ${task.status === 'completed' ? 'text-green-500' : task.status === 'in-progress' ? 'text-primary-500' : 'text-gray-400'}`}>
                                                    {task.status === 'in-progress' ? 'IN PROGRESS' : task.status === 'completed' ? 'DONE' : 'TODO'}
                                                </span>
                                                {task.assignee && memberInfo[task.assignee] && (
                                                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                        <User className="h-3 w-3" /> {memberInfo[task.assignee].name}
                                                    </span>
                                                )}
                                                {task.dueDate && (
                                                    <span className={`text-[10px] flex items-center gap-1 ${new Date(task.dueDate) < new Date() && task.status !== 'completed' ? 'text-red-500' : 'text-gray-400'}`}>
                                                        <Clock className="h-3 w-3" /> {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                    </span>
                                                )}
                                                {task.comments?.length > 0 && (
                                                    <span className="text-[10px] text-gray-400">💬 {task.comments.length}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {isOwner && (
                                        <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} className="p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="space-y-6">
                    {/* ──── Team Members (Students Only) ──── */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center mb-4">
                            <Users className="h-5 w-5 mr-2 text-blue-500" /> Team Members
                            <span className="ml-auto text-xs text-gray-400 font-normal">
                                {(project.members || []).filter(mid => (memberInfo[mid]?.role || 'student').toLowerCase() !== 'mentor').length} students
                            </span>
                        </h3>
                        <div className="space-y-3">
                            {(() => {
                                let studentIndex = 0;
                                return (project.members || []).filter(mid => {
                                    const role = (memberInfo[mid]?.role || 'student').toLowerCase();
                                    return role !== 'mentor';
                                }).map((memberId) => {
                                    const isThisOwner = memberId === ownerId;
                                    const info = memberInfo[memberId] || {};
                                    const name = info.name || (memberId === user?.uid ? 'You' : `User ${memberId.substring(0, 8)}`);
                                    const initials = name.length >= 2 ? name.substring(0, 2).toUpperCase() : name.toUpperCase();
                                    const colorClass = MEMBER_COLORS[studentIndex % MEMBER_COLORS.length];
                                    studentIndex++;
                                    return (
                                        <div key={memberId} className={`flex items-center justify-between p-3 rounded-xl border transition-all hover:shadow-md ${isThisOwner
                                            ? 'bg-amber-50/60 dark:bg-amber-900/10 border-amber-200/60 dark:border-amber-700/40'
                                            : 'bg-gray-50 dark:bg-gray-700/30 border-gray-100 dark:border-gray-700'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <div className={`h-9 w-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-sm ${isThisOwner
                                                        ? 'bg-gradient-to-br from-amber-400 to-amber-600'
                                                        : colorClass}`}>
                                                        {isThisOwner ? <Crown className="h-4 w-4" /> : initials}
                                                    </div>
                                                    <PresenceDot userId={memberId} size="sm" className="absolute -bottom-0.5 -right-0.5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{name}</p>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        {isThisOwner && (
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-0.5">
                                                                ⭐ Leader
                                                            </span>
                                                        )}
                                                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                                                            Student
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            {isOwner && !isThisOwner && (
                                                <button onClick={() => handleRemoveMember(memberId)} disabled={removingMember === memberId}
                                                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all disabled:opacity-50">
                                                    {removingMember === memberId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserMinus className="h-3.5 w-3.5" />}
                                                </button>
                                            )}
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                        {/* Team Full Message */}
                        {isTeamFull && (
                            <div className="mt-4 p-3 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/40 flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                                <p className="text-xs font-semibold text-green-700 dark:text-green-400">
                                    🎉 This team has enough members! Team is complete.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* ──── Assigned Mentor ──── */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-purple-200/50 dark:border-purple-800/30 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 h-20 w-20 bg-purple-500/5 -rotate-12 translate-x-6 -translate-y-6 rounded-3xl" />
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center mb-4">
                            <Shield className="h-5 w-5 mr-2 text-purple-500" /> Assigned Mentor
                            <span className="ml-auto text-[10px] font-bold text-purple-500 uppercase tracking-wider">
                                {hasMentor ? '1 / 1' : '0 / 1'}
                            </span>
                        </h3>
                        {(() => {
                            const mentorMembers = (project.members || []).filter(mid => {
                                const role = (memberInfo[mid]?.role || 'student').toLowerCase();
                                return role === 'mentor';
                            });
                            if (mentorMembers.length === 0) {
                                return (
                                    <div className="text-center py-5 space-y-2">
                                        <div className="h-12 w-12 mx-auto rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                                            <Shield className="h-6 w-6 text-purple-300 dark:text-purple-600" />
                                        </div>
                                        <p className="text-sm text-gray-400">No mentor assigned yet.</p>
                                        <p className="text-[10px] text-gray-400">A mentor can guide and review your project.</p>
                                    </div>
                                );
                            }
                            return mentorMembers.map((memberId, i) => {
                                const info = memberInfo[memberId] || {};
                                const name = info.name || (memberId === user?.uid ? 'You' : `User ${memberId.substring(0, 8)}`);
                                const initials = name.length >= 2 ? name.substring(0, 2).toUpperCase() : name.toUpperCase();
                                return (
                                    <div key={memberId} className="flex items-center justify-between p-3.5 rounded-xl bg-purple-50/60 dark:bg-purple-900/10 border border-purple-200/60 dark:border-purple-700/40 transition-all hover:shadow-md">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className="h-10 w-10 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-md bg-gradient-to-br from-purple-500 to-indigo-600">
                                                    {initials}
                                                </div>
                                                <PresenceDot userId={memberId} size="sm" className="absolute -bottom-0.5 -right-0.5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{name}</p>
                                                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                                                    🎓 Mentor
                                                </span>
                                            </div>
                                        </div>
                                        {isOwner && (
                                            <button onClick={() => handleRemoveMember(memberId)} disabled={removingMember === memberId}
                                                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all disabled:opacity-50">
                                                {removingMember === memberId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserMinus className="h-3.5 w-3.5" />}
                                            </button>
                                        )}
                                    </div>
                                );
                            });
                        })()}
                        {hasMentor && (
                            <div className="mt-3 p-2.5 rounded-xl bg-purple-50/50 dark:bg-purple-900/10 border border-purple-200/50 dark:border-purple-800/30 flex items-center gap-2">
                                <CheckCircle2 className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                                <p className="text-[10px] font-medium text-purple-600 dark:text-purple-400">
                                    Mentor slot filled — only 1 mentor per project.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* ──── Invite Students (Owner Only) ──── */}
                    {isOwner && !isTeamFull && (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-blue-200/50 dark:border-blue-800/30 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 h-20 w-20 bg-blue-500/5 -rotate-12 translate-x-6 -translate-y-6 rounded-3xl" />
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
                                    <UserPlus className="h-5 w-5 mr-2 text-blue-500" /> Invite Student
                                </h3>
                                <button
                                    onClick={() => { setShowInvitePanel(!showInvitePanel); setInviteSearch(''); setInviteResults([]); }}
                                    className={`p-1.5 rounded-lg transition-all ${
                                        showInvitePanel
                                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                                            : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                    }`}
                                >
                                    {showInvitePanel ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
                                </button>
                            </div>

                            {showInvitePanel ? (
                                <div className="space-y-3 animate-fade-in">
                                    {/* Search Input */}
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                        <input
                                            type="text"
                                            value={inviteSearch}
                                            onChange={(e) => setInviteSearch(e.target.value)}
                                            placeholder="Search students by name..."
                                            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            autoFocus
                                        />
                                        {inviteSearching && (
                                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-blue-500" />
                                        )}
                                    </div>

                                    {/* Results */}
                                    {inviteSearch.length >= 2 && (
                                        <div className="space-y-1.5 max-h-60 overflow-y-auto">
                                            {inviteResults.length === 0 && !inviteSearching ? (
                                                <p className="text-xs text-gray-400 text-center py-4">No students found matching "{inviteSearch}"</p>
                                            ) : inviteResults.map((student) => {
                                                const sid = student.id || student.uid;
                                                const sName = student.name || 'Student';
                                                const initials = sName.length >= 2 ? sName.substring(0, 2).toUpperCase() : sName.toUpperCase();
                                                const isInvited = invitedIds.has(sid);
                                                const isInviting = invitingId === sid;
                                                return (
                                                    <div key={sid} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700 hover:shadow-sm transition-all">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[10px] font-bold text-blue-600 dark:text-blue-400">
                                                                {initials}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-900 dark:text-white">{sName}</p>
                                                                {student.skills?.length > 0 && (
                                                                    <div className="flex flex-wrap gap-1 mt-0.5">
                                                                        {student.skills.slice(0, 3).map(s => (
                                                                            <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300 font-medium">{s}</span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => inviteStudent(sid)}
                                                            disabled={isInvited || isInviting}
                                                            className={`text-[10px] px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 ${
                                                                isInvited
                                                                    ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800'
                                                                    : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40'
                                                            }`}
                                                        >
                                                            {isInviting ? (
                                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                            ) : isInvited ? (
                                                                <><Check className="h-3 w-3" /> Invited</>
                                                            ) : (
                                                                <><Send className="h-3 w-3" /> Invite</>
                                                            )}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {inviteSearch.length < 2 && (
                                        <p className="text-[10px] text-gray-400 text-center py-2">Type at least 2 characters to search</p>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-3 space-y-1">
                                    <p className="text-xs text-gray-400">Search and invite students to join your project</p>
                                    <button
                                        onClick={() => setShowInvitePanel(true)}
                                        className="text-xs font-semibold text-blue-600 hover:underline"
                                    >
                                        Search Students
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* AI Learning Roadmap */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 h-16 w-16 bg-orange-500/5 -rotate-12 translate-x-4 -translate-y-4 rounded-3xl group-hover:scale-110 transition-transform" />
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center mb-6"><Calendar className="h-5 w-5 mr-2 text-orange-500" /> AI Roadmap</h3>
                        <div className="relative pl-6 border-l-2 border-gray-100 dark:border-gray-700 space-y-6">
                            {project.roadmap?.length > 0 ? project.roadmap.map((step, i) => (
                                <div key={i} className="relative">
                                    <div className={`absolute -left-[31px] top-1 h-4 w-4 rounded-full border-4 border-white dark:border-gray-800 ${i === 0 ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 leading-snug">{step}</p>
                                </div>
                            )) : (
                                <div className="space-y-3">
                                    <p className="text-sm text-gray-400">No roadmap generated yet.</p>
                                    <p className="text-[10px] text-gray-400">Tip: Add a detailed description when creating your project.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Activity Timeline Removed at user request */}

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center mb-4"><Zap className="h-5 w-5 mr-2 text-yellow-500" /> Required Skills</h3>
                        <div className="space-y-3">
                            {(project.requiredSkills || project.requiredRoles || []).length > 0 ? (project.requiredSkills || project.requiredRoles || []).map(skill => (
                                <div key={skill} className="flex items-center justify-between p-3 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-800/20">
                                    <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">{skill}</span>
                                    {isOwner && !isTeamFull && <Link to="/find-team" className="text-[10px] font-bold text-blue-600 hover:underline">FIND MATE</Link>}
                                </div>
                            )) : <p className="text-sm text-gray-400 text-center py-4">No skills specified.</p>}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center mb-4"><Star className="h-5 w-5 mr-2 text-amber-500" /> Project Info</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between"><span className="text-gray-500">Created</span><span className="text-gray-900 dark:text-white font-medium">{project.createdAt ? new Date(project.createdAt).toLocaleDateString() : '—'}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Students</span><span className="text-gray-900 dark:text-white font-medium">{studentCount} / {maxTeamSize}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Mentor</span><span className={`font-bold text-xs ${hasMentor ? 'text-purple-600' : 'text-gray-400'}`}>{hasMentor ? '🎓 Assigned' : 'Not assigned'}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Tasks Done</span><span className="text-gray-900 dark:text-white font-medium">{completedCount}/{tasks.length}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Leader</span><span className="text-amber-600 font-bold text-xs">👑 {project.owner_name || memberInfo[ownerId]?.name || 'Creator'}</span></div>
                        </div>
                    </div>

                    {/* Host Controls section — owner only */}
                    {isOwner && (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-amber-200 dark:border-amber-800/30 shadow-sm">
                            <h3 className="font-bold text-gray-900 dark:text-white flex items-center mb-4"><Shield className="h-5 w-5 mr-2 text-amber-500" /> Host Controls</h3>
                            <div className="space-y-2">
                                <button onClick={() => setEditingStatus(true)} className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-900/10 rounded-xl transition-colors flex items-center gap-2">
                                    <Settings className="h-3.5 w-3.5 text-amber-500" /> Change Project Status
                                </button>
                                <button onClick={() => setShowAddTask(true)} className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-900/10 rounded-xl transition-colors flex items-center gap-2">
                                    <Plus className="h-3.5 w-3.5 text-amber-500" /> Add New Task
                                </button>
                                {!isTeamFull ? (
                                    <Link to="/find-team" className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-900/10 rounded-xl transition-colors flex items-center gap-2">
                                        <UserPlus className="h-3.5 w-3.5 text-amber-500" /> Find Team Members
                                    </Link>
                                ) : (
                                    <div className="px-4 py-2.5 text-xs font-semibold text-green-600 dark:text-green-400 rounded-xl flex items-center gap-2">
                                        <CheckCircle2 className="h-3.5 w-3.5" /> Team is Complete!
                                    </div>
                                )}
                                <button onClick={() => setShowDeleteModal(true)} className="w-full text-left px-4 py-2.5 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors flex items-center gap-2">
                                    <Trash2 className="h-3.5 w-3.5" /> Delete Project
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ═══════════ JOIN REQUESTS (Owner Only) ═══════════ */}
            {isOwner && joinRequests.filter(r => r.status === 'pending').length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
                            <UserPlus className="h-5 w-5 mr-2 text-green-500" />
                            Join Requests
                            <span className="ml-2 bg-green-100 dark:bg-green-900/30 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {joinRequests.filter(r => r.status === 'pending').length} pending
                            </span>
                        </h3>
                    </div>
                    <div className="divide-y divide-gray-50 dark:divide-gray-700">
                        {joinRequests.filter(r => r.status === 'pending').map(req => (
                            <div key={req.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-start gap-4 flex-1">
                                    <div className="h-10 w-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 shrink-0">
                                        <User className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                                            {req.senderName || `Student ${req.sender_id?.substring(0, 8)}...`}
                                        </h4>
                                        {req.senderSkills?.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {req.senderSkills.slice(0, 4).map(skill => (
                                                    <span key={skill} className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 text-[10px] font-bold rounded-full">{skill}</span>
                                                ))}
                                            </div>
                                        )}
                                        {req.message && <p className="text-xs text-gray-500 mt-1">"{req.message}"</p>}
                                        <p className="text-[10px] text-gray-400 mt-1">{new Date(req.created_at).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => respondToJoinRequest(req.id, 'accept')}
                                        disabled={respondingJoinId === req.id}
                                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-xl transition-all flex items-center disabled:opacity-50"
                                    >
                                        {respondingJoinId === req.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                                        Accept
                                    </button>
                                    <button
                                        onClick={() => respondToJoinRequest(req.id, 'reject')}
                                        disabled={respondingJoinId === req.id}
                                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-all flex items-center disabled:opacity-50"
                                    >
                                        <X className="h-3 w-3 mr-1" />
                                        Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ═══════════ TEAM DISCUSSION ═══════════ */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
                        <MessageCircle className="h-5 w-5 mr-2 text-green-500" />
                        Team Discussion
                        <span className="ml-2 text-xs text-gray-400 font-normal">({messages.length} messages)</span>
                    </h3>
                    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Auto-refreshes every 10s</span>
                </div>

                {/* Messages */}
                <div className="h-80 overflow-y-auto p-6 space-y-4 bg-gray-50/50 dark:bg-gray-900/30">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                            <MessageCircle className="h-12 w-12 text-gray-200" />
                            <p className="text-sm text-gray-400">No messages yet. Start the conversation with your team!</p>
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const isMe = msg.userId === user?.uid;
                            return (
                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className="max-w-[70%]">
                                        <div className={`flex items-center gap-2 mb-1 ${isMe ? 'justify-end' : ''}`}>
                                            {!isMe && (
                                                <div className="h-6 w-6 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-600 shrink-0">
                                                    <User className="h-3 w-3" />
                                                </div>
                                            )}
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                {isMe ? 'You' : msg.userName || `User ${msg.userId?.substring(0, 6)}`}
                                            </span>
                                            <span className="text-[10px] text-gray-300">{new Date(msg.createdAt).toLocaleTimeString()}</span>
                                        </div>
                                        <div className={`px-4 py-3 rounded-2xl text-sm ${isMe
                                            ? 'bg-primary-600 text-white rounded-br-md'
                                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-700 rounded-bl-md'
                                            }`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex items-center gap-3">
                    <input
                        type="text"
                        className="flex-1 px-5 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                        placeholder="Type a message to your team..."
                        value={msgInput}
                        onChange={(e) => setMsgInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!msgInput.trim() || msgLoading}
                        className="px-5 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl font-bold text-sm flex items-center transition-all shadow-lg shadow-primary-500/20 disabled:opacity-50"
                    >
                        {msgLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                </div>
            </div>



            {/* Task Detail Modal */}
            <TaskDetailModal
                task={selectedTask}
                isOpen={!!selectedTask}
                onClose={() => setSelectedTask(null)}
                onSave={saveTaskDetail}
                onDelete={deleteTask}
                members={project.members || []}
                memberInfo={memberInfo}
                currentUserId={user?.uid}
                isOwner={isOwner}
            />
        </div>
    );
};

export default ProjectRoom;