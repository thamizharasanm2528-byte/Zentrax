const express = require('express');
const router = express.Router();
const { db, verifyToken, requireRole } = require('../middleware/auth');

/**
 * GET /api/mentor/analytics
 * Aggregates performance data for the logged-in mentor.
 */
router.get('/analytics', verifyToken, requireRole('mentor'), async (req, res) => {
    try {
        const mentorId = req.user.uid;
        console.log(`[Mentor Analytics] Generating report for mentor ${mentorId}`);

        // 1. Fetch assigned projects (teams)
        const projSnap = await db.collection('projects').get();
        const projects = [];
        const studentIds = new Set();

        projSnap.forEach(doc => {
            const d = doc.data();
            const isMentor = d.mentorId === mentorId || d.members?.includes(mentorId);
            
            if (isMentor) {
                projects.push({ id: doc.id, ...d });
                // Count unique students (members who are not the mentor)
                (d.members || []).forEach(m => {
                    if (m !== mentorId) studentIds.add(m);
                });
            }
        });

        // 2. Count feedback given by this mentor
        const feedbackSnap = await db.collection('project_feedback')
            .where('userId', '==', mentorId)
            .get();
        const feedbackCount = feedbackSnap.size;

        // 3. Count reviews given by this mentor
        const reviewSnap = await db.collection('project_reviews')
            .where('userId', '==', mentorId)
            .get();
        const reviewCount = reviewSnap.size;

        // 4. Mock Average Response Time (for now)
        // In a real system, you'd calculate this from doubt response timestamps
        const avgResponseTime = "< 1 hour";

        res.status(200).json({
            success: true,
            data: {
                projects,
                feedbackGiven: feedbackCount + reviewCount,
                studentCount: studentIds.size,
                avgResponseTime
            }
        });
    } catch (error) {
        console.error('[Mentor Analytics] Failed to load data', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load mentor analytics data'
        });
    }
});

module.exports = router;
