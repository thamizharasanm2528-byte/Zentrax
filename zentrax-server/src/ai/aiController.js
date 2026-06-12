const aiService = require('./aiService');
const aiMemoryService = require('./aiMemoryService');
const aiKnowledgeService = require('./aiKnowledgeService');
const aiPreferenceService = require('./aiPreferenceService');
const aiMistakeMemoryService = require('./aiMistakeMemoryService');
const { db } = require('../middleware/auth');

/**
 * ZENTRAX-AI Controller — multi-conversation support.
 */

/* ──────────────── Chat (send message) ──────────────── */
exports.chat = async (req, res) => {
    try {
        const { message, conversationId } = req.body;
        const userId = req.user.uid;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        if (!process.env.GROQ_API_KEY) {
            console.warn('[AI Hit] Groq key missing');
            return res.status(200).json({
                success: false,
                error: 'AI is not configured (missing key)',
                data: {
                    reply: 'ZENTRAX-AI is not configured. The administrator needs to add a Groq API key.',
                    fallback: true
                }
            });
        }

        // Resolve or create conversation
        let chatId = conversationId;
        let isNewChat = false;

        if (!chatId) {
            chatId = await aiMemoryService.createConversation(userId);
            isNewChat = true;
        }

        // Save user message
        await aiMemoryService.saveMessage(chatId, 'user', message);

        // Auto-title on first message (if title is still default)
        let title = null;
        if (isNewChat) {
            title = await aiMemoryService.autoTitle(chatId, message);
        } else {
            // Check if conversation still has the default title
            try {
                const chatDoc = await db.collection('ai_chats').doc(chatId).get();
                if (chatDoc.exists && chatDoc.data().title === 'New Chat') {
                    title = await aiMemoryService.autoTitle(chatId, message);
                }
            } catch (e) { /* ignore */ }
        }

        // Fetch user preferences for prompt tailoring
        const userPreferences = await aiPreferenceService.getPreferences(userId);

        // Generate AI response (conversation-scoped history)
        const result = await aiService.generateResponse(chatId, message, userPreferences);

        // Save assistant message
        if (!result.fallback) {
            aiMemoryService.saveMessage(chatId, 'assistant', result.response)
                .catch(e => console.warn('[AI] Save assistant msg failed:', e.message));
        }

        console.log(`[AI Chat] Success for user ${userId}, chat ${chatId}`);
        res.status(200).json({
            success: true,
            message: 'AI response generated successfully',
            data: {
                reply: result.response,
                fallback: result.fallback || false,
                conversationId: chatId,
                title: title || undefined
            }
        });
    } catch (error) {
        console.error('[AI Chat] Unexpected error:', error.message || error);
        res.status(200).json({
            success: false,
            error: 'Unable to generate AI response',
            data: {
                reply: 'ZENTRAX-AI encountered an unexpected error. Please try again later.',
                fallback: true
            }
        });
    }
};

/* ──────────────── Regenerate last AI response ──────────────── */
exports.regenerate = async (req, res) => {
    try {
        const { conversationId } = req.body;
        if (!conversationId) return res.status(400).json({ error: 'conversationId is required' });

        if (!process.env.GROQ_API_KEY) {
            return res.status(200).json({ response: 'ZENTRAX-AI is not configured.', fallback: true });
        }

        // Get last user message
        const msgs = await aiMemoryService.getMessages(conversationId, 100);
        const lastUserMsg = [...msgs].reverse().find(m => m.role === 'user');
        if (!lastUserMsg) return res.status(400).json({ error: 'No user message to regenerate from' });

        // Fetch user preferences
        const userId = req.user.uid;
        const userPreferences = await aiPreferenceService.getPreferences(userId);

        // Generate fresh response
        const result = await aiService.generateResponse(conversationId, lastUserMsg.content, userPreferences);

        // Replace last assistant message
        if (!result.fallback) {
            await aiMemoryService.replaceLastAssistantMessage(conversationId, result.response);
        }

        console.log(`[AI Regenerate] Success for chat ${conversationId}`);
        res.status(200).json({
            success: true,
            message: 'AI response regenerated',
            data: {
                reply: result.response,
                fallback: result.fallback || false
            }
        });
    } catch (error) {
        console.error('[AI Regenerate] Error:', error.message);
        res.status(200).json({
            success: false,
            error: 'Failed to regenerate response',
            data: {
                reply: 'Failed to regenerate. Please try again.',
                fallback: true
            }
        });
    }
};

/* ──────────────── Create new chat ──────────────── */
exports.createChat = async (req, res) => {
    try {
        const userId = req.user.uid;
        const chatId = await aiMemoryService.createConversation(userId);
        res.status(201).json({ success: true, data: { conversationId: chatId, title: 'New Chat' } });
    } catch (error) {
        console.error('[AI NewChat] Error:', error.message);
        res.status(500).json({ error: 'Failed to create chat' });
    }
};

/* ──────────────── List conversations ──────────────── */
exports.getConversations = async (req, res) => {
    try {
        const userId = req.user.uid;
        const conversations = await aiMemoryService.getConversations(userId);
        res.status(200).json({ success: true, data: { conversations } });
    } catch (error) {
        console.error('[AI Conversations] Error:', error.message);
        res.status(200).json({ conversations: [] });
    }
};

