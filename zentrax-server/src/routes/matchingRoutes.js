const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const matchingController = require('../controllers/matchingController');

// POST /api/matching/team — AI team member matching
router.post('/team', verifyToken, matchingController.matchTeamMembers);

// POST /api/matching/mentor — AI mentor matching
router.post('/mentor', verifyToken, matchingController.matchMentors);

module.exports = router;
