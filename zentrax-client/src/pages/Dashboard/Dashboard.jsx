import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';


const Dashboard = () => {
    const { user, userData, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-zen-bg)' }}>
                <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center animate-pulse" style={{ background: 'rgba(79,70,229,0.1)' }}>
                        <div className="h-5 w-5 rounded-full border-2 border-[#4F46E5] border-t-transparent animate-spin" />
                    </div>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (userData?.role === 'admin') return <Navigate to="/admin" replace />;
    if (userData?.role === 'mentor') return <Navigate to="/mentor-dashboard" replace />;
    return <Navigate to="/student-dashboard" replace />;
};

export default Dashboard;