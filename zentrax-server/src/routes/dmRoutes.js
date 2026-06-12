const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const admin = require('firebase-admin');
const db = admin.firestore();

/**
 * Direct Messaging Routes
 * 
 * Collection: `directMessages`
 * Document structure: {
 *   participants: [uid1, uid2],
 *   lastMessage: { text, senderId, createdAt },
 *   updatedAt: timestamp,
 *   createdAt: timestamp
 * }
 * 
 * Sub-collection: `directMessages/{conversationId}/messages`
 * Message structure: {
 *   text, senderId, senderName, createdAt
 * }
 */

// GET /api/dm/conversations — List all conversations for current user
router.get('/conversations', verifyToken, async (req, res) => {
    try {
        const userId = req.user.uid;
        // Use a simple query to avoid composite index requirements
        const snapshot = await db.collection('directMessages')
            .where('participants', 'array-contains', userId)
            .limit(100)
            .get();

        const conversations = [];
        for (const doc of snapshot.docs) {
            const data = doc.data();
            
            // Safeguard: Ensure participants array exists
            if (!data.participants || !Array.isArray(data.participants)) continue;
            
            const otherId = data.participants.find(p => p !== userId);
            if (!otherId) continue;

            // Get other user's info
            let otherUser = { name: 'Unknown', role: 'student' };
            try {
                const userDoc = await db.collection('users').doc(otherId).get();
                if (userDoc.exists) {
                    const u = userDoc.data();
                    otherUser = { name: u.name || u.email || 'Unknown', role: u.role || 'student', profilePicture: u.profilePicture || null };
                }
            } catch (e) {}

            // Filter out mentors from 'Peers' list
            if (otherUser.role === 'mentor') continue;

            // Get unread count
            let unreadCount = 0;
            try {
                const unreadSnap = await db.collection('directMessages').doc(doc.id)
                    .collection('messages')
                    .where('senderId', '!=', userId)
                    .where('read', '==', false)
                    .get();
                unreadCount = unreadSnap.size;
            } catch (e) {
                // If composite index doesn't exist, skip unread count
            }

            conversations.push({
                id: doc.id,
                otherUserId: otherId,
                otherUser,
                lastMessage: data.lastMessage || null,
                updatedAt: data.updatedAt?.toDate?.() || null,
                unreadCount
            });
        }

        // Sort manually by updatedAt desc
        conversations.sort((a, b) => {
            const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
            const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
            return timeB - timeA;
        });

        res.json({ conversations });
    } catch (err) {
        console.error('[DM] Error fetching conversations:', err);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

// GET /api/dm/:conversationId/messages — Get messages in a conversation
router.get('/:conversationId/messages', verifyToken, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { conversationId } = req.params;

        // Verify user is a participant
        const convDoc = await db.collection('directMessages').doc(conversationId).get();
        if (!convDoc.exists) return res.status(404).json({ error: 'Conversation not found' });
        if (!convDoc.data().participants.includes(userId)) return res.status(403).json({ error: 'Access denied' });

        const snapshot = await db.collection('directMessages').doc(conversationId)
            .collection('messages')
            .orderBy('createdAt', 'asc')
            .limit(100)
            .get();

        const messages = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data(),
            createdAt: d.data().createdAt?.toDate?.() || null
        }));

        // Mark messages as read
        const batch = db.batch();
        snapshot.docs.forEach(d => {
            if (d.data().senderId !== userId && !d.data().read) {
                batch.update(d.ref, { read: true });
            }
        });
        await batch.commit();

        res.json({ messages });
    } catch (err) {
        console.error('[DM] Error fetching messages:', err);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// POST /api/dm/send — Send a direct message
router.post('/send', verifyToken, async (req, res) => {
    try {
        const senderId = req.user.uid;
        const { recipientId, text } = req.body;

        if (!recipientId || !text?.trim()) {
            return res.status(400).json({ error: 'recipientId and text are required' });
        }

        // Get sender info
        let senderName = 'User';
        try {
            const senderDoc = await db.collection('users').doc(senderId).get();
            if (senderDoc.exists) senderName = senderDoc.data().name || senderDoc.data().email || 'User';
        } catch (e) {}

        // Find existing conversation or create new one
        const participants = [senderId, recipientId].sort(); // Sort for consistent query
        let conversationId = null;

        const existingConv = await db.collection('directMessages')
            .where('participants', '==', participants)
            .limit(1)
            .get();

        if (!existingConv.empty) {
            conversationId = existingConv.docs[0].id;
        } else {
            // Create new conversation
            const newConv = await db.collection('directMessages').add({
                participants,
                lastMessage: null,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            conversationId = newConv.id;
        }

        // Add message to sub-collection
        const messageData = {
            text: text.trim(),
            senderId,
            senderName,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('directMessages').doc(conversationId)
            .collection('messages').add(messageData);

        // Update conversation's lastMessage
        await db.collection('directMessages').doc(conversationId).update({
            lastMessage: {
                text: text.trim(),
                senderId,
                createdAt: new Date().toISOString()
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Create notification for recipient
        try {
            await db.collection('notifications').add({
                userId: recipientId,
                type: 'direct_message',
                title: 'New Message',
                message: `${senderName}: ${text.trim().substring(0, 80)}${text.trim().length > 80 ? '...' : ''}`,
                read: false,
                time: new Date().toISOString(),
                link: `/messages`
            });
        } catch (e) {}

        res.json({ success: true, conversationId });
    } catch (err) {
        console.error('[DM] Error sending message:', err);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// GET /api/dm/search-users — Search users to start a new DM
router.get('/search-users', verifyToken, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { q } = req.query;

        if (!q || q.length < 2) {
            return res.json({ users: [] });
        }

        const snapshot = await db.collection('users').limit(100).get();
        const users = [];

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (doc.id === userId) return; // Skip self
            
            // Filter out mentors from peer search
            if (data.role === 'mentor') return;

            const name = (data.name || '').toLowerCase();
            const email = (data.email || '').toLowerCase();
            const query = q.toLowerCase();

            if (name.includes(query) || email.includes(query)) {
                users.push({
                    uid: doc.id,
                    name: data.name || data.email || 'User',
                    role: data.role || 'student',
                    profilePicture: data.profilePicture || null
                });
            }
        });

        res.json({ users: users.slice(0, 10) });
    } catch (err) {
        console.error('[DM] Error searching users:', err);
        res.status(500).json({ error: 'Failed to search users' });
    }
});

module.exports = router;
