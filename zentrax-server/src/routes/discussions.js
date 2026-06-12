const express = require('express');
const router = express.Router();
const { db, verifyToken } = require('../middleware/auth');
const { messageLimiter } = require('../middleware/rateLimiters');

// GET /api/projects/:id/discussions — Get messages
router.get('/:id/discussions', verifyToken, async (req, res) => {
    const projectId = req.params.id;
    console.log(`[Discussions] Fetching messages for project ${projectId}`);
    try {

        const snapshot = await db.collection('project_discussions')
            .where('projectId', '==', projectId)
            .get();

        const messages = [];
        snapshot.forEach(doc => { messages.push({ id: doc.id, ...doc.data() }); });

        // Sort in-memory
        messages.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));

        console.log(`[Discussions] Found ${messages.length} messages for project ${projectId}`);
        res.status(200).json({ messages });
    } catch (error) {
        console.error('[Firestore] Failed to fetch discussions', { collection: 'project_discussions', projectId, error: error.message });
        res.status(200).json({ messages: [] });
    }
});

// POST /api/projects/:id/discussions — Send a message (rate limited)
router.post('/:id/discussions', verifyToken, messageLimiter, async (req, res) => {
    try {
        const projectId = req.params.id;
        const { text } = req.body;
        const userId = req.user.uid;
        const userEmail = req.user.email || '';

        if (!text || !text.trim()) {
            return res.status(400).json({ error: 'Message text is required' });
        }

        // Fetch actual user name from Firestore
        let userName = userEmail.split('@')[0];
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists && userDoc.data().name) {
                userName = userDoc.data().name;
            }
        } catch (e) {}

        const message = {
            projectId,
            userId,
            userName,
            text: text.trim(),
            createdAt: new Date().toISOString()
        };

        const docRef = await db.collection('project_discussions').add(message);

        console.log(`[Discussions] Message sent by ${userId} in project ${projectId}`);
        res.status(201).json({ id: docRef.id, ...message });
    } catch (error) {
        console.error('[Firestore] Failed to post discussion message', { collection: 'project_discussions', projectId: req.params.id, error: error.message });
        res.status(500).json({ error: 'Failed to post message' });
    }
});

module.exports = router;
