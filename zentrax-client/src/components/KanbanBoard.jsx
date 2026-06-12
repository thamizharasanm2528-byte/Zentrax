import React, { useState } from 'react';
import { Layout, List } from 'lucide-react';
import TaskCard from './TaskCard';

/**
 * KanbanBoard — Three-column drag-and-drop task board.
 * 
 * Columns: TODO → IN PROGRESS → DONE
 * Uses HTML5 Drag & Drop API (zero dependencies).
 */

const COLUMNS = [
    { id: 'pending', title: 'To Do', emoji: '📋', headerColor: 'text-gray-500', accentColor: 'border-gray-300 dark:border-gray-600', bgDrop: 'bg-gray-50/50 dark:bg-gray-700/20' },
    { id: 'in-progress', title: 'In Progress', emoji: '🔨', headerColor: 'text-blue-500', accentColor: 'border-blue-300 dark:border-blue-700', bgDrop: 'bg-blue-50/50 dark:bg-blue-900/10' },
    { id: 'completed', title: 'Done', emoji: '✅', headerColor: 'text-green-500', accentColor: 'border-green-300 dark:border-green-700', bgDrop: 'bg-green-50/50 dark:bg-green-900/10' }
];

const KanbanBoard = ({ tasks = [], memberInfo = {}, onToggle, onDelete, onTaskClick, onMoveTask, isOwner }) => {
    const [draggedTask, setDraggedTask] = useState(null);
    const [dragOverColumn, setDragOverColumn] = useState(null);

    const handleDragStart = (e, task) => {
        setDraggedTask(task);
        e.dataTransfer.effectAllowed = 'move';
        // Add visual feedback
        setTimeout(() => {
            e.target.style.opacity = '0.4';
        }, 0);
    };

    const handleDragEnd = (e) => {
        e.target.style.opacity = '1';
        setDraggedTask(null);
        setDragOverColumn(null);
    };

    const handleDragOver = (e, columnId) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverColumn(columnId);
    };

    const handleDragLeave = () => {
        setDragOverColumn(null);
    };

    const handleDrop = (e, targetStatus) => {
        e.preventDefault();
        setDragOverColumn(null);

        if (draggedTask && draggedTask.status !== targetStatus) {
            onMoveTask(draggedTask.id, targetStatus);
        }
        setDraggedTask(null);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {COLUMNS.map(col => {
                const columnTasks = tasks.filter(t => t.status === col.id);
                const isOver = dragOverColumn === col.id;

                return (
                    <div
                        key={col.id}
                        onDragOver={(e) => handleDragOver(e, col.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, col.id)}
                        className={`rounded-2xl border-2 border-dashed transition-all duration-200 ${
                            isOver
                                ? `${col.accentColor} ${col.bgDrop} scale-[1.02]`
                                : 'border-transparent'
                        }`}
                    >
                        {/* Column Header */}
                        <div className="flex items-center justify-between px-3 py-3 mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-base">{col.emoji}</span>
                                <span className={`text-xs font-bold uppercase tracking-wider ${col.headerColor}`}>
                                    {col.title}
                                </span>
                            </div>
                            <span className="text-xs font-bold text-gray-300 dark:text-gray-600 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                                {columnTasks.length}
                            </span>
                        </div>

                        {/* Task Cards */}
                        <div className="space-y-3 px-1 pb-3 min-h-[100px]">
                            {columnTasks.length === 0 ? (
                                <div className={`flex items-center justify-center py-8 rounded-xl border-2 border-dashed transition-colors ${
                                    isOver ? col.accentColor : 'border-gray-100 dark:border-gray-700/50'
                                }`}>
                                    <p className="text-xs text-gray-300 dark:text-gray-600 font-medium">
                                        {isOver ? 'Drop here' : 'No tasks'}
                                    </p>
                                </div>
                            ) : (
                                columnTasks.map(task => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        memberInfo={memberInfo}
                                        onToggle={onToggle}
                                        onDelete={onDelete}
                                        onClick={onTaskClick}
                                        isOwner={isOwner}
                                        draggable={true}
                                        onDragStart={(e) => handleDragStart(e, task)}
                                        onDragEnd={handleDragEnd}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default KanbanBoard;
