import React, { useState, useEffect } from 'react';
import { BarChart3, Users, MessageCircle, Star, Clock, Activity, Shield, TrendingUp, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../apiConfig';
import fetchWithRetry from '../../utils/fetchWithRetry';

/**
 * MentorAnalytics — Mentor performance & team health dashboard.
 */
const MentorAnalytics = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const getToken = async () => {
        if (!user) return null;
        try { return await user.getIdToken(); } catch { return null; }
    };

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = await getToken();
                const res = await fetchWithRetry(`${API_BASE_URL}/api/mentor/analytics`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const response = await res.json();
                if (response.success) {
                    setStats(response.data);
                }
            } catch (err) {
                console.error('[MentorAnalytics] Error:', err);
            }
            setLoading(false);
        };
        if (user) fetchStats();
    }, [user]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="h-10 w-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
            </div>
        );
    }

    const teams = stats?.projects || [];
    const totalStudents = stats?.studentCount || 0;
    const totalFeedback = stats?.feedbackGiven || 0;
    const avgResponseTime = stats?.avgResponseTime || '< 1 hour';

    // Team health based on task completion
    const teamHealth = teams.map(team => {
        const tasks = team.tasks || [];
        const done = tasks.filter(t => t.status === 'completed').length;
        const total = tasks.length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        let health = 'good';
        if (pct < 30 && total > 0) health = 'at-risk';
        else if (pct < 60) health = 'needs-attention';
        return { ...team, tasksDone: done, tasksTotal: total, pct, health };
    });

    const healthColors = {
        good: { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400', border: 'border-green-200 dark:border-green-800', label: 'On Track' },
        'needs-attention': { bg: 'bg-yellow-100 dark:bg-yellow-900/20', text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-200 dark:border-yellow-800', label: 'Needs Attention' },
        'at-risk': { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800', label: 'At Risk' },
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                    <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center">
                        <BarChart3 className="h-5 w-5 text-white" />
                    </div>
                    Mentor Analytics
                </h1>
                <p className="text-sm text-gray-400 mt-1">Track your mentoring impact and team health</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Active Teams', value: teams.length, icon: Users, color: 'from-purple-500 to-indigo-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                    { label: 'Students', value: totalStudents, icon: Shield, color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                    { label: 'Feedback Given', value: totalFeedback, icon: MessageCircle, color: 'from-green-500 to-emerald-500', bg: 'bg-green-50 dark:bg-green-900/20' },
                    { label: 'Avg Response', value: avgResponseTime, icon: Clock, color: 'from-amber-500 to-orange-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                ].map((stat, i) => (
                    <div key={i} className={`${stat.bg} rounded-3xl p-5 border border-gray-100 dark:border-gray-700/50 group hover:shadow-lg transition-all`}>
                        <div className={`h-10 w-10 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                            <stat.icon className="h-5 w-5 text-white" />
                        </div>
                        <p className="text-2xl font-black text-gray-900 dark:text-white">{stat.value}</p>
                        <p className="text-xs text-gray-400 font-medium mt-0.5">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Team Health Heatmap */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
                    <Activity className="h-5 w-5 text-purple-500" /> Team Health Overview
                </h3>
                {teamHealth.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No teams assigned yet</p>
                ) : (
                    <div className="space-y-4">
                        {teamHealth.map(team => {
                            const hc = healthColors[team.health];
                            return (
                                <div key={team.id} className={`p-4 rounded-2xl border ${hc.border} ${hc.bg} transition-all hover:shadow-md`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{team.title || 'Untitled'}</p>
                                            <p className="text-[10px] text-gray-400 mt-0.5">{team.members?.length || 0} members • {team.tasksTotal} tasks</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider ${hc.text} ${hc.bg} border ${hc.border}`}>
                                            {hc.label}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 bg-white/50 dark:bg-gray-900/30 rounded-full h-2.5 overflow-hidden">
                                            <div className={`h-full rounded-full transition-all duration-700 ${
                                                team.pct >= 80 ? 'bg-green-500' : team.pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                            }`} style={{ width: `${team.pct}%` }} />
                                        </div>
                                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{team.pct}%</span>
                                    </div>
                                    <div className="flex items-center gap-4 mt-2">
                                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                            <CheckCircle2 className="h-3 w-3 text-green-500" /> {team.tasksDone} done
                                        </span>
                                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                            <Clock className="h-3 w-3 text-blue-500" /> {team.tasksTotal - team.tasksDone} remaining
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Performance Insights */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
                    <TrendingUp className="h-5 w-5 text-emerald-500" /> Mentoring Insights
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/10 dark:to-indigo-900/10 border border-purple-100 dark:border-purple-800/30">
                        <Star className="h-6 w-6 text-purple-500 mb-2" />
                        <p className="text-lg font-black text-gray-900 dark:text-white">{teams.filter(t => teamHealth.find(th => th.id === t.id)?.health === 'good').length}/{teams.length}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Teams on track</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 border border-green-100 dark:border-green-800/30">
                        <CheckCircle2 className="h-6 w-6 text-green-500 mb-2" />
                        <p className="text-lg font-black text-gray-900 dark:text-white">{teamHealth.reduce((s, t) => s + t.tasksDone, 0)}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Total tasks completed</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 border border-amber-100 dark:border-amber-800/30">
                        <Activity className="h-6 w-6 text-amber-500 mb-2" />
                        <p className="text-lg font-black text-gray-900 dark:text-white">{teamHealth.length > 0 ? Math.round(teamHealth.reduce((s, t) => s + t.pct, 0) / teamHealth.length) : 0}%</p>
                        <p className="text-xs text-gray-500 mt-0.5">Avg completion rate</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MentorAnalytics;
