import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API_BASE_URL } from '../../apiConfig';
import {
    Rocket,
    Users,
    CheckCircle2,
    Circle,
    ArrowLeft,
    Loader2,
    User,
    PlayCircle,
    Send,
    AlertCircle,
    BarChart3,
    Star,
    Lightbulb,
    AlertTriangle,
    ThumbsUp,
    MessageCircle,
    ShieldAlert,
    ClipboardCheck,
    Activity,
    Plus,
    X,
    ChevronDown,
    Clock,
    Trash2,
    FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const STATUS_COLORS = {
    'Planning': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    'Development': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    'Testing': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
    'Completed': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
    'Searching': 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800',
};

const HEALTH_OPTIONS = [
    { value: 'Excellent', color: 'bg-green-500', textColor: 'text-green-600', bgLight: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' },
    { value: 'Good', color: 'bg-blue-500', textColor: 'text-blue-600', bgLight: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' },
    { value: 'Needs Improvement', color: 'bg-amber-500', textColor: 'text-amber-600', bgLight: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' },
    { value: 'Critical', color: 'bg-red-500', textColor: 'text-red-600', bgLight: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' },
];

const SEVERITY_OPTIONS = [
    { value: 'low', label: 'Low', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { value: 'medium', label: 'Medium', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-700 border-red-200' },
];

const FEEDBACK_TYPES = [
    { value: 'general', label: 'General', icon: MessageCircle, color: 'text-gray-500 bg-gray-100 dark:bg-gray-700' },
    { value: 'suggestion', label: 'Suggestion', icon: Lightbulb, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
    { value: 'warning', label: 'Warning', icon: AlertTriangle, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30' },
    { value: 'praise', label: 'Praise', icon: ThumbsUp, color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
];

const ACTIVITY_ICONS = {
    message: MessageCircle,
    feedback: Lightbulb,
    review: ClipboardCheck,
};

const MentorProjectView = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tasks, setTasks] = useState([]);

    // Data states
    const [doubts, setDoubts] = useState([]);
    const [feedbackList, setFeedbackList] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [risks, setRisks] = useState([]);
    const [activity, setActivity] = useState([]);

    // Feedback form
    const [feedbackText, setFeedbackText] = useState('');
    const [feedbackType, setFeedbackType] = useState('general');
    const [feedbackSending, setFeedbackSending] = useState(false);

    // Review form
    const [reviewComment, setReviewComment] = useState('');
    const [reviewHealth, setReviewHealth] = useState('Good');
    const [reviewSending, setReviewSending] = useState(false);
    const [showReviewForm, setShowReviewForm] = useState(false);

    // Risk form
    const [riskLabel, setRiskLabel] = useState('');
    const [riskSeverity, setRiskSeverity] = useState('medium');
    const [riskSending, setRiskSending] = useState(false);
    const [showRiskForm, setShowRiskForm] = useState(false);

    const getHeaders = useCallback(async () => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await user.getIdToken()}`
    }), [user]);

    const fetchAll = useCallback(async () => {
        try {
            const headers = await getHeaders();
            const [projRes, doubtsRes, fbRes, reviewRes, riskRes, actRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/projects/${id}`, { headers }),
                fetch(`${API_BASE_URL}/api/mentorship`, { headers }),
                fetch(`${API_BASE_URL}/api/projects/${id}/feedback`, { headers }),
                fetch(`${API_BASE_URL}/api/projects/${id}/reviews`, { headers }),
                fetch(`${API_BASE_URL}/api/projects/${id}/risks`, { headers }),
                fetch(`${API_BASE_URL}/api/projects/${id}/activity`, { headers }),
            ]);

            const projData = await projRes.json();
            const doubtsData = await doubtsRes.json();
            const fbData = await fbRes.json();
            const reviewData = await reviewRes.json();
            const riskData = await riskRes.json();
            const actData = await actRes.json();

            // Handle standard { success: true, data: { ... } } wrapper
            const projectObj = projData?.data?.project || projData?.project;
            if (projectObj) {
                setProject(projectObj);
                if (projectObj.tasks) setTasks(projectObj.tasks);
            } else {
                console.error('Project data missing in response:', projData);
            }

            if (doubtsData.doubts) setDoubts(doubtsData.doubts.filter(d => d.status !== 'Resolved'));
            if (fbData.feedback) setFeedbackList(fbData.feedback);
            if (reviewData.reviews) setReviews(reviewData.reviews);
            if (riskData.risks) setRisks(riskData.risks);
            if (actData.events) setActivity(actData.events);
        } catch (err) { 
            console.error('Error fetching data:', err);
            setProject(null); // Ensure "Not Found" state is explicit if fetch fails
        }
        setLoading(false);
    }, [id, getHeaders]);


    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { if (id && user) fetchAll(); }, [id, user, fetchAll]);

    // ─── Actions ───
    const sendFeedback = async () => {
        if (!feedbackText.trim()) return;
        setFeedbackSending(true);
        try {
            await fetch(`${API_BASE_URL}/api/projects/${id}/feedback`, {
                method: 'POST', headers: await getHeaders(),
                body: JSON.stringify({ text: feedbackText, type: feedbackType })
            });
            setFeedbackText(''); setFeedbackType('general');
            fetchAll();
        } catch (err) { console.error(err); }
        setFeedbackSending(false);
    };

    const sendReview = async () => {
        if (!reviewComment.trim()) return;
        setReviewSending(true);
        try {
            await fetch(`${API_BASE_URL}/api/projects/${id}/reviews`, {
                method: 'POST', headers: await getHeaders(),
                body: JSON.stringify({ comment: reviewComment, healthStatus: reviewHealth })
            });
            setReviewComment(''); setReviewHealth('Good'); setShowReviewForm(false);
            fetchAll();
        } catch (err) { console.error(err); }
        setReviewSending(false);
    };

    const addRisk = async () => {
        if (!riskLabel.trim()) return;
        setRiskSending(true);
        try {
            await fetch(`${API_BASE_URL}/api/projects/${id}/risks`, {
                method: 'POST', headers: await getHeaders(),
                body: JSON.stringify({ label: riskLabel, severity: riskSeverity })
            });
            setRiskLabel(''); setRiskSeverity('medium'); setShowRiskForm(false);
            fetchAll();
        } catch (err) { console.error(err); }
        setRiskSending(false);
    };

    const removeRisk = async (riskId) => {
        try {
            await fetch(`${API_BASE_URL}/api/projects/${id}/risks/${riskId}`, {
                method: 'DELETE', headers: await getHeaders()
            });
            setRisks(prev => prev.filter(r => r.id !== riskId));
        } catch (err) { console.error(err); }
    };

    const replyToDoubt = async (doubtId, response) => {
        try {
            await fetch(`${API_BASE_URL}/api/mentorship/${doubtId}/status`, {
                method: 'PUT', headers: await getHeaders(),
                body: JSON.stringify({ status: 'In Progress', response })
            });
            fetchAll();
        } catch (err) { console.error(err); }
    };

    const resolveDoubt = async (doubtId) => {
        try {
            await fetch(`${API_BASE_URL}/api/mentorship/${doubtId}/status`, {
                method: 'PUT', headers: await getHeaders(),
                body: JSON.stringify({ status: 'Resolved' })
            });
            fetchAll();
        } catch (err) { console.error(err); }
    };

    // ─── Computed ───
    const completedCount = tasks.filter(t => t.status === 'completed').length;
    const inProgressCount = tasks.filter(t => t.status === 'in-progress').length;
    const pendingCount = tasks.filter(t => t.status === 'pending').length;
    const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
    const latestHealth = reviews.length > 0 ? reviews[0].healthStatus : null;
    const healthInfo = HEALTH_OPTIONS.find(h => h.value === latestHealth);

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
        </div>
    );

    if (!project) return (
        <div className="py-20 text-center space-y-4">
            <Rocket className="h-12 w-12 mx-auto text-gray-300" />
            <p className="text-gray-500">Project not found.</p>
            <Link to="/mentor/teams" className="text-primary-600 text-sm font-semibold hover:underline">← Back to Assigned Teams</Link>
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Back */}
            <Link to="/mentor/teams" className="flex items-center text-sm text-gray-500 hover:text-primary-600 transition-colors">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back to Assigned Teams
            </Link>

            {/* ═══════════ 1. PROJECT OVERVIEW ═══════════ */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="flex items-start space-x-5">
                        <div className="h-16 w-16 bg-primary-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary-500/30 shrink-0">
                            <Rocket className="h-8 w-8" />
                        </div>
                        <div>
                            <div className="flex items-center flex-wrap gap-3">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{project.title}</h1>
                                <span className={`px-3 py-1 text-xs font-bold rounded-full border ${STATUS_COLORS[project.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                    {project.status}
                                </span>
                                <span className="px-3 py-1 text-xs font-bold rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                                    🎓 Mentor View
                                </span>
                                {healthInfo && (
                                    <span className={`px-3 py-1 text-xs font-bold rounded-full border ${healthInfo.bgLight}`}>
                                        Health: {latestHealth}
                                    </span>
                                )}
                            </div>
                            <p className="text-gray-500 mt-2 max-w-2xl text-sm leading-relaxed">{project.description}</p>
                        </div>
                    </div>
                </div>
                {project.techStack?.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-2">
                        {project.techStack.map(tech => (
                            <span key={tech} className="px-3 py-1 bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 text-xs rounded-lg border border-gray-200 dark:border-gray-600">{tech}</span>
                        ))}
                    </div>
                )}
            </div>

            {/* ═══════════ 2. PROGRESS + TEAM + INFO ═══════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {/* Progress Indicators */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center mb-6">
                            <BarChart3 className="h-5 w-5 mr-2 text-primary-500" /> Project Progress
                        </h3>
                        <div className="grid grid-cols-4 gap-3 mb-6">
                            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-gray-100 dark:border-gray-600">
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{tasks.length}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">Total</p>
                            </div>
                            <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-800/30">
                                <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
                                <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wider mt-1">Todo</p>
                            </div>
                            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-800/30">
                                <p className="text-2xl font-bold text-blue-600">{inProgressCount}</p>
                                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mt-1">In Progress</p>
                            </div>
                            <div className="text-center p-4 bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-100 dark:border-green-800/30">
                                <p className="text-2xl font-bold text-green-600">{completedCount}</p>
                                <p className="text-[10px] font-bold text-green-500 uppercase tracking-wider mt-1">Completed</p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Overall</span>
                                <span className="text-sm font-bold text-primary-600">{progress}%</span>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3">
                                <div className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                            </div>
                        </div>
                    </div>

                    {/* Read-Only Task List */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                            <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
                                <CheckCircle2 className="h-5 w-5 mr-2 text-green-500" /> Task Overview
                                <span className="ml-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">Read Only</span>
                            </h3>
                        </div>
                        <div className="divide-y divide-gray-50 dark:divide-gray-700 max-h-72 overflow-y-auto">
                            {tasks.length === 0 ? (
                                <div className="p-8 text-center"><p className="text-sm text-gray-400">No tasks created yet.</p></div>
                            ) : tasks.map(task => (
                                <div key={task.id} className="px-6 py-3.5 flex items-center space-x-4">
                                    {task.status === 'completed' ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> :
                                        task.status === 'in-progress' ? <PlayCircle className="h-4 w-4 text-primary-500 shrink-0" /> :
                                            <Circle className="h-4 w-4 text-gray-300 shrink-0" />}
                                    <span className={`text-sm flex-1 ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-200'}`}>
                                        {task.title}
                                    </span>
                                    <span className={`text-[10px] uppercase tracking-wider font-bold ${task.status === 'completed' ? 'text-green-500' : task.status === 'in-progress' ? 'text-primary-500' : 'text-gray-400'}`}>
                                        {task.status === 'in-progress' ? 'IN PROGRESS' : task.status === 'completed' ? 'DONE' : 'TODO'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="space-y-6">
                    {/* Team Members */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center mb-4">
                            <Users className="h-5 w-5 mr-2 text-purple-500" /> Team Members
                            <span className="ml-auto text-xs text-gray-400 font-normal">{project.members?.length || 0} / {project.teamSize || '?'}</span>
                        </h3>
                        <div className="space-y-2.5">
                            {(project.members || []).map((memberId, i) => (
                                <div key={memberId} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-600">
                                    <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${memberId === user?.uid ? 'bg-purple-600 text-white' : 'bg-primary-100 dark:bg-primary-900/40 text-primary-600'}`}>
                                        {memberId === user?.uid ? 'You' : `M${i + 1}`}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                            {memberId === user?.uid ? 'You (Mentor)' : `Team Member ${i + 1}`}
                                        </p>
                                        <p className="text-[10px] text-gray-400 font-mono">{memberId.substring(0, 14)}...</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Project Info */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center mb-4"><Star className="h-5 w-5 mr-2 text-amber-500" /> Project Info</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between"><span className="text-gray-500">Created</span><span className="font-medium text-gray-900 dark:text-white">{project.createdAt ? new Date(project.createdAt).toLocaleDateString() : '—'}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Status</span><span className="font-medium text-gray-900 dark:text-white">{project.status}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Tasks</span><span className="font-medium text-gray-900 dark:text-white">{completedCount}/{tasks.length} done</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Progress</span><span className="font-bold text-primary-600">{progress}%</span></div>
                            {latestHealth && <div className="flex justify-between"><span className="text-gray-500">Health</span><span className={`font-bold ${healthInfo?.textColor || ''}`}>{latestHealth}</span></div>}
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════════ 3. RISK FLAGS ═══════════ */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
                        <ShieldAlert className="h-5 w-5 mr-2 text-red-500" /> Project Risk Flags
                        {risks.length > 0 && <span className="ml-2 bg-red-100 dark:bg-red-900/30 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{risks.length}</span>}
                    </h3>
                    <button onClick={() => setShowRiskForm(!showRiskForm)} className="text-sm font-semibold text-primary-600 hover:text-primary-500 flex items-center">
                        {showRiskForm ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                        {showRiskForm ? 'Cancel' : 'Add Flag'}
                    </button>
                </div>

                {showRiskForm && (
                    <div className="p-5 bg-red-50/30 dark:bg-red-900/5 border-b border-gray-100 dark:border-gray-700 space-y-3">
                        <div className="flex gap-2 flex-wrap">
                            {SEVERITY_OPTIONS.map(s => (
                                <button key={s.value} onClick={() => setRiskSeverity(s.value)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${riskSeverity === s.value ? 'bg-primary-600 text-white border-primary-600' : s.color}`}>
                                    {s.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-3">
                            <input type="text" className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                placeholder="e.g. No backend developer, Architecture issues..."
                                value={riskLabel} onChange={(e) => setRiskLabel(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') addRisk(); }} />
                            <button onClick={addRisk} disabled={!riskLabel.trim() || riskSending}
                                className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-all flex items-center disabled:opacity-50">
                                {riskSending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Flag'}
                            </button>
                        </div>
                    </div>
                )}

                <div className="p-6">
                    {risks.length === 0 ? (
                        <div className="text-center py-4">
                            <ShieldAlert className="h-8 w-8 mx-auto text-gray-200 mb-2" />
                            <p className="text-sm text-gray-400">No risk flags. Project looks healthy!</p>
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {risks.map(risk => {
                                const sevInfo = SEVERITY_OPTIONS.find(s => s.value === risk.severity) || SEVERITY_OPTIONS[1];
                                return (
                                    <div key={risk.id} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold ${sevInfo.color} group`}>
                                        <AlertTriangle className="h-3 w-3" />
                                        {risk.label}
                                        <button onClick={() => removeRisk(risk.id)} className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 hover:text-red-800">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ═══════════ 4. STUDENT DOUBTS ═══════════ */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
                        <AlertCircle className="h-5 w-5 mr-2 text-orange-500" /> Student Doubts
                        {doubts.length > 0 && <span className="ml-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{doubts.length} open</span>}
                    </h3>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-gray-700">
                    {doubts.length === 0 ? (
                        <div className="p-8 text-center">
                            <CheckCircle2 className="h-8 w-8 mx-auto text-green-300 mb-2" />
                            <p className="text-sm text-gray-400">No open doubts. Students are doing great!</p>
                        </div>
                    ) : doubts.map(doubt => (
                        <DoubtCard key={doubt.id} doubt={doubt} onReply={replyToDoubt} onResolve={resolveDoubt} />
                    ))}
                </div>
                {doubts.length > 0 && (
                    <div className="p-4 border-t border-gray-100 dark:border-gray-700 text-center">
                        <Link to="/mentor/doubts" className="text-xs text-primary-600 font-bold hover:underline">View All Doubts →</Link>
                    </div>
                )}
            </div>

            {/* ═══════════ 5. MENTOR FEEDBACK ═══════════ */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
                        <Lightbulb className="h-5 w-5 mr-2 text-amber-500" /> Mentor Feedback
                        <span className="ml-2 text-xs text-gray-400 font-normal">Structured guidance for the team</span>
                    </h3>
                </div>
                <div className="p-6 bg-gray-50/50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-700 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        {FEEDBACK_TYPES.map(ft => (
                            <button key={ft.value} onClick={() => setFeedbackType(ft.value)}
                                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${feedbackType === ft.value ? 'bg-primary-600 text-white shadow-md' : `${ft.color} border border-gray-100 dark:border-gray-600`}`}>
                                <ft.icon className="h-3 w-3" /> {ft.label}
                            </button>
                        ))}
                    </div>
                    <textarea rows="2" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                        placeholder="Write your feedback for the team..." value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} />
                    <button onClick={sendFeedback} disabled={!feedbackText.trim() || feedbackSending}
                        className="px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-primary-500/20 flex items-center disabled:opacity-50">
                        {feedbackSending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />} Post Feedback
                    </button>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-gray-700 max-h-64 overflow-y-auto">
                    {feedbackList.length === 0 ? (
                        <div className="p-8 text-center"><p className="text-sm text-gray-400">No feedback yet.</p></div>
                    ) : feedbackList.map(fb => {
                        const typeInfo = FEEDBACK_TYPES.find(ft => ft.value === fb.type) || FEEDBACK_TYPES[0];
                        return (
                            <div key={fb.id} className="p-5 flex items-start gap-3">
                                <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${typeInfo.color}`}>
                                    <typeInfo.icon className="h-3.5 w-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold text-gray-900 dark:text-white">{fb.userName}</span>
                                        <span className="text-[10px] text-gray-400">{new Date(fb.createdAt).toLocaleString()}</span>
                                    </div>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">{fb.text}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ═══════════ 6. MENTOR PROJECT REVIEW ═══════════ */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
                        <ClipboardCheck className="h-5 w-5 mr-2 text-indigo-500" /> Project Reviews
                        <span className="ml-2 text-xs text-gray-400 font-normal">Weekly evaluations & health assessments</span>
                    </h3>
                    <button onClick={() => setShowReviewForm(!showReviewForm)} className="text-sm font-semibold text-primary-600 hover:text-primary-500 flex items-center">
                        {showReviewForm ? <X className="h-4 w-4 mr-1" /> : <FileText className="h-4 w-4 mr-1" />}
                        {showReviewForm ? 'Cancel' : 'Write Review'}
                    </button>
                </div>

                {showReviewForm && (
                    <div className="p-6 bg-indigo-50/30 dark:bg-indigo-900/5 border-b border-gray-100 dark:border-gray-700 space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Project Health Status</label>
                            <div className="flex gap-2 flex-wrap">
                                {HEALTH_OPTIONS.map(h => (
                                    <button key={h.value} onClick={() => setReviewHealth(h.value)}
                                        className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${reviewHealth === h.value
                                            ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                                            : `${h.bgLight}`
                                            }`}>
                                        <span className={`inline-block w-2 h-2 rounded-full ${h.color} mr-2`}></span>
                                        {h.value}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Review Comment</label>
                            <textarea rows="3" className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                                placeholder="e.g. Week 2 Review: Backend architecture needs improvement. UI progress is good."
                                value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} />
                        </div>
                        <button onClick={sendReview} disabled={!reviewComment.trim() || reviewSending}
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-500/20 flex items-center disabled:opacity-50">
                            {reviewSending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ClipboardCheck className="h-3 w-3 mr-1" />} Submit Review
                        </button>
                    </div>
                )}

                <div className="divide-y divide-gray-50 dark:divide-gray-700">
                    {reviews.length === 0 ? (
                        <div className="p-8 text-center">
                            <ClipboardCheck className="h-8 w-8 mx-auto text-gray-200 mb-2" />
                            <p className="text-sm text-gray-400">No reviews yet. Write the first evaluation!</p>
                        </div>
                    ) : reviews.map(review => {
                        const hInfo = HEALTH_OPTIONS.find(h => h.value === review.healthStatus) || HEALTH_OPTIONS[1];
                        return (
                            <div key={review.id} className="p-5">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className={`inline-block w-3 h-3 rounded-full ${hInfo.color}`}></span>
                                    <span className={`text-xs font-bold ${hInfo.textColor}`}>{review.healthStatus}</span>
                                    <span className="text-xs text-gray-400 ml-auto">{review.userName} • {new Date(review.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{review.comment}</p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ═══════════ 7. ACTIVITY TIMELINE ═══════════ */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
                        <Activity className="h-5 w-5 mr-2 text-cyan-500" /> Activity Timeline
                        <span className="ml-2 text-xs text-gray-400 font-normal">Recent project events</span>
                    </h3>
                </div>
                <div className="p-6">
                    {activity.length === 0 ? (
                        <div className="text-center py-4">
                            <Activity className="h-8 w-8 mx-auto text-gray-200 mb-2" />
                            <p className="text-sm text-gray-400">No recent activity.</p>
                        </div>
                    ) : (
                        <div className="relative pl-8 border-l-2 border-gray-100 dark:border-gray-700 space-y-6">
                            {activity.map((event, i) => {
                                const IconComp = ACTIVITY_ICONS[event.type] || Activity;
                                const colors = event.type === 'review' ? 'bg-indigo-100 text-indigo-600'
                                    : event.type === 'feedback' ? 'bg-amber-100 text-amber-600'
                                        : 'bg-cyan-100 text-cyan-600';
                                return (
                                    <div key={event.id || i} className="relative">
                                        <div className={`absolute -left-[41px] top-0 h-6 w-6 rounded-full flex items-center justify-center ${colors}`}>
                                            <IconComp className="h-3 w-3" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-700 dark:text-gray-300">{event.text}</p>
                                            <p className="text-[10px] text-gray-400 mt-0.5 flex items-center">
                                                <Clock className="h-3 w-3 mr-1" />
                                                {new Date(event.time).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Doubt Card Sub-Component ───
const DoubtCard = ({ doubt, onReply, onResolve }) => {
    const [replyText, setReplyText] = useState('');
    const [expanded, setExpanded] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleReply = async () => {
        if (!replyText.trim()) return;
        setLoading(true);
        await onReply(doubt.id, replyText);
        setReplyText('');
        setLoading(false);
    };

    const handleResolve = async () => {
        setLoading(true);
        await onResolve(doubt.id);
        setLoading(false);
    };

    return (
        <div className="p-5">
            <div className="flex items-start gap-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
                <div className="h-9 w-9 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-600 shrink-0">
                    <User className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Student: {doubt.studentId?.substring(0, 8)}... • {doubt.status}
                    </p>
                    <p className="text-sm text-gray-900 dark:text-white font-medium">{doubt.problemDescription}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{new Date(doubt.createdAt).toLocaleString()}</p>
                </div>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </div>

            {expanded && (
                <div className="mt-4 ml-13 space-y-3">
                    {doubt.whatTried && (
                        <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl text-xs text-gray-600 dark:text-gray-400">
                            <span className="font-bold text-gray-500 block mb-1">What student tried:</span>
                            {doubt.whatTried}
                        </div>
                    )}
                    {doubt.mentorResponse && (
                        <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-xl text-xs text-green-700 dark:text-green-400 border border-green-100 dark:border-green-800">
                            <span className="font-bold block mb-1">Your response:</span>
                            {doubt.mentorResponse}
                        </div>
                    )}
                    {doubt.status !== 'Resolved' && (
                        <div className="space-y-2">
                            <textarea rows="2" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                                placeholder="Write your guidance..." value={replyText} onChange={(e) => setReplyText(e.target.value)} />
                            <div className="flex gap-2">
                                <button onClick={handleReply} disabled={!replyText.trim() || loading}
                                    className="px-3 py-1.5 bg-primary-600 text-white text-[10px] font-bold rounded-lg flex items-center disabled:opacity-50">
                                    {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />} Reply
                                </button>
                                <button onClick={handleResolve} disabled={loading}
                                    className="px-3 py-1.5 bg-green-500 text-white text-[10px] font-bold rounded-lg flex items-center disabled:opacity-50">
                                    <CheckCircle2 className="h-3 w-3 mr-1" /> Mark Resolved
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MentorProjectView;