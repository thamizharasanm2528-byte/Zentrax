const express = require('express');
const router = express.Router();
const { db, verifyToken } = require('../middleware/auth');

// GET /api/notifications — fetch user notifications
router.get('/', verifyToken, async (req, res) => {
    const uid = req.user.uid;
    console.log(`[Notifications] Fetching notifications for user ${uid}`);
    try {
        const snapshot = await db.collection('notifications')
            .where('userId', '==', uid)
            .get();

        const notifications = [];
        snapshot.forEach(doc => {
            notifications.push({ id: doc.id, ...doc.data() });
        });

        // Sort by time descending in-memory
        notifications.sort((a, b) => (b.time || '').localeCompare(a.time || ''));

        console.log(`[Notifications] Found ${notifications.length} notifications for user ${uid}`);
        // Limit to 50
        res.status(200).json({ notifications: notifications.slice(0, 50) });
    } catch (error) {
        console.error('[Firestore] Failed to fetch notifications', {
            uid,
            collection: 'notifications',
            error: error.message
        });
        res.status(200).json({ notifications: [] });
    }
});

// PUT /api/notifications/:id/read — mark as read
router.put('/:id/read', verifyToken, async (req, res) => {
    try {
        await db.collection('notifications').doc(req.params.id).update({ read: true });
        res.status(200).json({ message: 'Marked as read' });
    } catch (error) {
        console.error('[Firestore] Failed to mark notification as read', {
            notificationId: req.params.id,
            error: error.message
        });
        res.status(500).json({ error: 'Failed to update notification' });
    }
});

module.exports = router;
