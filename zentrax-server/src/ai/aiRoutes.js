const express = require('express');
const router = express.Router();
const aiController = require('./aiController');
const oldAiController = require('../controllers/aiController');
const { verifyToken, requireRole } = require('../middleware/auth');
const { aiChatLimiter } = require('../middleware/rateLimiters');

// All AI routes are protected by Firebase Auth
// Rate limiter applied ONLY to write/generation endpoints

// Chat — rate limited
router.post('/chat', verifyToken, aiChatLimiter, aiController.chat);
router.post('/regenerate', verifyToken, aiChatLimiter, aiController.regenerate);

// Conversations CRUD — reads are NOT rate limited
router.post('/new-chat', verifyToken, aiController.createChat);
router.get('/conversations', verifyToken, aiController.getConversations);
router.get('/conversations/:id/messages', verifyToken, aiController.getMessages);
router.put('/conversations/:id', verifyToken, aiController.renameChat);
router.delete('/conversations/:id', verifyToken, aiController.deleteChat);

// User Preferences
router.get('/preferences', verifyToken, aiController.getPreferences);
router.post('/preferences', verifyToken, aiController.updatePreferences);

// Mistake Memory
router.get('/memories', verifyToken, aiController.getMemories);
router.delete('/memories/:id', verifyToken, aiController.deleteMemory);

// Legacy
router.post('/feedback', verifyToken, aiController.submitFeedback);
router.post('/knowledge', verifyToken, requireRole('mentor'), aiController.addKnowledge);
router.post('/ask', verifyToken, aiChatLimiter, oldAiController.askAi);

module.exports = router;

