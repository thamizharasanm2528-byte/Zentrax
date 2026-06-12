import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';

const ICONS = { success: CheckCircle, error: XCircle, warning: AlertTriangle };

const COLORS = {
    success: { bg: 'rgba(0,224,138,0.1)', border: 'rgba(0,224,138,0.2)', text: '#00E08A', icon: '#00E08A' },
    error: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', text: '#ef4444', icon: '#ef4444' },
    warning: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', text: '#f59e0b', icon: '#f59e0b' },
};

const Toast = ({ message, type = 'success', duration = 5000, onClose }) => {
    const [visible, setVisible] = useState(true);
    const [exiting, setExiting] = useState(false);
    const Icon = ICONS[type] || ICONS.success;
    const color = COLORS[type] || COLORS.success;

    useEffect(() => {
        const timer = setTimeout(() => {
            setExiting(true);
            setTimeout(() => { setVisible(false); onClose?.(); }, 300);
        }, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    if (!visible) return null;

    return createPortal(
        <div className={`fixed top-6 right-6 z-[9999] max-w-sm transition-all duration-300 ${exiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}>
            <div className="flex items-start gap-3 p-3.5 rounded-xl shadow-lg" style={{
                background: color.bg,
                border: `1px solid ${color.border}`,
                backdropFilter: 'blur(12px)'
            }}>
                <Icon className="h-4 w-4 shrink-0 mt-0.5" style={{ color: color.icon }} />
                <p className="text-sm font-medium flex-1" style={{ color: color.text }}>{message}</p>
                <button onClick={() => { setExiting(true); setTimeout(() => { setVisible(false); onClose?.(); }, 300); }}
                    className="shrink-0 p-0.5 rounded-md transition-colors hover:bg-white/5">
                    <X className="h-3.5 w-3.5" style={{ color: color.text, opacity: 0.6 }} />
                </button>
            </div>
        </div>,
        document.body
    );
};

export default Toast;