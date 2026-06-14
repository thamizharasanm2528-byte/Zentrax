const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { verifyToken, db } = require('../middleware/auth');
const { checkAdminAccess } = require('../middleware/adminAuth');
const { sendMentorInviteEmail } = require('../services/emailService');

const INVITES_COLLECTION = 'mentor_invites';
const INVITE_EXPIRY_HOURS = 72;

/**
 * Generate a cryptographically random 8-character invite code.
 * Format: uppercase alphanumeric for easy sharing (e.g. "A3F7K9M2")
 */
function generateInviteCode() {
    const bytes = crypto.randomBytes(5);
    return bytes.toString('base64url').substring(0, 8).toUpperCase();
}

// ════════════════════════════════════════════════════
//  ADMIN ROUTES (require auth + admin access)
// ════════════════════════════════════════════════════

// POST /api/admin/mentor-invites — Create a new mentor invite
router.post('/mentor-invites', verifyToken, checkAdminAccess, async (req, res) => {
    try {
        const { email, name } = req.body;

        if (!email || !name) {
            return res.status(400).json({ error: 'Mentor email and name are required.' });
        }

        const mentorEmail = email.toLowerCase().trim();
        const mentorName = name.trim();

        // Check if there's already an active (unused, non-expired) invite for this email
        const existingSnapshot = await db.collection(INVITES_COLLECTION)
            .where('email', '==', mentorEmail)
            .where('used', '==', false)
            .get();

        const now = new Date();
        const hasActive = existingSnapshot.docs.some(doc => {
            const data = doc.data();
            return new Date(data.expiresAt) > now;
        });

        if (hasActive) {
            return res.status(409).json({
                error: 'An active invite already exists for this email. Revoke it first or wait for it to expire.'
            });
        }

        // Generate unique code
        let code = generateInviteCode();
        // Ensure uniqueness (extremely unlikely collision, but check anyway)
        const codeCheck = await db.collection(INVITES_COLLECTION).doc(code).get();
        if (codeCheck.exists) {
            code = generateInviteCode(); // One retry
        }

        const expiresAt = new Date(now.getTime() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000);
        const inviteData = {
            code,
            email: mentorEmail,
            name: mentorName,
            used: false,
            usedAt: null,
            usedBy: null,
            createdAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
            createdBy: req.user.email || req.user.uid,
        };

        await db.collection(INVITES_COLLECTION).doc(code).set(inviteData);

        // Send email with invite code (non-blocking)
        sendMentorInviteEmail({ email: mentorEmail, name: mentorName, code })
            .catch(emailErr => console.error('[MentorInvite] Non-fatal: failed to send invite email:', emailErr.message));

        console.log(`[MentorInvite] ✅ Created invite | code=${code} | email=${mentorEmail} | by=${req.user.email}`);

        res.status(201).json({
            success: true,
            message: 'Mentor invite created successfully.',
            invite: inviteData,
        });
    } catch (error) {
        console.error('[MentorInvite] Failed to create invite:', error.message);
        res.status(500).json({ error: 'Failed to create mentor invite.' });
    }
});

// GET /api/admin/mentor-invites — List all invites
router.get('/mentor-invites', verifyToken, checkAdminAccess, async (req, res) => {
    try {
        const snapshot = await db.collection(INVITES_COLLECTION)
            .orderBy('createdAt', 'desc')
            .get();

        const now = new Date();
        const invites = snapshot.docs.map(doc => {
            const data = doc.data();
            let status = 'active';
            if (data.used) status = 'used';
            else if (new Date(data.expiresAt) < now) status = 'expired';

            return { ...data, status };
        });

        res.status(200).json({ success: true, invites });
    } catch (error) {
        console.error('[MentorInvite] Failed to list invites:', error.message);
        res.status(500).json({ error: 'Failed to fetch invites.' });
    }
});

// DELETE /api/admin/mentor-invites/:code — Revoke an invite
router.delete('/mentor-invites/:code', verifyToken, checkAdminAccess, async (req, res) => {
    try {
        const { code } = req.params;
        const docRef = db.collection(INVITES_COLLECTION).doc(code);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Invite not found.' });
        }

        if (doc.data().used) {
            return res.status(400).json({ error: 'Cannot revoke an already used invite.' });
        }

        await docRef.delete();
        console.log(`[MentorInvite] 🗑️ Revoked invite | code=${code} | by=${req.user.email}`);

        res.status(200).json({ success: true, message: 'Invite revoked.' });
    } catch (error) {
        console.error('[MentorInvite] Failed to revoke invite:', error.message);
        res.status(500).json({ error: 'Failed to revoke invite.' });
    }
});

// ════════════════════════════════════════════════════
//  PUBLIC ROUTE (no auth required — used during signup)
// ════════════════════════════════════════════════════

// POST /api/auth/validate-invite — Validate an invite code + email
router.post('/validate-invite', async (req, res) => {
    try {
        const { code, email } = req.body;

        if (!code) {
            return res.status(400).json({ error: 'Invite code is required.' });
        }

        const trimmedCode = code.trim().toUpperCase();
        const docRef = db.collection(INVITES_COLLECTION).doc(trimmedCode);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ valid: false, error: 'Invalid invite code.' });
        }

        const data = doc.data();

        if (data.used) {
            return res.status(400).json({ valid: false, error: 'This invite code has already been used.' });
        }

        if (new Date(data.expiresAt) < new Date()) {
            return res.status(400).json({ valid: false, error: 'This invite code has expired.' });
        }

        // If email is provided, verify it matches
        if (email && email.toLowerCase().trim() !== data.email) {
            return res.status(400).json({ valid: false, error: 'This invite code is not associated with your email.' });
        }

        res.status(200).json({
            valid: true,
            name: data.name,
            email: data.email,
        });
    } catch (error) {
        console.error('[MentorInvite] Failed to validate invite:', error.message);
        res.status(500).json({ error: 'Failed to validate invite.' });
    }
});

module.exports = router;
