import React, { useRef, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../apiConfig';
import usePresence from '../hooks/usePresence';

const Layout = ({ children }) => {
    const { user, userData, loading: authLoading } = useAuth();
    const mainRef = useRef(null);
    const location = useLocation();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    usePresence();

    // Scroll main content to top on route change
    useEffect(() => {
        if (mainRef.current) {
            mainRef.current.scrollTo(0, 0);
        }
        // Close mobile menu on route change
        setMobileMenuOpen(false);
    }, [location.pathname]);

    // Heartbeat
    useEffect(() => {
        if (!user) return;
        const sendHeartbeat = async () => {
            try {
                const token = await user.getIdToken();
                await fetch(`${API_BASE_URL}/api/users/heartbeat`, {
                    method: 'PUT',
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (err) {
                // silent
            }
        };
        sendHeartbeat();
        const interval = setInterval(sendHeartbeat, 3 * 60 * 1000);
        return () => clearInterval(interval);
    }, [user]);

    // Loading state
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-zen-bg)' }}>
                <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(79,70,229,0.1)' }}>
                        <Loader2 className="h-5 w-5 animate-spin" style={{ color: '#4F46E5' }} />
                    </div>
                    <p className="text-xs font-medium text-slate-500 animate-pulse-soft">Loading ZENTRAX...</p>
                </div>
            </div>
        );
    }

    // Not logged in
    if (!user) {
        return <div className="min-h-screen" style={{ background: 'var(--color-zen-bg)' }}>{children}</div>;
    }

    // Syncing profile
    if (!userData) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ background: 'var(--color-zen-bg)' }}>
                <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(79,70,229,0.1)' }}>
                    <Loader2 className="h-5 w-5 animate-spin" style={{ color: '#4F46E5' }} />
                </div>
                <p className="text-xs font-medium text-slate-500 animate-pulse-soft">Synchronizing profile...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-zen-bg)' }}>
            <Navbar
                onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
                mobileMenuOpen={mobileMenuOpen}
            />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar
                    collapsed={sidebarCollapsed}
                    onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                />
                <main
                    ref={mainRef}
                    className="flex-1 h-[calc(100vh-56px)] overflow-y-auto"
                >
                    <div className="zen-container py-6">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;