import { useEffect, useRef, useCallback } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

/**
 * A safe wrapper for Firestore onSnapshot listeners.
 * 
 * Features:
 * 1. Automatically waits for authentication (user.uid).
 * 2. Proper cleanup on unmount or dependency change.
 * 3. Prevents redundant/leaking listeners.
 * 4. Error logging without crashing the UI.
 * 5. Mounted-guard prevents state updates after unmount.
 * 6. Prevents FIRESTORE INTERNAL ASSERTION FAILED by guarding
 *    against rapid listener detach/reattach race conditions.
 * 
 * @param {Function} queryCreator - A function that returns a Firestore Query.
 * @param {Function} onUpdate - Callback for snapshot data (receives array of objects).
 * @param {Array} dependencies - Additional dependencies that should trigger a listener restart.
 * @param {Function} onError - Optional callback for snapshot errors (e.g., to trigger a query fallback).
 */
const useFirestoreListener = (queryCreator, onUpdate, dependencies = [], onError = null) => {
    const { user } = useAuth();
    const unsubscribeRef = useRef(null);
    const mountedRef = useRef(true);

    // Safe cleanup that prevents double-unsubscribe
    const cleanupListener = useCallback(() => {
        if (unsubscribeRef.current) {
            try {
                unsubscribeRef.current();
            } catch (e) {
                // Swallow errors during cleanup — Firestore SDK may already
                // have torn down the listener internally
            }
            unsubscribeRef.current = null;
        }
    }, []);

    useEffect(() => {
        mountedRef.current = true;

        // Wait for user authentication
        if (!user || !user.uid) {
            cleanupListener();
            return;
        }

        const setupListener = () => {
            try {
                const q = queryCreator();
                if (!q) return;

                // Clean up previous listener before starting a new one
                cleanupListener();

                // Start the new listener
                unsubscribeRef.current = onSnapshot(q, 
                    (snapshot) => {
                        // Guard: only process if still mounted
                        if (!mountedRef.current) return;

                        const data = snapshot.docs.map(doc => ({ 
                            id: doc.id, 
                            ...doc.data() 
                        }));
                        onUpdate(data);
                    },
                    (error) => {
                        // Guard: only process errors if still mounted
                        if (!mountedRef.current) return;

                        // Log but don't crash
                        if (error.code === 'failed-precondition') {
                            console.warn(`[FirestoreListener] Missing composite index for user ${user.uid}. Using client-side sorting.`);
                        } else {
                            console.warn(`[FirestoreListener] Snapshot error for user ${user.uid}:`, error.message);
                        }

                        // Propagate error to caller for fallbacks
                        if (onError) {
                            try {
                                onError(error);
                            } catch (cbErr) {
                                console.error('[FirestoreListener] Error in onError callback:', cbErr);
                            }
                        }
                    }
                );
            } catch (err) {
                if (!mountedRef.current) return;
                console.error('[FirestoreListener] Initialization error:', err);
                if (onError) onError(err);
            }
        };

        setupListener();

        // Reliable cleanup on unmount or dependency change
        return () => {
            mountedRef.current = false;
            cleanupListener();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.uid, ...dependencies]);
};

export default useFirestoreListener;

