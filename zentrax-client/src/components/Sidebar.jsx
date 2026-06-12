import React, { useState } from 'react';
import {
    LayoutDashboard,
    FolderKanban,
    Users,
    GraduationCap,
    MessageSquare,
    Sparkles,
    User,
    ClipboardList,
    UserCheck,
    ChevronLeft,
    ChevronRight,
    LogOut
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ collapsed, onToggle }) => {
    const { userData, logout } = useAuth();
    const location = useLocation();
    const isMentor = userData?.role === 'mentor';
    const isOnboarding = location.pathname.startsWith('/onboarding');

    const studentItems = [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/student-dashboard' },
        { name: 'Projects', icon: FolderKanban, path: '/projects/my' },
        { name: 'Explore Projects', icon: Users, path: '/find-team' },
        { name: 'Mentors', icon: GraduationCap, path: '/request-mentor' },
        { name: 'Messages', icon: MessageSquare, path: '/messages' },
        { name: 'AI Assistant', icon: Sparkles, path: '/ai-chat' },
        { name: 'Profile', icon: User, path: '/settings' },
    ];

    const mentorItems = [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/mentor-dashboard' },
        { name: 'Requests', icon: ClipboardList, path: '/mentor/doubts' },
        { name: 'Teams', icon: UserCheck, path: '/mentor/teams' },
        { name: 'Messages', icon: MessageSquare, path: '/messages' },
        { name: 'Profile', icon: User, path: '/settings' },
    ];

    const menuItems = isMentor ? mentorItems : studentItems;

    // Don't show sidebar during onboarding
    if (isOnboarding) return null;

    return (
        <aside
            className={`
                ${collapsed ? 'w-[68px]' : 'w-[240px]'}
                flex flex-col h-[calc(100vh-56px)] border-r transition-all duration-300 ease-in-out flex-shrink-0
                hidden md:flex
            `}
            style={{
                background: 'var(--color-zen-surface)',
                borderColor: 'var(--color-zen-border)',
            }}
        >
            {/* Nav Items */}
            <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.path}
                        title={collapsed ? item.name : undefined}
                        className={({ isActive }) => `
                            flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group relative
                            ${collapsed ? 'justify-center' : ''}
                            ${isActive
                                ? 'text-[#4F46E5]'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                            }
                        `}
                        style={({ isActive }) => ({
                            background: isActive ? 'rgba(79, 70, 229, 0.06)' : 'transparent',
                        })}
                    >
                        {({ isActive }) => (
                            <>
                                {isActive && (
                                    <span
                                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                                        style={{ background: '#4F46E5' }}
                                    />
                                )}
                                <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
                                {!collapsed && <span>{item.name}</span>}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Bottom Section */}
            <div className="px-2 py-3 space-y-1" style={{ borderTop: '1px solid var(--color-zen-border)' }}>
                {/* Collapse Toggle */}
                <button
                    onClick={onToggle}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[#94A3B8] hover:text-[#D1D5DB] transition-all w-full"
                    style={{ background: 'transparent' }}
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {collapsed ? (
                        <ChevronRight className="h-[18px] w-[18px] flex-shrink-0" />
                    ) : (
                        <>
                            <ChevronLeft className="h-[18px] w-[18px] flex-shrink-0" />
                            <span>Collapse</span>
                        </>
                    )}
                </button>

                {/* Logout */}
                <button
                    onClick={logout}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[#94A3B8] hover:text-red-400 transition-all w-full ${collapsed ? 'justify-center' : ''}`}
                    title="Sign out"
                >
                    <LogOut className="h-[18px] w-[18px] flex-shrink-0" />
                    {!collapsed && <span>Sign out</span>}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;