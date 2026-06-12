const express = require('express');
const router = express.Router();
const { db, verifyToken } = require('../middleware/auth');
const emailService = require('../services/emailService');

// POST /api/team-invite/send or POST /api/team-invite — Send a team invite
const sendInvite = async (req, res) => {
    try {
        const { projectId } = req.body;
        const receiverId = req.body.receiverId || req.body.inviteeId;
        const senderId = req.user.uid;

        if (!projectId || !receiverId) {
            return res.status(400).json({ error: 'projectId and receiverId (or inviteeId) are required' });
        }

        // Check if invite already exists
        console.log(`[Team Invites] Checking duplicate invite: project=${projectId}, sender=${senderId}, receiver=${receiverId}`);
        const existing = await db.collection('team_invites')
            .where('senderId', '==', senderId)
            .get();

        const isDuplicate = existing.docs.some(doc => {
            const d = doc.data();
            return d.projectId === projectId && d.receiverId === receiverId && d.status === 'pending';
        });

        if (isDuplicate) {
            return res.status(400).json({ error: 'Invite already sent' });
        }

        // Get sender name and project title for notifications and storing in invite doc
        let senderName = 'A teammate';
        let projectTitle = 'a project';
        try {
            const [senderDoc, projDoc] = await Promise.all([
                db.collection('users').doc(senderId).get(),
                db.collection('projects').doc(projectId).get()
            ]);
            if (senderDoc.exists) senderName = senderDoc.data().name || senderName;
            if (projDoc.exists) projectTitle = projDoc.data().title || projectTitle;
        } catch (e) {}

        const invite = {
            projectId,
            senderId,
            receiverId,
            senderName,
            inviterName: senderName,
            projectTitle,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        const docRef = await db.collection('team_invites').add(invite);
        console.log(`[Team Invites] Created invite ${docRef.id}`);

        // Also create a notification for the receiver
        await db.collection('notifications').add({
            userId: receiverId,
            type: 'invite',
            title: 'Team Invite',
            message: `${senderName} has invited you to join "${projectTitle}".`,
            read: false,
            time: new Date().toISOString(),
            metadata: { inviteId: docRef.id, projectId }
        });

        // Email notification to invited user
        try {
            const receiverDoc = await db.collection('users').doc(receiverId).get();
            if (receiverDoc.exists) {
                const receiverData = receiverDoc.data();
                await emailService.sendNotificationEmail({
                    recipientEmail: receiverData.email,
                    recipientName: receiverData.name || 'Student',
                    subject: `Team Collaboration Invitation — ${projectTitle}`,
                    title: 'Team Collaboration Invitation',
                    message: `You have received a team collaboration invitation from <strong>${senderName}</strong> for the project "<strong>${projectTitle}</strong>". Please review the invitation details and respond at your earliest convenience.`,
                    ctaLabel: 'Review Invitation',
                    ctaLink: 'http://localhost:5173/dashboard'
                });
            }
        } catch (emailErr) {
            console.error('[Email Error] Failed to send team invite email:', emailErr.message);
        }

        res.status(201).json({ id: docRef.id, ...invite });
    } catch (error) {
        console.error('[Firestore] Failed to send team invite', {
            collection: 'team_invites',
            uid: req.user?.uid,
            error: error.message
        });
        res.status(500).json({ error: 'Failed to send invite' });
    }
};

router.post('/', verifyToken, sendInvite);
router.post('/send', verifyToken, sendInvite);

// PUT /api/team-invite/respond — Accept or reject an invite
router.put('/respond', verifyToken, async (req, res) => {
    try {
        const { inviteId, action } = req.body; // action: 'accepted' | 'rejected'
        const userId = req.user.uid;

        if (!inviteId || !['accepted', 'rejected'].includes(action)) {
            return res.status(400).json({ error: 'inviteId and valid action (accepted/rejected) required' });
        }

        const inviteRef = db.collection('team_invites').doc(inviteId);
        const inviteDoc = await inviteRef.get();

        if (!inviteDoc.exists) {
            return res.status(404).json({ error: 'Invite not found' });
        }

        const invite = inviteDoc.data();
        if (invite.receiverId !== userId) {
            return res.status(403).json({ error: 'Not your invite' });
        }

        await inviteRef.update({ status: action });

        // Get sender name and project title
        let receiverName = 'A user';
        let projectTitle = 'your project';
        try {
            const [userDoc, projDoc] = await Promise.all([
                db.collection('users').doc(userId).get(),
                db.collection('projects').doc(invite.projectId).get()
            ]);
            if (userDoc.exists) receiverName = userDoc.data().name || receiverName;
            if (projDoc.exists) projectTitle = projDoc.data().title || projectTitle;
        } catch (e) {}

        // Notify the sender (In-app + Email)
        await db.collection('notifications').add({
            userId: invite.senderId,
            type: 'team',
            title: action === 'accepted' ? 'Invite Accepted! 🎉' : 'Invite Declined',
            message: `${receiverName} has ${action} your invite to join "${projectTitle}".`,
            read: false,
            time: new Date().toISOString(),
            metadata: { inviteId, projectId: invite.projectId, userId }
        }).catch(() => {});

        // Trigger Email Notification
        try {
            const ownerDoc = await db.collection('users').doc(invite.senderId).get();
            if (ownerDoc.exists) {
                const ownerData = ownerDoc.data();
                if (action === 'accepted') {
                    await emailService.sendNotificationEmail({
                        recipientEmail: ownerData.email,
                        recipientName: ownerData.name || 'Project Owner',
                        subject: `Invitation Accepted — ${projectTitle}`,
                        title: 'Invitation Accepted — New Team Member',
                        message: `We are pleased to inform you that <strong>${receiverName}</strong> has accepted your invitation to collaborate on "<strong>${projectTitle}</strong>". The new member has been added to the project team and can now access the workspace.`,
                        ctaLabel: 'View Project Team',
                        ctaLink: `http://localhost:5173/project/${invite.projectId}`
                    });
                } else {
                    await emailService.sendNotificationEmail({
                        recipientEmail: ownerData.email,
                        recipientName: ownerData.name || 'Project Owner',
                        subject: `Invitation Declined — ${projectTitle}`,
                        title: 'Invitation Declined',
                        message: `We would like to inform you that <strong>${receiverName}</strong> has declined your invitation to join "<strong>${projectTitle}</strong>". You may consider reaching out to other potential team members through the AI Team Matching feature.`,
                        ctaLabel: 'Find Team Members',
                        ctaLink: `http://localhost:5173/projects/create`
                    });
                }
            }
        } catch (emailErr) {
            console.error('[Email Error] Failed to send invite response email:', emailErr.message);
        }

        // If accepted, add user to project members and log activity
        if (action === 'accepted') {
            const { FieldValue } = require('firebase-admin/firestore');
            const projDoc = await db.collection('projects').doc(invite.projectId).get();
            const projData = projDoc.exists ? projDoc.data() : {};

            // Check if team is full (count only students, not mentors)
            let inviteeRole = 'student';
            try {
                const iDoc = await db.collection('users').doc(userId).get();
                if (iDoc.exists) inviteeRole = (iDoc.data().role || 'student').toLowerCase();
            } catch (e) {}

            if (inviteeRole !== 'mentor') {
                let studentCount = 0;
                for (const mid of (projData.members || [])) {
                    try {
                        const mDoc = await db.collection('users').doc(mid).get();
                        if (!mDoc.exists || (mDoc.data().role || 'student').toLowerCase() !== 'mentor') {
                            studentCount++;
                        }
                    } catch (e) { studentCount++; }
                }
                const maxSize = projData.teamSize || 5;
                if (studentCount >= maxSize) {
                    await inviteRef.update({ status: 'rejected' });
                    return res.status(400).json({ error: 'Cannot accept — team already has enough students!' });
                }
            }

            // One-mentor-per-project enforcement
            try {
                const inviteeDoc = await db.collection('users').doc(userId).get();
                if (inviteeDoc.exists && (inviteeDoc.data().role || '').toLowerCase() === 'mentor') {
                    for (const mid of (projData.members || [])) {
                        try {
                            const mDoc = await db.collection('users').doc(mid).get();
                            if (mDoc.exists && (mDoc.data().role || '').toLowerCase() === 'mentor') {
                                await inviteRef.update({ status: 'rejected' });
                                return res.status(400).json({ error: 'This project already has a mentor. Only one mentor allowed per project.' });
                            }
                        } catch (e) {}
                    }
                }
            } catch (e) {}

            await db.collection('projects').doc(invite.projectId).update({
                members: FieldValue.arrayUnion(userId)
            });

            // Log activity
            const activityService = require('../services/activityService');
            await activityService.logActivity({
                projectId: invite.projectId,
                userId: userId,
                actionType: 'member_joined',
                message: `Joined the project team via invite.`
            });
        }

        console.log(`[Team Invites] Invite ${inviteId} ${action} by user ${userId}`);
        res.status(200).json({ message: `Invite ${action}` });
    } catch (error) {
        console.error('[Firestore] Failed to respond to team invite', {
            inviteId: req.body?.inviteId,
            uid: req.user?.uid,
            error: error.message
        });
        res.status(500).json({ error: 'Failed to respond to invite' });
    }
});

// GET /api/team-invite/pending — Get pending invites for current user
router.get('/pending', verifyToken, async (req, res) => {
    const uid = req.user.uid;
    console.log(`[Team Invites] Fetching pending invites for user ${uid}`);
    try {
        // Uses composite index: receiverId + status
        const snapshot = await db.collection('team_invites')
            .where('receiverId', '==', uid)
            .where('status', '==', 'pending')
            .get();

        const invites = [];
        snapshot.forEach(doc => { invites.push({ id: doc.id, ...doc.data() }); });
        invites.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        console.log(`[Team Invites] Found ${invites.length} pending invites for user ${uid}`);
        res.status(200).json({ invites });
    } catch (error) {
        console.error('[Firestore] Failed to fetch pending team invites', {
            collection: 'team_invites',
            uid,
            query: 'receiverId + status=pending',
            error: error.message
        });
        res.status(200).json({ invites: [] });
    }
});

module.exports = router;
