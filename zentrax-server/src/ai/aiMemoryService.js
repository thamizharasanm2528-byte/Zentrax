const { db, admin } = require('../middleware/auth');

/**
 * Manages multi-conversation AI chat using two Firestore collections:
 *
 *   ai_chats/{id}     → { user_id, title, created_at, updated_at }
 *   ai_messages/{id}  → { chat_id, role, content, created_at }
 */
class AIMemoryService {

    /* ──────────────── Conversation CRUD ──────────────── */

    /**
     * Creates a new conversation and returns its Firestore doc ID.
     */
    async createConversation(userId, title = 'New Chat') {
        const doc = await db.collection('ai_chats').add({
            user_id: userId,
            title,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
        console.log(`[AI] Created conversation ${doc.id} for user ${userId}`);
        return doc.id;
    }

    /**
     * Lists all conversations for a user, ordered newest-first.
     */
    async getConversations(userId) {
        let snap;
        try {
            // This query requires a Firestore composite index on (user_id, updated_at)
            snap = await db.collection('ai_chats')
                .where('user_id', '==', userId)
                .orderBy('updated_at', 'desc')
                .limit(50)
                .get();
        } catch (indexError) {
            // Fallback: if composite index doesn't exist, query without orderBy
            console.warn('[AI Memory] Composite index missing, using fallback query:', indexError.message);
            snap = await db.collection('ai_chats')
                .where('user_id', '==', userId)
                .limit(50)
                .get();
        }

        const list = [];
        snap.forEach(doc => {
            const d = doc.data();
            list.push({ id: doc.id, title: d.title, created_at: d.created_at, updated_at: d.updated_at });
        });
        // Sort in-memory (fallback for missing index)
        list.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
        return list;
    }

    /**
     * Renames a conversation.
     */
    async renameConversation(chatId, newTitle) {
        await db.collection('ai_chats').doc(chatId).update({ title: newTitle, updated_at: new Date().toISOString() });
    }

    /**
     * Deletes a conversation and all its messages.
     */
    async deleteConversation(chatId) {
        // Delete messages in batches
        const msgSnap = await db.collection('ai_messages').where('chat_id', '==', chatId).get();
        const batch = db.batch();
        msgSnap.forEach(doc => batch.delete(doc.ref));
        batch.delete(db.collection('ai_chats').doc(chatId));
        await batch.commit();
        console.log(`[AI] Deleted conversation ${chatId} (${msgSnap.size} messages)`);
    }

    /* ──────────────── Messages ──────────────── */

    /**
     * Saves a single message (user or assistant) to a conversation.
     */
    async saveMessage(chatId, role, content) {
        await db.collection('ai_messages').add({
            chat_id: chatId,
            role,
            content,
            created_at: new Date().toISOString()
        });
        // Touch the conversation's updated_at
        await db.collection('ai_chats').doc(chatId).update({ updated_at: new Date().toISOString() });
    }

    /**
     * Fetches all messages for a conversation in chronological order.
     */
    async getMessages(chatId, limit = 100) {
        const snap = await db.collection('ai_messages')
            .where('chat_id', '==', chatId)
            .orderBy('created_at', 'asc')
            .limit(limit)
            .get();

        const msgs = [];
        snap.forEach(doc => {
            const d = doc.data();
            msgs.push({ id: doc.id, role: d.role, content: d.content, created_at: d.created_at });
        });
        return msgs;
    }

    /**
     * Gets recent conversation context for the AI prompt (conversation-scoped).
     * Returns last N messages in chronological order for system prompt injection.
     */
    async getContextMessages(chatId, limit = 16) {
        const snap = await db.collection('ai_messages')
            .where('chat_id', '==', chatId)
            .orderBy('created_at', 'desc')
            .limit(limit)
            .get();

        if (snap.empty) return [];

        const msgs = [];
        snap.forEach(doc => {
            const d = doc.data();
            if (d.role && d.content) {
                msgs.push({ role: d.role, content: d.content });
            }
        });

        // Reverse to chronological order (oldest first)
        msgs.reverse();
        return msgs;
    }

    /**
     * Replaces the last assistant message in a conversation (for regenerate).
     */
    async replaceLastAssistantMessage(chatId, newContent) {
        const snap = await db.collection('ai_messages')
            .where('chat_id', '==', chatId)
            .where('role', '==', 'assistant')
            .orderBy('created_at', 'desc')
            .limit(1)
            .get();

        if (!snap.empty) {
            const doc = snap.docs[0];
            await doc.ref.update({ content: newContent, created_at: new Date().toISOString() });
        }
    }

    /**
     * Auto-generates a short title from the first user message.
     */
    generateTitle(message) {
        // Take first ~50 chars, capitalize first letter, trim
        const clean = message.replace(/\n/g, ' ').trim();
        const short = clean.length > 50 ? clean.substring(0, 50) + '...' : clean;
        return short.charAt(0).toUpperCase() + short.slice(1);
    }

    /**
     * Updates conversation title (used after first message).
     */
    async autoTitle(chatId, firstMessage) {
        const title = this.generateTitle(firstMessage);
        await db.collection('ai_chats').doc(chatId).update({ title });
        return title;
    }
}

module.exports = new AIMemoryService();
