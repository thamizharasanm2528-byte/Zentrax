const express = require('express');
const router = express.Router();
const { verifyToken, db } = require('../middleware/auth');

// POST /api/reports — any authenticated user can submit a report
router.post('/', verifyToken, async (req, res) => {
    try {
        const { target_type, target_id, reason, description } = req.body;

        if (!target_type || !reason) {
            return res.status(400).json({ success: false, error: 'target_type and reason are required' });
        }

        const report = {
            reported_by: req.user.uid,
            reporter_email: req.user.email || '',
            target_type,      // 'user' | 'project' | 'message' | 'other'
            target_id: target_id || null,
            reason,
            description: description || '',
            status: 'open',
            created_at: new Date().toISOString()
        };

        const docRef = await db.collection('reports').add(report);
        console.log(`[Reports] New report created: ${docRef.id} by ${req.user.email}`);

        res.status(201).json({ success: true, message: 'Report submitted successfully', reportId: docRef.id });
    } catch (error) {
        console.error('[Reports] Create error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to submit report' });
    }
});

module.exports = router;
