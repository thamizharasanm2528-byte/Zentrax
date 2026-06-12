const express = require('express');
const router = express.Router();
const controller = require('../controllers/progressController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.post('/submit', verifyToken, requireRole('student'), controller.submitProgress);
router.get('/:studentId', verifyToken, controller.getStudentProgress);

module.exports = router;
