import React, { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import logo from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard, Users, FolderKanban, BarChart3,
    ChevronLeft, LogOut, Shield, Menu, X, KeyRound
} from 'lucide-react';

const AdminLayout = ({ children }) => {
    const { logout, userData, user } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);
    const location = useLocation();

    const navItems = [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
        { name: 'Users', icon: Users, path: '/admin/users' },
        { name: 'Mentor Invites', icon: KeyRound, path: '/admin/mentor-invites' },
        { name: 'Projects', icon: FolderKanban, path: '/admin/projects' },
        { name: 'Analytics', icon: BarChart3, path: '/admin/reports' },
    ];

    const SidebarContent = () => (
        <>
            {/* Header */}
            <div className="p-4" style={{ borderBottom: '1px solid var(--color-zen-border)' }}>
                <Link to="/admin" className="flex items-center gap-2.5">
                    <img src={logo} alt="Zentrax Logo" className="h-8 w-8 object-contain" />
                    <div>
                        <p className="text-sm font-bold text-slate-900">ZENTRAX</p>
                        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#4F46E5' }}>Admin Panel</p>
                    </div>
                </Link>
            </div>

            {/* Nav */}
            <nav className="flex-1 p-2 space-y-0.5">
                {navItems.map(item => (
                    <NavLink
                        key={item.name}
                        to={item.path}
                        end={item.path === '/admin'}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) => `
                            flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all
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
            </nav>

            {/* Footer */}
            <div className="p-3 space-y-1" style={{ borderTop: '1px solid var(--color-zen-border)' }}>
                <Link
                    to="/"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all"
                >
                    <ChevronLeft className="h-[18px] w-[18px]" />
                    <span>Back to App</span>
                </Link>
                <button
                    onClick={logout}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50/50 transition-all w-full"
                >
                    <LogOut className="h-[18px] w-[18px]" />
                    <span>Sign out</span>
                </button>
            </div>
        </>
    );

    return (
        <div className="min-h-screen flex" style={{ background: 'var(--color-zen-bg)' }}>
            {/* Desktop Sidebar */}
            <aside
                className="hidden md:flex w-[240px] flex-col h-screen sticky top-0"
                style={{
                    background: 'var(--color-zen-surface)',
                    borderRight: '1px solid var(--color-zen-border)',
                }}
            >
                <SidebarContent />
            </aside>

            {/* Mobile Header + Sidebar */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-4"
                style={{
                    background: 'var(--color-zen-navbar-bg, rgba(255, 255, 255, 0.85))',
                    backdropFilter: 'blur(12px)',
                    borderBottom: '1px solid var(--color-zen-border)',
                }}
            >
                <button onClick={() => setMobileOpen(!mobileOpen)} className="p-1.5 text-slate-500 hover:text-slate-900">
                    {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
                <span className="ml-3 text-sm font-bold text-slate-900">ZENTRAX Admin</span>
            </div>

            {mobileOpen && (
                <div className="md:hidden fixed inset-0 z-40 pt-14" onClick={() => setMobileOpen(false)}>
                    <div className="absolute inset-0 bg-slate-900/40" />
                    <div
                        className="absolute left-0 top-14 bottom-0 w-64 flex flex-col animate-slide-in-right"
                        style={{ background: 'var(--color-zen-surface)', borderRight: '1px solid var(--color-zen-border)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <SidebarContent />
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 min-h-screen md:py-0 pt-14">
                <div className="zen-container py-6">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;