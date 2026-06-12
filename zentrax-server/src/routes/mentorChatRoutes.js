const express = require('express');
const router = express.Router();
const { db, verifyToken } = require('../middleware/auth');

// POST /api/mentor-chat/send — Send a message
router.post('/send', verifyToken, async (req, res) => {
    try {
        const { receiverId, text, projectId } = req.body;
        const senderId = req.user.uid;

        if (!receiverId || !text?.trim()) {
            return res.status(400).json({ error: 'receiverId and text are required' });
        }

        const message = {
            senderId,
            receiverId,
            text: text.trim(),
            projectId: projectId || null,
            createdAt: new Date().toISOString(),
            read: false
        };

        const docRef = await db.collection('mentor_messages').add(message);

        // Create notification for receiver
        await db.collection('notifications').add({
            userId: receiverId,
            type: 'mentor_message',
            title: 'New Message',
            message: `New message from your ${req.user.role === 'mentor' ? 'mentor' : 'student'}`,
            read: false,
            time: new Date().toISOString()
        }).catch(() => {});

        res.status(201).json({ id: docRef.id, ...message });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// GET /api/mentor-chat/messages/:partnerId — Get messages with a specific user
router.get('/messages/:partnerId', verifyToken, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { partnerId } = req.params;

        // Get messages where user is sender or receiver with partner
        const sentSnap = await db.collection('mentor_messages')
            .where('senderId', '==', userId)
            .where('receiverId', '==', partnerId)
            .get();

        const recvSnap = await db.collection('mentor_messages')
            .where('senderId', '==', partnerId)
            .where('receiverId', '==', userId)
            .get();

        const messages = [];
        sentSnap.forEach(doc => messages.push({ id: doc.id, ...doc.data() }));
        recvSnap.forEach(doc => messages.push({ id: doc.id, ...doc.data() }));

        messages.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));

        // Mark received messages as read
        const unread = [];
        recvSnap.forEach(doc => {
            if (!doc.data().read) unread.push(doc.ref);
        });
        const batch = db.batch();
        unread.forEach(ref => batch.update(ref, { read: true }));
        if (unread.length > 0) await batch.commit();

        res.status(200).json({ messages });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(200).json({ messages: [] });
    }
});

// GET /api/mentor-chat/conversations — List active conversations
router.get('/conversations', verifyToken, async (req, res) => {
    try {
        const userId = req.user.uid;

        const sentSnap = await db.collection('mentor_messages')
            .where('senderId', '==', userId).get();
        const recvSnap = await db.collection('mentor_messages')
            .where('receiverId', '==', userId).get();

        // Collect unique partners
        const partnerMap = {};
        const addMsg = (doc) => {
            const d = doc.data();
            const partnerId = d.senderId === userId ? d.receiverId : d.senderId;
            if (!partnerMap[partnerId] || d.createdAt > partnerMap[partnerId].lastMessageAt) {
                partnerMap[partnerId] = {
                    partnerId,
                    lastMessage: d.text,
                    lastMessageAt: d.createdAt,
                    unread: 0
                };
            }
            if (d.receiverId === userId && !d.read) {
                partnerMap[partnerId].unread = (partnerMap[partnerId].unread || 0) + 1;
            }
        };
        sentSnap.forEach(addMsg);
        recvSnap.forEach(addMsg);

        // Fetch partner names
        const conversations = [];
        for (const [pid, conv] of Object.entries(partnerMap)) {
            try {
                const userDoc = await db.collection('users').doc(pid).get();
                conv.partnerName = userDoc.exists ? userDoc.data().name : 'Unknown';
            } catch { conv.partnerName = 'Unknown'; }
            conversations.push(conv);
        }

        conversations.sort((a, b) => (b.lastMessageAt || '').localeCompare(a.lastMessageAt || ''));
        res.status(200).json({ conversations });
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(200).json({ conversations: [] });
    }
});

module.exports = router;
