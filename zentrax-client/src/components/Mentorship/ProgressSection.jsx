import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { mentorService } from '../../services/mentorService';
import { CheckCircle, Clock, Plus, Activity } from 'lucide-react';

const ProgressSection = () => {
    const { user } = useAuth();
    const [updates, setUpdates] = useState([]);
    const [newUpdate, setNewUpdate] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const fetchProgress = async () => {
        try {
            const token = await user.getIdToken();
            const res = await mentorService.getStudentProgress(user.uid, token);
            setUpdates(res.updates || []);
        } catch (error) {
            console.error('Error fetching progress:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.uid) {
            fetchProgress();
        }
    }, [user?.uid]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newUpdate.trim()) return;
        setSubmitting(true);
        try {
            const token = await user.getIdToken();
            const res = await mentorService.submitProgress(newUpdate, null, token);
            setUpdates([res, ...updates]);
            setNewUpdate('');
            alert('Progress update submitted!');
        } catch {
            alert('Failed to submit progress');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="text-slate-500 dark:text-slate-400 font-medium p-4">Loading progress...</div>;

    return (
        <div className="space-y-6">
            <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 p-4 rounded-xl">
                <h3 className="text-slate-900 dark:text-white font-semibold mb-3 flex items-center gap-2">
                    <Activity size={18} className="text-indigo-600 dark:text-indigo-400" />
                    Submit Weekly Update
                </h3>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <textarea
                        className="zen-input p-3 text-sm resize-none"
                        placeholder="What did you achieve this week? Any roadblocks?"
                        rows="3"
                        value={newUpdate}
                        onChange={(e) => setNewUpdate(e.target.value)}
                    />
                    <button
                        disabled={submitting}
                        className="zen-btn-primary text-xs py-2 px-4 flex items-center gap-2"
                    >
                        <Plus size={16} /> {submitting ? 'Submitting...' : 'Post Update'}
                    </button>
                </form>
            </div>

            <div className="space-y-4">
                <h3 className="text-slate-900 dark:text-white font-semibold">Timeline</h3>
                {updates.length === 0 ? (
                    <p className="text-slate-500 dark:text-slate-400 italic text-sm">No updates submitted yet.</p>
                ) : (
                    <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-2 pl-6 space-y-8">
                        {updates.map((update, idx) => (
                            <div key={update.id} className="relative">
                                <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-indigo-600 dark:bg-indigo-500 border-2 border-white dark:border-slate-900 shadow-sm" />
                                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">Week {updates.length - idx}</span>
                                        <span className="text-[10px] text-slate-400 dark:text-slate-500">{new Date(update.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed">{update.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProgressSection;
