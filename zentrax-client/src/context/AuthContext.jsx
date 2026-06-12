import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, authReady } from '../firebase';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signInWithCustomToken,
    createUserWithEmailAndPassword,
    signOut
} from 'firebase/auth';
import { API_BASE_URL } from '../apiConfig';

const AuthContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Reusable profile fetcher — can be called from Login directly
    const fetchUserProfile = useCallback(async (uid) => {
        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch(`${API_BASE_URL}/api/users/profile/${uid}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (res.ok && data.user) {
                setUserData(data.user);
                return data.user;
            } else {
                console.warn("AuthContext: Profile fetch failed or missing for", uid);
                const fallback = { role: 'student', error: 'no_profile' };
                setUserData(fallback);
                return fallback;
            }
        } catch (err) {
            console.error("AuthContext: Profile API error", err);
            const fallback = { role: 'student', error: 'fetch_failed' };
            setUserData(fallback);
            return fallback;
        }
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                // For session restoration (page refresh):
                // Wait for the profile fetch at least once before releasing the gate
                if (!userData) {
                    await fetchUserProfile(currentUser.uid);
                }
            } else {
                setUserData(null);
            }

            // RELEASE the loading gate only after the first auth + profile attempt
            setLoading(false);
        });

        return () => unsubscribe();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const signup = async (email, password) => {
        await authReady;
        return createUserWithEmailAndPassword(auth, email, password);
    };

    const login = async (email, password) => {
        await authReady;
        return signInWithEmailAndPassword(auth, email, password);
    };

    const logout = () => {
        setUserData(null);
        return signOut(auth);
    };

    const loginWithCustomToken = async (customToken) => {
        await authReady;
        return signInWithCustomToken(auth, customToken);
    };

    // Google Auth removed — mentors are admin-created, students use @rajalakshmi.edu.in email

    const value = {
        user,
        userData,
        signup,
        login,
        loginWithCustomToken,
        logout,
        loading,
        fetchUserProfile
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};