import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

/**
 * PresenceDot — Shows a colored dot indicating a user's live status.
 * 
 * 🟢 Online  |  🟡 Away  |  ⚫ Offline
 * 
 * Subscribes to Firestore `presence/{userId}` in real-time.
 * Auto-marks offline if lastSeen > 2 minutes ago (stale heartbeat).
 * 
 * @param {string} userId — The UID to track
 * @param {string} size — 'sm' | 'md' | 'lg' (default: 'sm')
 * @param {string} className — Extra CSS classes
 */
const PresenceDot = ({ userId, size = 'sm', className = '' }) => {
    const [status, setStatus] = useState('offline');

    useEffect(() => {
        if (!userId) return;

        const presenceRef = doc(db, 'presence', userId);
        const unsub = onSnapshot(presenceRef, (snap) => {
            if (!snap.exists()) {
                setStatus('offline');
                return;
            }

            const data = snap.data();
            const lastSeen = data.lastSeen?.toDate?.();

            // If lastSeen is more than 2 minutes old, treat as offline
            if (lastSeen && Date.now() - lastSeen.getTime() > 2 * 60 * 1000) {
                if (data.status === 'online') {
                    setStatus('away');
                    return;
                }
            }

            setStatus(data.status || 'offline');
        }, (err) => {
            // Silently handle — user may not have presence doc yet
            setStatus('offline');
        });

        return () => unsub();
    }, [userId]);

    const sizes = {
        sm: 'h-2.5 w-2.5',
        md: 'h-3 w-3',
        lg: 'h-3.5 w-3.5'
    };

    const colors = {
        online: 'bg-green-500 shadow-green-500/50',
        away: 'bg-yellow-400 shadow-yellow-400/50',
        offline: 'bg-gray-400 shadow-gray-400/20'
    };

    const labels = {
        online: 'Online',
        away: 'Away',
        offline: 'Offline'
    };

    return (
        <span
            title={labels[status]}
            className={`inline-block rounded-full ring-2 ring-white dark:ring-gray-800 shadow-sm ${sizes[size]} ${colors[status]} ${status === 'online' ? 'animate-pulse' : ''} ${className}`}
        />
    );
};

export default PresenceDot;
