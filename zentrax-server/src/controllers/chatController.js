const { db } = require('../middleware/auth');

// GET /api/mentor-chat/conversations — Get list of chats for the current user
exports.getConversations = async (req, res) => {
    try {
        const userId = req.user.uid;
        
        // Get chats where user is student OR mentor
        const studentChats = await db.collection('mentor_chats')
            .where('student_id', '==', userId)
            .get();
            
        const mentorChats = await db.collection('mentor_chats')
            .where('mentor_id', '==', userId)
            .get();

        const conversations = [];
        const processDocs = async (snapshot, isMentorRole) => {
            for (const doc of snapshot.docs) {
                const data = doc.data();
                const partnerId = isMentorRole ? data.student_id : data.mentor_id;
                
                const userDoc = await db.collection('users').doc(partnerId).get();
                const userData = userDoc.exists ? userDoc.data() : { name: 'Unknown User' };

                conversations.push({
                    id: doc.id,
                    ...data,
                    partner: {
                        id: partnerId,
                        name: userData.name,
                        profilePicture: userData.profilePicture,
                        last_seen: userData.last_seen || null
                    }
                });
            }
        };

        await processDocs(studentChats, false);
        await processDocs(mentorChats, true);

        conversations.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
        res.status(200).json({ success: true, conversations });
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
};

// GET /api/mentor-chat/messages/:chatId — Get messages for a specific chat
exports.getMessages = async (req, res) => {
    try {
        const { chatId } = req.params;
        
        const snapshot = await db.collection('messages')
            .where('chat_id', '==', chatId)
            .orderBy('created_at', 'asc')
            .get();

        const messages = [];
        snapshot.forEach(doc => {
            messages.push({ id: doc.id, ...doc.data() });
        });

        res.status(200).json({ success: true, messages });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
};

// POST /api/mentor-chat/send — Send a message
exports.sendMessage = async (req, res) => {
    try {
        const { chatId, message } = req.body;
        const senderId = req.user.uid;

        if (!chatId || !message) {
            return res.status(400).json({ error: 'chatId and message are required' });
        }

        const chatRef = db.collection('mentor_chats').doc(chatId);
        const chatDoc = await chatRef.get();

        if (!chatDoc.exists) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        const chatData = chatDoc.data();
        const receiverId = chatData.student_id === senderId ? chatData.mentor_id : chatData.student_id;

        const messageData = {
            chat_id: chatId,
            sender_id: senderId,
            message: message.trim(),
            created_at: new Date().toISOString()
        };

        const docRef = await db.collection('messages').add(messageData);

        // Update last message in chat
        await chatRef.update({
            last_message: message.trim(),
            updated_at: new Date().toISOString()
        });

        // Notify receiver
        await db.collection('notifications').add({
            userId: receiverId,
            title: 'New Message',
            message: `You have a new message: "${message.substring(0, 30)}..."`,
            read: false,
            created_at: new Date().toISOString()
        });

        res.status(201).json({ success: true, id: docRef.id, ...messageData });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
};
