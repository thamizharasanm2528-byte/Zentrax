import React, { useState, useEffect, useRef } from 'react';
import { X, User, Calendar, Flag, MessageCircle, Send, Trash2, CheckCircle2, PlayCircle, Circle } from 'lucide-react';
import { PRIORITY_CONFIG } from './TaskCard';

/**
 * TaskDetailModal — Full task detail view with:
 * - Title editing
 * - Description editing
 * - Assignee selection from team members
 * - Due date picker
 * - Priority selection
 * - Comment thread
 */
const TaskDetailModal = ({ task, isOpen, onClose, onSave, onDelete, members = [], memberInfo = {}, currentUserId, isOwner }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [assignee, setAssignee] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [priority, setPriority] = useState('medium');
    const [status, setStatus] = useState('pending');
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [hasChanges, setHasChanges] = useState(false);
    const commentEndRef = useRef(null);

    useEffect(() => {
        if (task) {
            setTitle(task.title || '');
            setDescription(task.description || '');
            setAssignee(task.assignee || '');
            setDueDate(task.dueDate || '');
            setPriority(task.priority || 'medium');
            setStatus(task.status || 'pending');
            setComments(task.comments || []);
            setHasChanges(false);
        }
    }, [task]);

    if (!isOpen || !task) return null;

    const markChanged = () => setHasChanges(true);

    const handleSave = () => {
        onSave({
            ...task,
            title: title.trim(),
            description: description.trim(),
            assignee: assignee || null,
            dueDate: dueDate || null,
            priority,
            status,
            comments
        });
        setHasChanges(false);
    };

    const handleAddComment = () => {
        if (!newComment.trim()) return;
        const comment = {
            id: Date.now(),
            text: newComment.trim(),
            userId: currentUserId,
            userName: memberInfo[currentUserId]?.name || 'You',
            createdAt: new Date().toISOString()
        };
        const updated = [...comments, comment];
        setComments(updated);
        setNewComment('');
        setHasChanges(true);
        setTimeout(() => commentEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    const statusOptions = [
        { value: 'pending', label: 'To Do', icon: <Circle className="h-3.5 w-3.5 text-gray-400" />, color: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300' },
        { value: 'in-progress', label: 'In Progress', icon: <PlayCircle className="h-3.5 w-3.5 text-blue-500" />, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' },
        { value: 'completed', label: 'Done', icon: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />, color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' },
    ];

    const priorityOptions = ['low', 'medium', 'high', 'critical'];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden border border-gray-100 dark:border-gray-700" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        {statusOptions.map(opt => (
                            <button key={opt.value}
                                onClick={() => { setStatus(opt.value); markChanged(); }}
                                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                                    status === opt.value ? opt.color + ' ring-2 ring-offset-1 ring-primary-500/30' : 'bg-gray-50 dark:bg-gray-700/50 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                            >
                                {opt.icon} {opt.label}
                            </button>
                        ))}
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-[calc(85vh-140px)] p-6 space-y-5">
                    {/* Title */}
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => { setTitle(e.target.value); markChanged(); }}
                        className="w-full text-xl font-bold text-gray-900 dark:text-white bg-transparent border-none outline-none placeholder:text-gray-300"
                        placeholder="Task title..."
                        readOnly={!isOwner}
                    />

                    {/* Description */}
                    <textarea
                        value={description}
                        onChange={(e) => { setDescription(e.target.value); markChanged(); }}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-sm text-gray-700 dark:text-gray-300 resize-none focus:ring-2 focus:ring-primary-500/30 outline-none"
                        rows={3}
                        placeholder="Add a description..."
                    />

                    {/* Meta Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Assignee */}
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                <User className="h-3 w-3" /> Assignee
                            </label>
                            <select
                                value={assignee}
                                onChange={(e) => { setAssignee(e.target.value); markChanged(); }}
                                disabled={!isOwner}
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-primary-500/30 disabled:opacity-60"
                            >
                                <option value="">Unassigned</option>
                                {members.map(mid => (
                                    <option key={mid} value={mid}>
                                        {memberInfo[mid]?.name || `User ${mid.substring(0, 6)}`}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Due Date */}
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> Due Date
                            </label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => { setDueDate(e.target.value); markChanged(); }}
                                disabled={!isOwner}
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-primary-500/30 disabled:opacity-60"
                            />
                        </div>
                    </div>

                    {/* Priority */}
                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <Flag className="h-3 w-3" /> Priority
                        </label>
                        <div className="flex gap-2">
                            {priorityOptions.map(p => (
                                <button key={p}
                                    onClick={() => { if (isOwner) { setPriority(p); markChanged(); }}}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                                        priority === p
                                            ? (PRIORITY_CONFIG[p]?.color || '') + ' ring-2 ring-offset-1 ring-primary-500/30'
                                            : 'bg-gray-50 dark:bg-gray-700/50 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Comments Section */}
                    <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <MessageCircle className="h-3.5 w-3.5" /> Comments ({comments.length})
                        </h4>

                        {comments.length === 0 ? (
                            <p className="text-xs text-gray-300 text-center py-4">No comments yet.</p>
                        ) : (
                            <div className="space-y-3 max-h-48 overflow-y-auto mb-3">
                                {comments.map(c => (
                                    <div key={c.id} className="flex gap-2">
                                        <div className="h-6 w-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0 mt-0.5">
                                            <span className="text-[8px] font-bold text-primary-600 dark:text-primary-400">
                                                {(c.userName || 'U').substring(0, 2).toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{c.userName}</span>
                                                <span className="text-[10px] text-gray-400">
                                                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{c.text}</p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={commentEndRef} />
                            </div>
                        )}

                        {/* Add Comment */}
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(); }}
                                placeholder="Write a comment..."
                                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-xs text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-primary-500/20"
                            />
                            <button onClick={handleAddComment} disabled={!newComment.trim()}
                                className="p-2 bg-primary-600 text-white rounded-xl hover:bg-primary-500 disabled:opacity-40 transition-all">
                                <Send className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/30">
                    {isOwner && (
                        <button onClick={() => onDelete(task.id)} className="text-xs font-semibold text-red-500 hover:text-red-600 flex items-center gap-1 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2 rounded-xl transition-all">
                            <Trash2 className="h-3.5 w-3.5" /> Delete Task
                        </button>
                    )}
                    <div className="flex items-center gap-2 ml-auto">
                        <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all">
                            Cancel
                        </button>
                        <button onClick={handleSave} disabled={!hasChanges}
                            className="px-5 py-2 bg-primary-600 text-white text-xs font-bold rounded-xl hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm">
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaskDetailModal;
