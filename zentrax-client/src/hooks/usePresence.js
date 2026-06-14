import { useEffect, useRef } from 'react';
import { db } from '../firebase';
import { doc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

/**
 * usePresence — Tracks user's online/away/offline status in Firestore.
 * 
 * Writes to `presence/{uid}` document with:
 *   - status: 'online' | 'away' | 'offline'
 *   - lastSeen: server timestamp
 * 
 * Features:
 *   - Automatically sets 'away' after 5 minutes of inactivity
 *   - Sets 'offline' on page close/tab switch (via visibilitychange)
 *   - Heartbeat every 60s to keep presence alive
 *   - Fully cleans up on unmount
 */
const usePresence = () => {
    const { user } = useAuth();
    const idleTimerRef = useRef(null);
    const heartbeatRef = useRef(null);
    const statusRef = useRef('online');
    const lastResetRef = useRef(0);

    useEffect(() => {
        if (!user?.uid) return;

        const presenceRef = doc(db, 'presence', user.uid);

        // Write presence status
        const setStatus = async (status) => {
            if (statusRef.current === status) return; // Skip duplicate writes
            statusRef.current = status;
            try {
                await setDoc(presenceRef, {
                    status,
                    lastSeen: serverTimestamp(),
                    uid: user.uid
                }, { merge: true });
            } catch (e) {
                console.warn('[Presence] Failed to update:', e.message);
            }
        };

        // Set online immediately
        setStatus('online');

        // Heartbeat — keeps presence alive every 60s
        heartbeatRef.current = setInterval(() => {
            if (statusRef.current === 'online') {
                setDoc(presenceRef, {
                    lastSeen: serverTimestamp(),
                    status: 'online',
                    uid: user.uid
                }, { merge: true }).catch(() => {});
            }
        }, 60000);

        // Idle detection — set 'away' after 5 min of no interaction
        const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

        const resetIdle = () => {
            const now = Date.now();
            if (statusRef.current === 'away') {
                setStatus('online');
            } else if (now - lastResetRef.current < 5000) {
                // Skip if reset was already triggered in the last 5 seconds to throttle
                return;
            }
            lastResetRef.current = now;
            clearTimeout(idleTimerRef.current);
            idleTimerRef.current = setTimeout(() => {
                setStatus('away');
            }, IDLE_TIMEOUT);
        };

        // Track user activity
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        events.forEach(e => window.addEventListener(e, resetIdle, { passive: true }));
        resetIdle(); // Start idle timer

        // Tab visibility — offline when tab hidden, online when visible
        const handleVisibility = () => {
            if (document.hidden) {
                setStatus('away');
            } else {
                setStatus('online');
                resetIdle();
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);

        // Before unload — try to set offline
        const handleBeforeUnload = () => {
            // Use sendBeacon for reliable last-gasp write
            // Firestore SDK doesn't support sendBeacon, so we do a best-effort setDoc
            statusRef.current = 'offline';
            setDoc(presenceRef, {
                status: 'offline',
                lastSeen: serverTimestamp(),
                uid: user.uid
            }, { merge: true }).catch(() => {});
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        // Cleanup
        return () => {
            events.forEach(e => window.removeEventListener(e, resetIdle));
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            clearTimeout(idleTimerRef.current);
            clearInterval(heartbeatRef.current);

            // Set offline on unmount
            setDoc(presenceRef, {
                status: 'offline',
                lastSeen: serverTimestamp(),
                uid: user.uid
            }, { merge: true }).catch(() => {});
        };
    }, [user?.uid]);
};

export default usePresence;
