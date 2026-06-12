const express = require('express');
const router = express.Router();
const { db, verifyToken } = require('../middleware/auth');

// ═══════════ FEEDBACK ═══════════

// GET /api/projects/:id/feedback
router.get('/:id/feedback', verifyToken, async (req, res) => {
    const projectId = req.params.id;
    console.log(`[Feedback] Fetching feedback for project ${projectId}`);
    try {
        const snapshot = await db.collection('project_feedback')
            .where('projectId', '==', projectId).get();
        const feedback = [];
        snapshot.forEach(doc => { feedback.push({ id: doc.id, ...doc.data() }); });
        feedback.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        console.log(`[Feedback] Found ${feedback.length} feedback items for project ${projectId}`);
        res.status(200).json({ feedback });
    } catch (error) {
        console.error('[Firestore] Failed to fetch feedback', { collection: 'project_feedback', projectId, error: error.message });
        res.status(200).json({ feedback: [] });
    }
});

// POST /api/projects/:id/feedback
router.post('/:id/feedback', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { text, type } = req.body;
        const userId = req.user.uid;
        if (!text?.trim()) return res.status(400).json({ error: 'Feedback text is required' });

        let userName = 'Mentor';
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists) userName = userDoc.data().name || userName;
        } catch (e) { }

        const feedbackData = {
            projectId: id, userId, userName,
            text: text.trim(),
            type: type || 'general',
            createdAt: new Date().toISOString()
        };
        const docRef = await db.collection('project_feedback').add(feedbackData);
        console.log(`[Feedback] Created feedback ${docRef.id} for project ${id}`);
        res.status(201).json({ id: docRef.id, ...feedbackData });
    } catch (error) {
        console.error('[Firestore] Failed to post feedback', { collection: 'project_feedback', projectId: req.params.id, error: error.message });
        res.status(500).json({ error: 'Failed to post feedback' });
    }
});

// ═══════════ MENTOR REVIEWS ═══════════

// GET /api/projects/:id/reviews
router.get('/:id/reviews', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const snapshot = await db.collection('project_reviews')
            .where('projectId', '==', id).get();
        const reviews = [];
        snapshot.forEach(doc => { reviews.push({ id: doc.id, ...doc.data() }); });
        reviews.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        console.log(`[Reviews] Found ${reviews.length} reviews for project ${id}`);
        res.status(200).json({ reviews });
    } catch (error) {
        console.error('[Firestore] Failed to fetch reviews', { collection: 'project_reviews', projectId: req.params.id, error: error.message });
        res.status(200).json({ reviews: [] });
    }
});

// POST /api/projects/:id/reviews
router.post('/:id/reviews', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { comment, healthStatus } = req.body;
        const userId = req.user.uid;
        if (!comment?.trim()) return res.status(400).json({ error: 'Review comment is required' });

        let userName = 'Mentor';
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists) userName = userDoc.data().name || userName;
        } catch (e) { }

        const reviewData = {
            projectId: id, userId, userName,
            comment: comment.trim(),
            healthStatus: healthStatus || 'Good',
            createdAt: new Date().toISOString()
        };
        const docRef = await db.collection('project_reviews').add(reviewData);
        console.log(`[Reviews] Created review ${docRef.id} for project ${id}`);
        res.status(201).json({ id: docRef.id, ...reviewData });
    } catch (error) {
        console.error('[Firestore] Failed to post review', { collection: 'project_reviews', projectId: req.params.id, error: error.message });
        res.status(500).json({ error: 'Failed to post review' });
    }
});

// ═══════════ RISK FLAGS ═══════════

// GET /api/projects/:id/risks
router.get('/:id/risks', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const snapshot = await db.collection('project_risks')
            .where('projectId', '==', id).get();
        const risks = [];
        snapshot.forEach(doc => { risks.push({ id: doc.id, ...doc.data() }); });
        risks.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        console.log(`[Risks] Found ${risks.length} risks for project ${id}`);
        res.status(200).json({ risks });
    } catch (error) {
        console.error('[Firestore] Failed to fetch risks', { collection: 'project_risks', projectId: req.params.id, error: error.message });
        res.status(200).json({ risks: [] });
    }
});

// POST /api/projects/:id/risks
router.post('/:id/risks', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { label, severity } = req.body;
        const userId = req.user.uid;
        if (!label?.trim()) return res.status(400).json({ error: 'Risk label is required' });

        let userName = 'Mentor';
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists) userName = userDoc.data().name || userName;
        } catch (e) { }

        const riskData = {
            projectId: id, userId, userName,
            label: label.trim(),
            severity: severity || 'medium', // low, medium, high, critical
            createdAt: new Date().toISOString()
        };
        const docRef = await db.collection('project_risks').add(riskData);
        console.log(`[Risks] Created risk ${docRef.id} for project ${id}`);
        res.status(201).json({ id: docRef.id, ...riskData });
    } catch (error) {
        console.error('[Firestore] Failed to post risk', { collection: 'project_risks', projectId: req.params.id, error: error.message });
        res.status(500).json({ error: 'Failed to post risk' });
    }
});

// DELETE /api/projects/:id/risks/:riskId
router.delete('/:id/risks/:riskId', verifyToken, async (req, res) => {
    try {
        await db.collection('project_risks').doc(req.params.riskId).delete();
        res.status(200).json({ message: 'Risk removed' });
    } catch (error) {
        console.error('[Firestore] Failed to delete risk', { collection: 'project_risks', riskId: req.params.riskId, error: error.message });
        res.status(500).json({ error: 'Failed to remove risk' });
    }
});

// ═══════════ ACTIVITY TIMELINE ═══════════

// GET /api/projects/:id/activity
router.get('/:id/activity', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const events = [];

        // Gather from project_discussions
        const msgSnap = await db.collection('project_discussions')
            .where('projectId', '==', id).get();
        msgSnap.forEach(doc => {
            const d = doc.data();
            events.push({
                id: doc.id, type: 'message',
                text: `${d.userName || 'Student'} sent a message`,
                time: d.createdAt, userId: d.userId
            });
        });

        // Gather from project_feedback
        const fbSnap = await db.collection('project_feedback')
            .where('projectId', '==', id).get();
        fbSnap.forEach(doc => {
            const d = doc.data();
            events.push({
                id: doc.id, type: 'feedback',
                text: `${d.userName || 'Mentor'} left ${d.type} feedback`,
                time: d.createdAt, userId: d.userId
            });
        });

        // Gather from project_reviews
        const rvSnap = await db.collection('project_reviews')
            .where('projectId', '==', id).get();
        rvSnap.forEach(doc => {
            const d = doc.data();
            events.push({
                id: doc.id, type: 'review',
                text: `${d.userName || 'Mentor'} submitted a project review (${d.healthStatus})`,
                time: d.createdAt, userId: d.userId
            });
        });

        // Sort newest first, cap at 20
        events.sort((a, b) => (b.time || '').localeCompare(a.time || ''));

        console.log(`[Activity] Aggregated ${events.length} events for project ${id}`);
        res.status(200).json({ events: events.slice(0, 20) });
    } catch (error) {
        console.error('[Firestore] Failed to fetch activity', { projectId: req.params.id, error: error.message });
        res.status(200).json({ events: [] });
    }
});

module.exports = router;
