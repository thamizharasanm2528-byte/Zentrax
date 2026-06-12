const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.get('/', projectController.getProjects);
router.get('/user', verifyToken, projectController.getUserProjects);
router.post('/', verifyToken, requireRole('student'), projectController.createProject);
router.put('/:id', verifyToken, projectController.updateProject);
router.put('/:id/status', verifyToken, projectController.updateProjectStatus);
router.put('/:id/task-status', verifyToken, projectController.updateOwnTaskStatus);
router.put('/:id/remove-member', verifyToken, projectController.removeMember);
router.get('/:id/activity', verifyToken, async (req, res) => {
    const activityService = require('../services/activityService');
    const activities = await activityService.getProjectActivity(req.params.id);
    res.status(200).json({ activities });
});

router.get('/:id', verifyToken, projectController.getProjectById);
router.delete('/:id', verifyToken, projectController.deleteProject);

module.exports = router;
