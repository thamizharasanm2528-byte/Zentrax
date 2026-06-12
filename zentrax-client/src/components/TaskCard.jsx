import React from 'react';
import { CheckCircle2, PlayCircle, Circle, Clock, User, AlertTriangle, Flag } from 'lucide-react';

/**
 * TaskCard — A draggable task card for the Kanban board.
 * 
 * Shows: title, priority badge, assignee avatar, due date
 * Click to open detail modal
 */

const PRIORITY_CONFIG = {
    critical: { label: 'Critical', color: 'bg-red-500 text-white', icon: AlertTriangle },
    high: { label: 'High', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400', icon: Flag },
    medium: { label: 'Medium', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400', icon: Flag },
    low: { label: 'Low', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400', icon: Flag },
};

const TaskCard = ({ task, memberInfo = {}, onToggle, onDelete, onClick, isOwner, draggable = false, onDragStart, onDragEnd }) => {
    const priority = task.priority || 'medium';
    const assignee = task.assignee ? memberInfo[task.assignee] : null;
    const assigneeName = assignee?.name || (task.assignee ? `User ${task.assignee.substring(0, 6)}` : null);
    const assigneeInitials = assigneeName ? (assigneeName.length >= 2 ? assigneeName.substring(0, 2).toUpperCase() : assigneeName.toUpperCase()) : null;

    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';

    const statusIcon = {
        completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
        'in-progress': <PlayCircle className="h-4 w-4 text-primary-500" />,
        pending: <Circle className="h-4 w-4 text-gray-300" />
    };

    return (
        <div
            draggable={draggable}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onClick={() => onClick && onClick(task)}
            className={`group p-4 bg-white dark:bg-gray-800 rounded-2xl border transition-all cursor-pointer hover:shadow-lg hover:-translate-y-0.5 ${
                isOverdue
                    ? 'border-red-200 dark:border-red-800/40 ring-1 ring-red-100 dark:ring-red-900/20'
                    : 'border-gray-100 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-800'
            } ${draggable ? 'active:cursor-grabbing active:shadow-2xl active:scale-105' : ''}`}
        >
            {/* Priority & Status */}
            <div className="flex items-center justify-between mb-2">
                <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${PRIORITY_CONFIG[priority]?.color || PRIORITY_CONFIG.medium.color}`}>
                    {PRIORITY_CONFIG[priority]?.label || 'Medium'}
                </span>
                <button onClick={(e) => { e.stopPropagation(); onToggle && onToggle(task.id); }} className="opacity-60 hover:opacity-100 transition-opacity">
                    {statusIcon[task.status] || statusIcon.pending}
                </button>
            </div>

            {/* Title */}
            <p className={`text-sm font-semibold leading-snug mb-3 ${
                task.status === 'completed'
                    ? 'text-gray-400 line-through'
                    : 'text-gray-800 dark:text-gray-100'
            }`}>
                {task.title}
            </p>

            {/* Description preview */}
            {task.description && (
                <p className="text-[11px] text-gray-400 line-clamp-2 mb-3 leading-relaxed">{task.description}</p>
            )}

            {/* Footer: Assignee + Due Date */}
            <div className="flex items-center justify-between">
                {/* Assignee */}
                {assigneeName ? (
                    <div className="flex items-center gap-1.5">
                        <div className="h-5 w-5 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                            <span className="text-[8px] font-bold text-primary-600 dark:text-primary-400">{assigneeInitials}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-medium">{assigneeName}</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-1 text-gray-300">
                        <User className="h-3.5 w-3.5" />
                        <span className="text-[10px]">Unassigned</span>
                    </div>
                )}

                {/* Due Date */}
                {task.dueDate && (
                    <div className={`flex items-center gap-1 text-[10px] font-medium ${
                        isOverdue ? 'text-red-500' : 'text-gray-400'
                    }`}>
                        <Clock className="h-3 w-3" />
                        {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                )}
            </div>

            {/* Comments indicator */}
            {task.comments && task.comments.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-50 dark:border-gray-700/50 flex items-center gap-1 text-[10px] text-gray-400">
                    💬 {task.comments.length} comment{task.comments.length > 1 ? 's' : ''}
                </div>
            )}
        </div>
    );
};

export { PRIORITY_CONFIG };
export default TaskCard;
