import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../apiConfig';
import {
    Briefcase,
    User,
    Send,
    CheckCircle,
    Clock,
    Loader2,
    MessageSquare,
    AlertCircle,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import Skeleton from '../../components/Skeleton';

const MentoringDoubts = () => {
    const { user } = useAuth();
    const [doubts, setDoubts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('Open');
    const [expandedId, setExpandedId] = useState(null);
    const [replyText, setReplyText] = useState({});
    const [replyLoading, setReplyLoading] = useState({});

    const fetchDoubts = useCallback(async () => {
        if (!user) return;
        try {
            const url = filter === 'all'
                ? `${API_BASE_URL}/api/mentorship`
                : `${API_BASE_URL}/api/mentorship?status=${filter}`;
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${await user.getIdToken()}` }
            });
            const data = await response.json();
            const doubtsArr = data.data?.doubts || data.doubts || [];
            setDoubts(doubtsArr);
        } catch (err) {
            console.error('Error fetching doubts:', err);
        }
        setLoading(false);
    }, [user, filter]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true);
        fetchDoubts();
    }, [user, filter, fetchDoubts]);

    const handleReply = async (doubtId) => {
        const text = replyText[doubtId]?.trim();
        if (!text) return;

        setReplyLoading(prev => ({ ...prev, [doubtId]: true }));
        try {
            await fetch(`${API_BASE_URL}/api/mentorship/${doubtId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await user.getIdToken()}`
                },
                body: JSON.stringify({ status: 'In Progress', response: text })
            });
            setReplyText(prev => ({ ...prev, [doubtId]: '' }));
            fetchDoubts();
        } catch (err) {
            console.error('Error replying:', err);
        }
        setReplyLoading(prev => ({ ...prev, [doubtId]: false }));
    };

    const markResolved = async (doubtId) => {
        setReplyLoading(prev => ({ ...prev, [doubtId]: true }));
        try {
            await fetch(`${API_BASE_URL}/api/mentorship/${doubtId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await user.getIdToken()}`
                },
                body: JSON.stringify({ status: 'Resolved' })
            });
            fetchDoubts();
        } catch (err) {
            console.error('Error resolving:', err);
        }
        setReplyLoading(prev => ({ ...prev, [doubtId]: false }));
    };

    const statusColors = {
        'Open': 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800',
        'In Progress': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
        'Resolved': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <header>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                    <Briefcase className="h-8 w-8 mr-3 text-primary-600" />
                    Mentoring Doubts
                </h1>
                <p className="text-gray-500 mt-2">Review student questions, provide guidance, and track resolutions.</p>
            </header>

            {/* Filter Tabs */}
            <div className="flex space-x-2">
                {['Open', 'In Progress', 'Resolved', 'all'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 text-xs font-bold rounded-xl transition-all capitalize ${filter === f
                            ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20'
                            : 'bg-white dark:bg-gray-800 text-gray-500 border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                    >
                        {f === 'all' ? 'All' : f}
                    </button>
                ))}
            </div>

            {/* Doubts List */}
            <div className="space-y-4">
                {loading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-4">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            </div>
                        </div>
                    ))
                ) : doubts.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 p-12 rounded-3xl border border-gray-100 dark:border-gray-700 text-center space-y-3">
                        <CheckCircle className="h-16 w-16 mx-auto text-green-300" />
                        <p className="text-gray-500 font-medium">
                            {filter === 'Open' ? 'No pending doubts! All caught up.' : `No ${filter.toLowerCase()} doubts.`}
                        </p>
                    </div>
                ) : (
                    doubts.map(doubt => (
                        <div key={doubt.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden transition-all hover:shadow-md">
                            {/* Doubt Header */}
                            <div
                                className="p-6 cursor-pointer"
                                onClick={() => setExpandedId(expandedId === doubt.id ? null : doubt.id)}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4 flex-1">
                                        <div className="h-10 w-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-500 shrink-0">
                                            <User className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                                    Student: {doubt.studentId?.substring(0, 8)}...
                                                </span>
                                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${statusColors[doubt.status] || 'bg-gray-100 text-gray-600'}`}>
                                                    {doubt.status}
                                                </span>
                                            </div>
                                            <h4 className="text-base font-semibold text-gray-900 dark:text-white leading-snug">
                                                {doubt.problemDescription}
                                            </h4>
                                            <p className="text-xs text-gray-400 mt-2 flex items-center">
                                                <Clock className="h-3 w-3 mr-1" />
                                                {new Date(doubt.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    {expandedId === doubt.id ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {expandedId === doubt.id && (
                                <div className="border-t border-gray-100 dark:border-gray-700">
                                    {/* What Student Tried */}
                                    <div className="p-6 bg-gray-50/50 dark:bg-gray-900/30 space-y-4">
                                        <div>
                                            <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center">
                                                <AlertCircle className="h-3 w-3 mr-1" /> What the student tried
                                            </h5>
                                            <p className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                                {doubt.whatTried || 'Not specified'}
                                            </p>
                                        </div>

                                        {/* Screenshot */}
                                        {doubt.screenshotUrl && (
                                            <div>
                                                <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Screenshot</h5>
                                                <img src={doubt.screenshotUrl} alt="Screenshot" className="max-w-full rounded-xl border border-gray-100 dark:border-gray-700" />
                                            </div>
                                        )}

                                        {/* Existing Mentor Response */}
                                        {doubt.mentorResponse && (
                                            <div>
                                                <h5 className="text-xs font-bold text-green-500 uppercase tracking-wider mb-2 flex items-center">
                                                    <MessageSquare className="h-3 w-3 mr-1" /> Your Response
                                                </h5>
                                                <p className="text-sm text-gray-700 dark:text-gray-300 bg-green-50 dark:bg-green-900/10 p-4 rounded-xl border border-green-100 dark:border-green-800">
                                                    {doubt.mentorResponse}
                                                </p>
                                            </div>
                                        )}

                                        {/* Reply Input (only if not resolved) */}
                                        {doubt.status !== 'Resolved' && (
                                            <div className="space-y-3">
                                                <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center">
                                                    <Send className="h-3 w-3 mr-1" /> Reply to Student
                                                </h5>
                                                <textarea
                                                    rows="3"
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                                                    placeholder="Write your guidance or solution..."
                                                    value={replyText[doubt.id] || ''}
                                                    onChange={(e) => setReplyText(prev => ({ ...prev, [doubt.id]: e.target.value }))}
                                                />
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => handleReply(doubt.id)}
                                                        disabled={!replyText[doubt.id]?.trim() || replyLoading[doubt.id]}
                                                        className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-primary-500/20 flex items-center disabled:opacity-50"
                                                    >
                                                        {replyLoading[doubt.id] ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                                                        Send Reply
                                                    </button>
                                                    <button
                                                        onClick={() => markResolved(doubt.id)}
                                                        disabled={replyLoading[doubt.id]}
                                                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-xl transition-all flex items-center disabled:opacity-50"
                                                    >
                                                        <CheckCircle className="h-3 w-3 mr-1" />
                                                        Mark Resolved
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default MentoringDoubts;