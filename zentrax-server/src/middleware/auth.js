const admin = require('firebase-admin');

admin.initializeApp({
    credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    })
});

const db = admin.firestore();

// ─── In-memory role cache (5-minute TTL) ───
const roleCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedRole(uid) {
    const entry = roleCache.get(uid);
    if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
        return entry.role;
    }
    roleCache.delete(uid);
    return null;
}

function setCachedRole(uid, role) {
    roleCache.set(uid, { role, timestamp: Date.now() });
}

// ─── Middleware: Verify Firebase ID Token ───
const verifyToken = async (req, res, next) => {
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        const email = (decodedToken.email || '').toLowerCase();

        // Feature 1: College Email Restriction (@rajalakshmi.edu.in)
        // Allow whitelisted admins and registered mentors to bypass this restriction
        const { isAdminEmail } = require('./adminAuth');
        const isCollegeEmail = email.endsWith('@rajalakshmi.edu.in');
        const isAdmin = isAdminEmail(email);

        if (!isCollegeEmail && !isAdmin) {
            // Check if this is a registered mentor (via invite code)
            const userDoc = await db.collection('users').doc(decodedToken.uid).get();
            const isMentor = userDoc.exists && userDoc.data().role === 'mentor';

            if (!isMentor) {
                console.warn(`[Auth] Blocked unauthorized email domain: ${email}`);
                return res.status(403).json({
                    error: 'Only college emails (@rajalakshmi.edu.in) allowed'
                });
            }
        }

        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Error verifying token:', error.message);
        res.status(403).json({ error: 'Unauthorized' });
    }
};

// ─── Middleware: Require specific role (with cache) ───
const requireRole = (role) => {
    return async (req, res, next) => {
        const uid = req.user.uid;

        try {
            // Check cache first
            const cachedRole = getCachedRole(uid);
            if (cachedRole) {
                if (cachedRole !== role) {
                    console.warn(`Role mismatch for ${uid}: has '${cachedRole}', needs '${role}'`);
                    return res.status(403).json({ error: `Access denied: requires '${role}' role but you have '${cachedRole}'` });
                }
                return next();
            }

            // Cache miss — fetch from Firestore
            const userDoc = await db.collection('users').doc(uid).get();

            if (!userDoc.exists) {
                // Auto-create user doc if missing (default to 'student')
                const defaultRole = 'student';
                const email = (req.user.email || '').toLowerCase();
                console.log(`Auto-creating user doc for ${uid} with role '${defaultRole}'`);

                // Feature 5 Cleanup: Remove level, points, badges
                await db.collection('users').doc(uid).set({
                    uid,
                    email,
                    name: email.split('@')[0],
                    role: defaultRole,
                    skills: [],
                    createdAt: new Date().toISOString()
                });

                setCachedRole(uid, defaultRole);
                if (defaultRole !== role) {
                    return res.status(403).json({ error: `Access denied: requires '${role}' role` });
                }
                return next();
            }

            const userRole = userDoc.data().role;
            setCachedRole(uid, userRole);

            if (userRole !== role) {
                console.warn(`Role mismatch for ${uid}: has '${userRole}', needs '${role}'`);
                return res.status(403).json({ error: `Access denied: requires '${role}' role but you have '${userRole}'` });
            }

            next();
        } catch (error) {
            console.error('Error checking user role:', error);
            res.status(500).json({ error: 'Internal server error during role validation' });
        }
    };
};

module.exports = { admin, db, verifyToken, requireRole };
