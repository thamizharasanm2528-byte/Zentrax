import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, PlayCircle, PlusCircle, MessageSquare, Rocket, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../apiConfig';

const ActivityIcon = ({ type }) => {
    switch (type) {
        case 'task_completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
        case 'task_started': return <PlayCircle className="h-4 w-4 text-primary-500" />;
        case 'task_created': return <PlusCircle className="h-4 w-4 text-blue-500" />;
        case 'member_joined': return <Rocket className="h-4 w-4 text-purple-500" />;
        case 'mentor_feedback': return <MessageSquare className="h-4 w-4 text-orange-500" />;
        case 'project_created': return <Rocket className="h-4 w-4 text-amber-500" />;
        default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
};

const ProjectActivityTimeline = ({ projectId, user }) => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchActivity = async () => {
            if (!user) return;
            try {
                const token = await user.getIdToken();
                const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/activity`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('Failed to fetch activity');
                const data = await response.json();
                if (data.activities) setActivities(data.activities);
            } catch (err) {
                console.error('Error fetching activity:', err);
            }
            setLoading(false);
        };

        if (projectId && user) {
            fetchActivity();
            const interval = setInterval(fetchActivity, 30000); // Refresh every 30s
            return () => clearInterval(interval);
        }
    }, [projectId, user]);

    if (loading) return (
        <div className="flex items-center justify-center p-8">
            <Loader2 className="h-5 w-5 text-primary-600 animate-spin" />
        </div>
    );

    if (activities.length === 0) return (
        <div className="text-center p-8 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-3xl">
            <Clock className="h-8 w-8 mx-auto text-gray-200 mb-2" />
            <p className="text-xs text-gray-400">No recent activity logged.</p>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="relative pl-6 border-l-2 border-gray-100 dark:border-gray-700 space-y-8">
                {activities.map((activity, i) => (
                    <div key={activity.id} className="relative group animate-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${i * 50}ms` }}>
                        {/* Dot */}
                        <div className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-4 border-white dark:border-gray-800 bg-white dark:bg-gray-700 flex items-center justify-center shadow-sm">
                            <ActivityIcon type={activity.actionType} />
                        </div>
                        
                        <div className="space-y-1">
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">
                                {activity.message}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                <span>{new Date(activity.timestamp || activity.created_at || Date.now()).toLocaleDateString()}</span>
                                <span>•</span>
                                <span>{new Date(activity.timestamp || activity.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProjectActivityTimeline;
