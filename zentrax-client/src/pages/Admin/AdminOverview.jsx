import React, { useState, useEffect } from 'react';
import { auth } from '../../firebase';
import { API_BASE_URL } from '../../apiConfig';
import { Users, FolderKanban, Activity, Shield, Loader2 } from 'lucide-react';

const AdminOverview = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = await auth.currentUser?.getIdToken();
                const res = await fetch(`${API_BASE_URL}/api/admin/stats`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setStats(data.data?.metrics || data.stats || data);
                }
            } catch (err) { console.error('[Admin] Stats error:', err); }
            setLoading(false);
        };
        fetchStats();
    }, []);

    if (loading) {
        return <div className="flex justify-center py-32"><Loader2 className="h-6 w-6 animate-spin" style={{ color: '#4F46E5' }} /></div>;
    }

    const cards = [
        { label: 'Total Users', value: stats?.totalUsers || stats?.users || 0, icon: Users, color: '#3b82f6' },
        { label: 'Students', value: stats?.students || 0, icon: Users, color: '#4F46E5' },
        { label: 'Mentors', value: stats?.mentors || 0, icon: Shield, color: '#8b5cf6' },
        { label: 'Projects', value: stats?.totalProjects || stats?.projects || 0, icon: FolderKanban, color: '#f59e0b' },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-xl font-bold text-slate-900">Admin Dashboard</h1>
                <p className="text-sm text-slate-500 mt-0.5">Platform overview and management</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {cards.map(card => (
                    <div key={card.label} className="zen-card p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: `${card.color}15` }}>
                                <card.icon className="h-4 w-4" style={{ color: card.color }} />
                            </div>
                        </div>
                        <p className="zen-stat-value text-2xl">{card.value}</p>
                        <p className="zen-stat-label">{card.label}</p>
                    </div>
                ))}
            </div>

            <div className="zen-card p-6">
                <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Activity className="h-4 w-4" style={{ color: '#4F46E5' }} /> Platform Activity
                </h2>
                <p className="text-sm text-slate-500">
                    ZENTRAX is running smoothly. Use the sidebar to manage users, projects, and view analytics.
                </p>
            </div>
        </div>
    );
};

export default AdminOverview;