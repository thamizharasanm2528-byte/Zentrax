const express = require('express');
const router = express.Router();
const controller = require('../controllers/chatController');
const { verifyToken } = require('../middleware/auth');

router.get('/conversations', verifyToken, controller.getConversations);
router.get('/messages/:chatId', verifyToken, controller.getMessages);
router.post('/send', verifyToken, controller.sendMessage);

module.exports = router;
