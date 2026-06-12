const express = require('express');
const router = express.Router();
const mentorshipController = require('../controllers/mentorshipController');
const { verifyToken, requireRole, db } = require('../middleware/auth');
const { doubtLimiter } = require('../middleware/rateLimiters');

router.post('/', verifyToken, requireRole('student'), doubtLimiter, mentorshipController.submitDoubt);
router.get('/', verifyToken, mentorshipController.getDoubts);
router.get('/my-doubts', verifyToken, requireRole('student'), mentorshipController.getStudentDoubts);
router.put('/:id/status', verifyToken, requireRole('mentor'), mentorshipController.updateDoubtStatus);

// GET /api/mentorship/assigned — Get projects where mentor has claimed doubts
router.get('/assigned', verifyToken, requireRole('mentor'), async (req, res) => {
    try {
        const mentorId = req.user.uid;

        // Find all doubts where this mentor is assigned
        const doubtSnap = await db.collection('doubts')
            .where('mentorId', '==', mentorId)
            .get();

        // Collect unique project IDs from the student doubts
        // Since doubts don't store projectId directly, we'll fetch projects
        // where the mentor is in the members list OR just return all projects for now
        const projectSnap = await db.collection('projects').get();
        const teams = [];
        projectSnap.forEach(doc => {
            const data = doc.data();
            // Include projects where mentor is a member, or that have associated doubts
            if (data.members?.includes(mentorId) || data.mentorId === mentorId) {
                teams.push({ id: doc.id, ...data });
            }
        });

        // Sort by most recent first
        teams.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

        res.status(200).json({ success: true, data: { teams } });
    } catch (error) {
        console.error('Error fetching assigned teams:', error);
        res.status(200).json({ success: false, data: { teams: [] } });
    }
});

module.exports = router;
