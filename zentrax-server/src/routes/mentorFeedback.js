const express = require('express');
const router = express.Router();
const controller = require('../controllers/feedbackController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.post('/give', verifyToken, requireRole('mentor'), controller.giveFeedback);
router.get('/', verifyToken, controller.getStudentFeedback);
router.put('/task/:feedbackId', verifyToken, requireRole('student'), controller.markTaskDone);

module.exports = router;
