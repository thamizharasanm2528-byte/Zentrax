import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Calendar, Send, Loader2, Clock, CheckCircle2, XCircle, CalendarClock, ChevronDown, RefreshCw, Video } from 'lucide-react';
import Toast from '../../components/Toast';
import { API_BASE_URL } from '../../apiConfig';

const SESSION_TYPES = [
    { value: 'debugging', label: '🐛 Debugging', color: 'text-red-500' },
    { value: 'architecture-review', label: '🏗️ Architecture Review', color: 'text-blue-500' },
    { value: 'project-guidance', label: '🧭 Project Guidance', color: 'text-green-500' },
    { value: 'code-review', label: '🔍 Code Review', color: 'text-purple-500' },
    { value: 'general-mentoring', label: '💡 General Mentoring', color: 'text-amber-500' },
];

const STATUS_STYLES = {
    pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600',
    accepted: 'bg-green-100 dark:bg-green-900/30 text-green-600',
    rejected: 'bg-red-100 dark:bg-red-900/30 text-red-600',
    rescheduled: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
    completed: 'bg-gray-100 dark:bg-gray-700 text-gray-500',
};

const RequestSession = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [topic, setTopic] = useState('');
    const [summary, setSummary] = useState('');
    const [preferredDate, setPreferredDate] = useState('');
    const [preferredTime, setPreferredTime] = useState('');
    const [sessionType, setSessionType] = useState('');
    const [projectId, setProjectId] = useState('');
    const [mentorId, setMentorId] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [projects, setProjects] = useState([]);
    const [mySessions, setMySessions] = useState([]);
    const [sessionsLoading, setSessionsLoading] = useState(true);
    const [mentorInfo, setMentorInfo] = useState(null);
    const [allRequests, setAllRequests] = useState([]);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            try {
                const token = await user.getIdToken();
                const headers = { 'Authorization': `Bearer ${token}` };

                const [projRes, sessRes, mentorRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/projects`, { headers }),
                    fetch(`${API_BASE_URL}/api/mentor-sessions?role=student`, { headers }),
                    fetch(`${API_BASE_URL}/api/mentor/requests?role=student`, { headers })
                ]);

                const projData = await projRes.json();
                const sessData = await sessRes.json();
                const mentorData = await mentorRes.json();

                // API returns { success, data: { projects } } or { projects } or raw array
                const projectsList = projData.data?.projects || projData.projects || (Array.isArray(projData) ? projData : []);
                if (projectsList.length > 0) {
                    setProjects(projectsList.filter(p => p.createdBy === user.uid || p.members?.includes(user.uid)));
                }

                if (sessData.sessions) setMySessions(sessData.sessions);

                // Merge requests from both the new system (mentorship_requests) and legacy system (mentor_requests)
                let allReqs = mentorData.requests || [];
                console.debug('[RequestSession] Primary mentor requests:', allReqs);

                // Fallback: also fetch from legacy mentor-connection system
                try {
                    const legacyRes = await fetch(`${API_BASE_URL}/api/mentor-connection/requests?role=student`, { headers });
                    const legacyData = await legacyRes.json();
                    if (legacyData.requests?.length > 0) {
                        console.debug('[RequestSession] Legacy mentor requests:', legacyData.requests);
                        // Merge, avoiding duplicates by mentor_id
                        const existingMentorIds = new Set(allReqs.map(r => r.mentor_id));
                        const newLegacy = legacyData.requests.filter(r => !existingMentorIds.has(r.mentor_id));
                        allReqs = [...allReqs, ...newLegacy];
                    }
                } catch (legacyErr) {
                    console.debug('[RequestSession] Legacy endpoint not available:', legacyErr.message);
                }

                console.debug('[RequestSession] All merged requests:', allReqs);
                setAllRequests(allReqs);
            } catch (err) {
                console.error('Error:', err);
            }
            setSessionsLoading(false);
        };
        fetchData();
    }, [user, success]);

    // Update mentor info when projectId or requests change
    useEffect(() => {
        const resolveMentor = () => {
            // Strategy 1: Check if the selected project has a mentorId directly set on it
            if (projectId) {
                const selectedProject = projects.find(p => p.id === projectId);
                if (selectedProject?.mentorId) {
                    console.debug('[RequestSession] Found mentor from project.mentorId:', selectedProject.mentorId);
                    setMentorId(selectedProject.mentorId);
                    // Try to find the mentor name from requests
                    const matchingReq = allRequests.find(r => r.mentor_id === selectedProject.mentorId && r.status === 'accepted');
                    setMentorInfo({ id: selectedProject.mentorId, name: matchingReq?.otherUserName || 'Mentor' });
                    return;
                }
            }

            // Strategy 2: Find from accepted mentorship requests
            if (!allRequests || allRequests.length === 0) {
                setMentorId('');
                setMentorInfo(null);
                return;
            }

            const acceptedRequests = allRequests.filter(r => r.status === 'accepted');
            console.debug('[RequestSession] Accepted requests:', acceptedRequests);

            if (acceptedRequests.length === 0) {
                setMentorId('');
                setMentorInfo(null);
                return;
            }

            // 2a. Try to find mentor for the selected project (backend uses project_id with underscore)
            let selectedMatch = null;
            if (projectId) {
                selectedMatch = acceptedRequests.find(r => (r.project_id === projectId || r.projectId === projectId));
            }

            // 2b. Fallback to general mentor (no project)
            if (!selectedMatch) {
                selectedMatch = acceptedRequests.find(r => !r.project_id && !r.projectId);
            }

            // 2c. Final fallback: first accepted request
            const finalMatch = selectedMatch || acceptedRequests[0];

            if (finalMatch) {
                const id = finalMatch.mentor_id || finalMatch.otherUserId;
                const name = finalMatch.otherUserName || finalMatch.otherUser?.name || 'Mentor';
                console.debug('[RequestSession] Resolved mentor:', { id, name, from: finalMatch });
                setMentorId(id);
                setMentorInfo({ id, name });
            } else {
                setMentorId('');
                setMentorInfo(null);
            }
        };

        resolveMentor();
    }, [projectId, allRequests, projects]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!mentorId) return alert('No mentor assigned. Please request a mentor first.');
        setLoading(true);

        try {
            const selectedProject = projects.find(p => p.id === projectId);
            const token = await user.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/mentor-sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    mentorId, projectId: projectId || undefined,
                    projectTitle: selectedProject?.title || undefined,
                    topic, summary, preferredDate, preferredTime, sessionType
                })
            });

            if (res.ok) {
                const data = await res.json();
                setSuccess(true);
                setTopic(''); setSummary(''); setPreferredDate(''); setPreferredTime(''); setSessionType(''); setProjectId('');
                setToast({
                    message: data.emailSent
                        ? 'Session request sent successfully. The mentor has been notified by email.'
                        : data.emailMessage || 'Session request sent successfully.',
                    type: data.emailSent ? 'success' : 'warning'
                });
                setTimeout(() => { setSuccess(false); setToast(null); }, 5000);
            }
        } catch (err) {
            console.error('Error requesting session:', err);
        }
        setLoading(false);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <header>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                    <Calendar className="h-8 w-8 mr-3 text-indigo-600" /> Request Session
                </h1>
                <p className="text-gray-500 mt-1">
                    Schedule a mentoring session with {mentorInfo ? <strong>{mentorInfo.name}</strong> : 'your assigned mentor'}.
                </p>
            </header>

            {/* Form */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xl p-8">
                {success ? (
                    <div className="text-center py-12 space-y-4">
                        <div className="h-16 w-16 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 className="h-8 w-8" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Session Requested!</h2>
                        <p className="text-gray-500 text-sm max-w-xs mx-auto">Your mentor will be notified. You'll receive a confirmation once they respond.</p>
                        <button onClick={() => setSuccess(false)} className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-500 transition-all">
                            Request Another
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Session Type */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Session Type *</label>
                                <div className="relative">
                                    <select required value={sessionType} onChange={e => setSessionType(e.target.value)}
                                        className="w-full px-5 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all appearance-none">
                                        <option value="">Select session type</option>
                                        {SESSION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* Project */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Related Project</label>
                                <div className="relative">
                                    <select value={projectId} onChange={e => setProjectId(e.target.value)}
                                        className="w-full px-5 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all appearance-none">
                                        <option value="">Select project (optional)</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* Topic */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Session Topic *</label>
                            <input required type="text" value={topic} onChange={e => setTopic(e.target.value)}
                                placeholder="e.g. Help with database schema design"
                                className="w-full px-5 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all" />
                        </div>

                        {/* Summary */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Problem Summary</label>
                            <textarea rows="3" value={summary} onChange={e => setSummary(e.target.value)}
                                placeholder="Brief description of what you need help with..."
                                className="w-full px-5 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all resize-none" />
                        </div>

                        {/* Date + Time */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Preferred Date</label>
                                <input type="date" value={preferredDate} onChange={e => setPreferredDate(e.target.value)}
                                    className="w-full px-5 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Preferred Time</label>
                                <input type="time" value={preferredTime} onChange={e => setPreferredTime(e.target.value)}
                                    className="w-full px-5 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all" />
                            </div>
                        </div>

                        <button type="submit" disabled={loading || !topic || !sessionType}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center disabled:opacity-50">
                            {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Send className="h-5 w-5 mr-2" />}
                            Request Session
                        </button>
                    </form>
                )}
            </div>

            {/* My Sessions */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
                        <CalendarClock className="h-5 w-5 mr-2 text-indigo-500" /> My Sessions
                        {mySessions.length > 0 && <span className="ml-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{mySessions.length}</span>}
                    </h3>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-gray-700 max-h-96 overflow-y-auto">
                    {sessionsLoading ? (
                        <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-300" /></div>
                    ) : mySessions.length === 0 ? (
                        <div className="p-8 text-center">
                            <Calendar className="h-8 w-8 mx-auto text-gray-200 mb-2" />
                            <p className="text-sm text-gray-400">No session requests yet.</p>
                        </div>
                    ) : mySessions.map(sess => (
                        <div key={sess.id} className="p-5 flex items-start gap-4">
                            <div className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0 ${STATUS_STYLES[sess.status] || STATUS_STYLES.pending}`}>
                                {sess.status}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{sess.topic}</p>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <span className="text-[10px] text-primary-600 font-medium">{SESSION_TYPES.find(t => t.value === sess.sessionType)?.label || sess.sessionType}</span>
                                    {sess.projectTitle && <span className="text-[10px] text-gray-400">• {sess.projectTitle}</span>}
                                </div>
                                {(sess.preferredDate || sess.preferredTime) && (
                                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {sess.preferredDate && new Date(sess.preferredDate).toLocaleDateString()}
                                        {sess.preferredTime && ` at ${sess.preferredTime}`}
                                    </p>
                                )}
                                {sess.summary && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{sess.summary}</p>}
                                <p className="text-[10px] text-gray-400 mt-1">{new Date(sess.createdAt).toLocaleString()}</p>
                            </div>
                            {(sess.status === 'accepted' || sess.status === 'live') && (
                                <button
                                    onClick={() => navigate(`/live-session/${sess.id}`)}
                                    className={`px-4 py-2 text-white text-xs font-bold rounded-xl transition-all flex items-center shrink-0 shadow-lg ${
                                        sess.status === 'live'
                                            ? 'bg-green-500 hover:bg-green-400 shadow-green-500/25 animate-pulse'
                                            : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/25'
                                    }`}
                                >
                                    <Video className="h-3 w-3 mr-1" />
                                    {sess.status === 'live' ? 'Join Live' : 'Join Session'}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default RequestSession;