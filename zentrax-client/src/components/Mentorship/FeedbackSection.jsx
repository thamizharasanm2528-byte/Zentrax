import React, { useState, useEffect } from 'react';
import { mentorService } from '../../services/mentorService';
import { MessageCircle, CheckSquare, Clock, ShieldCheck, Square } from 'lucide-react';

const FeedbackSection = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchFeedback = async () => {
        try {
            const res = await mentorService.getFeedback();
            setItems(res.feedback || []);
        } catch (error) {
            console.error('Error fetching feedback:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeedback();
    }, []);

    const handleMarkDone = async (id) => {
        try {
            await mentorService.markTaskDone(id);
            setItems(items.map(item => 
                item.id === id ? { ...item, status: 'done' } : item
            ));
        } catch {
            alert('Failed to update task');
        }
    };

    if (loading) return <div className="text-slate-500 dark:text-slate-400 font-medium p-4">Loading feedback...</div>;

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Mentor Feedback & Tasks</h2>
            {items.length === 0 ? (
                <div className="zen-card p-8 text-center bg-slate-50/50 dark:bg-slate-900/20">
                    <p className="text-slate-500 dark:text-slate-400 italic">No feedback or tasks yet. Keep up the good work!</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {items.map((item) => (
                        <div 
                            key={item.id} 
                            className={`p-4 rounded-xl border transition-all ${
                                item.type === 'task' 
                                ? (item.status === 'done' ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100')
                                : 'bg-white border-slate-200 shadow-sm'
                            }`}
                        >
                            <div className="flex items-start gap-4">
                                <div className={`p-2 rounded-lg ${
                                    item.type === 'task' 
                                    ? (item.status === 'done' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')
                                    : 'bg-indigo-100 text-indigo-700'
                                }`}>
                                    {item.type === 'task' ? <CheckSquare size={20} /> : <MessageCircle size={20} />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${
                                            item.type === 'task' ? 'text-amber-600' : 'text-indigo-600'
                                        }`}>
                                            {item.type}
                                        </span>
                                        <span className="text-[10px] text-slate-400 dark:text-slate-500">{new Date(item.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed mb-3">{item.message}</p>
                                    
                                    {item.type === 'task' && (
                                        <div className="flex items-center gap-3">
                                            {item.status === 'done' ? (
                                                <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                                    <ShieldCheck size={14} /> Task Completed
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => handleMarkDone(item.id)}
                                                    className="flex items-center gap-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-1.5 rounded-lg transition-colors font-semibold shadow-sm"
                                                >
                                                    <Square size={14} /> Mark as Done
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FeedbackSection;
