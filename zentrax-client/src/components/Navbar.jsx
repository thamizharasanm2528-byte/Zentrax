import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, User, Menu, X } from 'lucide-react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { db } from '../firebase';
import logo from '../assets/logo.png';
import { collection, query, where, updateDoc, doc, limit } from 'firebase/firestore';
import useFirestoreListener from '../hooks/useFirestoreListener';
import NotificationDropdown from './NotificationDropdown';

// Mobile sidebar items (mirrored from Sidebar.jsx)
import {
    LayoutDashboard, FolderKanban, Users, GraduationCap,
    MessageSquare, Sparkles, ClipboardList, UserCheck
} from 'lucide-react';

const Navbar = ({ onMobileMenuToggle, mobileMenuOpen }) => {
    const { user, logout, userData } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef(null);
    const location = useLocation();
    const isMentor = userData?.role === 'mentor';

    useFirestoreListener(
        () => {
            if (!user) return null;
            return query(
                collection(db, 'notifications'),
                where('userId', '==', user.uid),
                limit(20)
            );
        },
        (data) => {
            const notifs = [...data].sort((a, b) => (b.time || '').localeCompare(a.time || ''));
            setNotifications(notifs);
            setUnreadCount(notifs.filter(n => !n.read).length);
        },
        []
    );

    useEffect(() => {
        document.title = unreadCount > 0 ? `(${unreadCount}) ZENTRAX` : 'ZENTRAX';
    }, [unreadCount]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async (notifId) => {
        try {
            const notifRef = doc(db, 'notifications', notifId);
            await updateDoc(notifRef, { read: true });
        } catch (err) {
            // silent fail
        }
    };

    // Mobile nav items
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
    const mobileMenuItems = isMentor ? mentorItems : studentItems;

    return (
        <>
            <nav
                className="h-14 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-50"
                style={{
                    background: 'var(--color-zen-navbar-bg, rgba(255, 255, 255, 0.85))',
                    backdropFilter: 'blur(12px)',
                    borderBottom: '1px solid var(--color-zen-border)',
                }}
            >
                {/* Left: Logo + Mobile Menu */}
                <div className="flex items-center gap-3">
                    {/* Mobile hamburger */}
                    <button
                        onClick={onMobileMenuToggle}
                        className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
                        aria-label="Toggle menu"
                    >
                        {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>

                    <Link to="/" className="flex items-center gap-2 group">
                        <img src={logo} alt="Zentrax Logo" className="h-7 w-7 object-contain" />
                        <span className="text-base font-bold text-slate-900 tracking-tight hidden sm:inline">
                            ZENTRAX
                        </span>
                    </Link>
                </div>

                {/* Right: Notifications + Profile */}
                <div className="flex items-center gap-2">
                    {/* Notifications */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="p-2 rounded-lg relative transition-all"
                            style={{
                                color: showDropdown ? '#4F46E5' : 'var(--color-slate-500)',
                                background: showDropdown ? 'rgba(79, 70, 229, 0.06)' : 'transparent',
                            }}
                        >
                            <Bell className="h-[18px] w-[18px]" />
                            {unreadCount > 0 && (
                                <span
                                    className="absolute top-1 right-1 h-4 w-4 text-[10px] font-bold flex items-center justify-center rounded-full"
                                    style={{
                                        background: '#ef4444',
                                        color: '#fff',
                                        border: '2px solid var(--color-zen-bg-secondary)',
                                    }}
                                >
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>
                        {showDropdown && (
                            <NotificationDropdown
                                notifications={notifications}
                                onClose={() => setShowDropdown(false)}
                                onMarkAsRead={markAsRead}
                            />
                        )}
                    </div>

                    {/* Divider */}
                    <div className="h-6 w-px mx-1" style={{ background: 'var(--color-zen-border)' }} />

                    {/* User Info */}
                    <div className="flex items-center gap-2.5">
                        <div className="text-right hidden sm:block">
                            <p className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[120px]">
                                {userData?.name || (user?.email || '').split('@')[0]}
                            </p>
                            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#4F46E5' }}>
                                {userData?.role || 'User'}
                            </p>
                        </div>
                        <Link
                            to="/settings"
                            className="h-8 w-8 rounded-lg flex items-center justify-center overflow-hidden transition-transform hover:scale-105"
                            style={{
                                background: 'rgba(79, 70, 229, 0.08)',
                                border: '1px solid rgba(79, 70, 229, 0.15)',
                            }}
                        >
                            {(userData?.profilePicture || user?.photoURL) ? (
                                <img
                                    src={userData?.profilePicture || user?.photoURL}
                                    alt="Avatar"
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <User className="h-4 w-4" style={{ color: '#4F46E5' }} />
                            )}
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Mobile Slide-out Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-40" onClick={onMobileMenuToggle}>
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                    <div
                        className="absolute left-0 top-14 bottom-0 w-64 p-3 space-y-0.5 overflow-y-auto animate-slide-in-right"
                        style={{
                            background: 'var(--color-zen-surface)',
                            borderRight: '1px solid var(--color-zen-border)',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {mobileMenuItems.map(item => (
                            <NavLink
                                key={item.name}
                                to={item.path}
                                onClick={onMobileMenuToggle}
                                className={({ isActive }) => `
                                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                                    ${isActive ? 'text-[#4F46E5]' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}
                                `}
                                style={({ isActive }) => ({
                                    background: isActive ? 'rgba(79, 70, 229, 0.06)' : 'transparent',
                                })}
                            >
                                <item.icon className="h-[18px] w-[18px]" />
                                <span>{item.name}</span>
                            </NavLink>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
};

export default Navbar;