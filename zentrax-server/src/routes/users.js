const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, db, admin } = require('../middleware/auth');
const { sendWelcomeEmail } = require('../services/emailService');

const INVITES_COLLECTION = 'mentor_invites';

// ════════════════════════════════════════════════════
//  PUBLIC: Mentor Registration via Invite Code
// ════════════════════════════════════════════════════

router.post('/register-mentor', async (req, res) => {
    try {
        const { code, email, password, name } = req.body;

        if (!code || !email || !password || !name) {
            return res.status(400).json({ error: 'All fields are required: code, email, password, name.' });
        }

        const trimmedCode = code.trim().toUpperCase();
        const mentorEmail = email.toLowerCase().trim();
        const mentorName = name.trim();

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }

        // ── 1. Validate invite code ──
        const inviteRef = db.collection(INVITES_COLLECTION).doc(trimmedCode);
        const inviteDoc = await inviteRef.get();

        if (!inviteDoc.exists) {
            return res.status(404).json({ error: 'Invalid invite code.' });
        }

        const invite = inviteDoc.data();

        if (invite.used) {
            return res.status(400).json({ error: 'This invite code has already been used.' });
        }

        if (new Date(invite.expiresAt) < new Date()) {
            return res.status(400).json({ error: 'This invite code has expired.' });
        }

        if (invite.email !== mentorEmail) {
            return res.status(400).json({ error: 'This invite code is not associated with your email address.' });
        }

        // ── 2. Create Firebase Auth user (server-side via Admin SDK) ──
        let userRecord;
        try {
            userRecord = await admin.auth().createUser({
                email: mentorEmail,
                password: password,
                displayName: mentorName,
            });
        } catch (authErr) {
            if (authErr.code === 'auth/email-already-exists') {
                return res.status(409).json({ error: 'An account with this email already exists.' });
            }
            throw authErr;
        }

        // ── 3. Create Firestore user document ──
        const userData = {
            uid: userRecord.uid,
            email: mentorEmail,
            name: mentorName,
            role: 'mentor',
            skills: [],
            profileCompleted: false,
            registeredViaInvite: true,
            inviteCode: trimmedCode,
            createdAt: new Date().toISOString(),
        };

        await db.collection('users').doc(userRecord.uid).set(userData);

        // ── 4. Mark invite as used ──
        await inviteRef.update({
            used: true,
            usedAt: new Date().toISOString(),
            usedBy: userRecord.uid,
        });

        // ── 5. Generate custom token for auto-login ──
        const customToken = await admin.auth().createCustomToken(userRecord.uid);

        // ── 6. Send welcome email (non-blocking) ──
        try {
            await sendWelcomeEmail({ userEmail: mentorEmail, userName: mentorName, role: 'mentor' });
        } catch (emailErr) {
            console.error('[MentorReg] Non-fatal: welcome email failed:', emailErr.message);
        }

        console.log(`[MentorReg] ✅ Mentor registered | uid=${userRecord.uid} | email=${mentorEmail} | code=${trimmedCode}`);

        res.status(201).json({
            success: true,
            message: 'Mentor account created successfully.',
            customToken,
            user: userData,
        });
    } catch (error) {
        console.error('[MentorReg] Failed to register mentor:', error.message);
        res.status(500).json({ error: 'Failed to create mentor account. Please try again.' });
    }
});

// GET /api/users?role=student — Fetch users by role (requires auth for self-exclusion)
router.get('/', verifyToken, userController.getUsersByRole);

// Protected routes requiring authentication middleware
router.post('/profile', verifyToken, userController.createUserProfile);
router.get('/profile/:uid', verifyToken, userController.getUserProfile);
router.patch('/profile', verifyToken, userController.updateUserProfile);
router.put('/availability', verifyToken, userController.updateAvailability);

// PUT /api/users/heartbeat — Update user's online status
router.put('/heartbeat', verifyToken, async (req, res) => {
    try {
        const uid = req.user.uid;
        await db.collection('users').doc(uid).update({
            last_seen: new Date().toISOString()
        });
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update heartbeat' });
    }
});


// POST /api/users/welcome-email — Send welcome email after signup
router.post('/welcome-email', verifyToken, async (req, res) => {
    try {
        const { name, role } = req.body;
        const userEmail = req.user?.email || req.body.email || '';

        console.log('[Email] Welcome email endpoint hit:', {
            userEmail,
            name,
            role,
            reqUserEmail: req.user?.email,
            bodyEmail: req.body.email
        });

        if (!userEmail) {
            console.warn('[Email] No email available — cannot send welcome email');
            return res.status(400).json({ success: false, error: 'No email available' });
        }

        const welcomeEmailSent = await sendWelcomeEmail({
            userEmail,
            userName: name || userEmail.split('@')[0],
            role: role || 'student'
        });

        console.log(`[Email] Welcome email result for ${userEmail}: ${welcomeEmailSent}`);

        res.status(200).json({
            success: true,
            welcomeEmailSent
        });
    } catch (error) {
        console.error('[Email] Error in welcome-email endpoint:', error.message);
        res.status(200).json({ success: true, welcomeEmailSent: false });
    }
});

// GET /api/users/:id — Fetch user by ID (used by ProjectRoom for member names)
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const userDoc = await db.collection('users').doc(req.params.id).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }
        const data = userDoc.data();
        res.status(200).json({
            user: {
                id: userDoc.id,
                name: data.name || data.email?.split('@')[0] || 'Unknown',
                email: data.email || '',
                role: data.role || 'student',
                profilePicture: data.profilePicture || null,
                skills: data.skills || [],
                college: data.college || ''
            }
        });
    } catch (error) {
        console.error('[Users] Failed to fetch user by ID:', error.message);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

module.exports = router;
