import React from 'react';
import { Bell, Clock, Inbox } from 'lucide-react';

const NotificationDropdown = ({ notifications, onClose, onMarkAsRead }) => {
    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div
            className="absolute right-0 mt-2 w-80 rounded-xl overflow-hidden shadow-2xl animate-fade-in z-50"
            style={{ background: 'var(--color-zen-surface)', border: '1px solid var(--color-zen-border)' }}
        >
            {/* Header */}
            <div className="p-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-zen-border)' }}>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Bell className="h-3.5 w-3.5" style={{ color: '#4F46E5' }} />
                    Notifications
                    {unreadCount > 0 && (
                        <span className="zen-badge text-[10px]">{unreadCount} new</span>
                    )}
                </h3>
            </div>

            {/* Content */}
            <div className="max-h-[320px] overflow-y-auto">
                {notifications.length === 0 ? (
                    <div className="py-10 text-center">
                        <Inbox className="h-6 w-6 mx-auto mb-2" style={{ color: 'var(--color-zen-border)' }} />
                        <p className="text-xs text-slate-500 dark:text-[#94A3B8]">No notifications</p>
                    </div>
                ) : (
                    notifications.slice(0, 8).map((n) => (
                        <div
                            key={n.id}
                            onClick={() => !n.read && onMarkAsRead(n.id)}
                            className="p-3 flex items-start gap-3 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                            style={{
                                background: !n.read ? 'rgba(79,70,229,0.03)' : 'transparent',
                                borderBottom: '1px solid var(--color-zen-border)',
                            }}
                        >
                            <div
                                className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                                style={{
                                    background: !n.read ? 'rgba(79,70,229,0.1)' : 'var(--color-zen-surface-hover)',
                                }}
                            >
                                <Bell className="h-3 w-3" style={{ color: !n.read ? '#4F46E5' : '#94A3B8' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <p className={`text-xs truncate ${!n.read ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-[#D1D5DB]'}`}>
                                        {n.title}
                                    </p>
                                    {!n.read && <div className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: '#4F46E5' }} />}
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] line-clamp-2 mt-0.5">{n.message}</p>
                                <div className="flex items-center gap-1 mt-1.5 text-[10px] text-slate-400 dark:text-[#94A3B8] opacity-80">
                                    <Clock className="h-2.5 w-2.5" />
                                    {new Date(n.time || n.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default NotificationDropdown;
