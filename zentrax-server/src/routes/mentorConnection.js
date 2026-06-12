const express = require('express');
const router = express.Router();
const controller = require('../controllers/mentorRequestController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.post('/request', verifyToken, requireRole('student'), controller.sendRequest);
router.get('/requests', verifyToken, controller.getRequests);
router.put('/request/:requestId', verifyToken, requireRole('mentor'), controller.updateRequestStatus);

module.exports = router;