/* ──────────────── Get messages for a conversation ──────────────── */
exports.getMessages = async (req, res) => {
    try {
        const { id } = req.params;
        const messages = await aiMemoryService.getMessages(id);
        res.status(200).json({ success: true, data: { messages } });
    } catch (error) {
        console.error('[AI Messages] Error:', error.message);
        res.status(200).json({ messages: [] });
    }
};

/* ──────────────── Rename conversation ──────────────── */
exports.renameChat = async (req, res) => {
    try {
        const { id } = req.params;
        const { title } = req.body;
        if (!title) return res.status(400).json({ error: 'Title is required' });
        await aiMemoryService.renameConversation(id, title);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('[AI Rename] Error:', error.message);
        res.status(500).json({ error: 'Failed to rename' });
    }
};

/* ──────────────── Delete conversation ──────────────── */
exports.deleteChat = async (req, res) => {
    try {
        const { id } = req.params;
        await aiMemoryService.deleteConversation(id);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('[AI Delete] Error:', error.message);
        res.status(500).json({ error: 'Failed to delete' });
    }
};

/* ──────────────── Feedback ──────────────── */
exports.submitFeedback = async (req, res) => {
    try {
        const { chatId, prompt, response, rating, correctedResponse, issueType } = req.body;
        const userId = req.user.uid;

        if (!response || !rating) {
            return res.status(400).json({ error: 'Message response and rating are required' });
        }

        const feedbackData = {
            user_id: userId,
            chat_id: chatId || null,
            prompt: prompt || null,
            ai_response: response,
            feedback_type: rating, // helpful, not_helpful, improved
            corrected_response: correctedResponse || null,
            issue_type: issueType || null,
            created_at: new Date()
        };

        const docRef = await db.collection('ai_feedback').add(feedbackData);
        console.log(`[AI Feedback] Saved feedback ${docRef.id} for user ${userId}`);

        // If the user provided a correction, convert it into reusable mistake memory
        let memoryId = null;
        if (correctedResponse && (rating === 'improved' || rating === 'not_helpful')) {
            memoryId = await aiMistakeMemoryService.createFromFeedback({
                prompt,
                aiResponse: response,
                correctedResponse,
                issueType,
                userId,
                feedbackId: docRef.id
            });
        }

        res.status(201).json({
            success: true,
            feedback_id: docRef.id,
            memory_id: memoryId || undefined
        });
    } catch (error) {
        console.error('[AI Feedback] Error:', error.message);
        res.status(500).json({ error: 'Failed to submit feedback' });
    }
};

/* ──────────────── Knowledge (mentor only) ──────────────── */
exports.addKnowledge = async (req, res) => {
    try {
        const { topic, content, tags } = req.body;

        if (!topic || !content) {
            return res.status(400).json({ error: 'Topic and content are required' });
        }

        const aiKnowledgeService = require('./aiKnowledgeService');
        const success = await aiKnowledgeService.addKnowledge(topic, content, tags);
        if (success) {
            res.status(201).json({ success: true, message: 'Knowledge added to base' });
        } else {
            res.status(500).json({ error: 'Failed to add knowledge' });
        }
    } catch (error) {
        console.error('[AI Knowledge] Error:', error.message);
        res.status(500).json({ error: 'Failed to add knowledge' });
    }
};

/* ──────────────── User Preferences ──────────────── */

exports.getPreferences = async (req, res) => {
    try {
        const userId = req.user.uid;
        const prefs = await aiPreferenceService.getPreferences(userId);
        res.status(200).json({ success: true, data: prefs });
    } catch (error) {
        console.error('[AI GetPrefs] Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch preferences' });
    }
};

exports.updatePreferences = async (req, res) => {
    try {
        const userId = req.user.uid;
        const prefs = req.body;
        const success = await aiPreferenceService.setPreferences(userId, prefs);
        if (success) {
            res.status(200).json({ success: true, message: 'Preferences updated' });
        } else {
            res.status(500).json({ error: 'Failed to update preferences' });
        }
    } catch (error) {
        console.error('[AI UpdatePrefs] Error:', error.message);
        res.status(500).json({ error: 'Failed to update preferences' });
    }
};

/* ──────────────── Mistake Memory ──────────────── */

exports.getMemories = async (req, res) => {
    try {
        const topic = req.query.topic || null;
        const memories = await aiMistakeMemoryService.listMemories(topic);
        res.status(200).json({ success: true, data: { memories } });
    } catch (error) {
        console.error('[AI Memories] Error:', error.message);
        res.status(200).json({ success: true, data: { memories: [] } });
    }
};

exports.deleteMemory = async (req, res) => {
    try {
        const { id } = req.params;
        const success = await aiMistakeMemoryService.deleteMemory(id);
        if (success) {
            res.status(200).json({ success: true, message: 'Memory deleted' });
        } else {
            res.status(500).json({ error: 'Failed to delete memory' });
        }
    } catch (error) {
        console.error('[AI DeleteMemory] Error:', error.message);
        res.status(500).json({ error: 'Failed to delete memory' });
    }
};
