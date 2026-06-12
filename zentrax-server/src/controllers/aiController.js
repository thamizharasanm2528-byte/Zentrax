const { db } = require('../middleware/auth');
const OpenAI = require('openai');

const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1'
});

const promptBuilder = require('../services/promptBuilder');

exports.askAi = async (req, res) => {
    try {
        const { message, context, mode, attachmentName, attachmentType } = req.body;
        const userId = req.user.uid;

        if (!message && !attachmentName) {
            return res.status(400).json({ error: 'Message is required' });
        }

        if (!process.env.GROQ_API_KEY) {
            return res.status(200).json({
                response: 'AI Assistant is currently unavailable. Groq API key is not configured.',
                fallback: true
            });
        }

        // Fetch user preferences for personalized prompt
        let userPrefs = {};
        try {
            const prefDoc = await db.collection('ai_preferences').doc(userId).get();
            if (prefDoc.exists) userPrefs = prefDoc.data();
        } catch (e) {
            console.warn('[AI Ask] Failed to fetch user prefs:', e.message);
        }

        const systemPrompt = promptBuilder.buildSystemPrompt({ 
            mode: mode || 'default', 
            context: context || 'No project context provided.',
            userPrefs
        });

        const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

        // Include attachment metadata in the user message
        let userMessage = message || '';
        if (attachmentName) {
            userMessage = `[User uploaded: ${attachmentName} (${attachmentType || 'binary'})]\n\n${userMessage}`;
        }

        console.log(`[AI Ask] Using ${GROQ_MODEL}, Mode: ${mode || 'default'}`);
        
        const completion = await client.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage }
            ],
            model: GROQ_MODEL,
        });

        const aiResponse = completion.choices[0].message.content;
        res.status(200).json({ response: aiResponse });
    } catch (error) {
        console.error('[AI Ask] Error:', error.message || error);

        // Graceful fallback for quota/rate/key errors
        const msg = (error.message || '').toLowerCase();
        const isQuota = error.status === 429 || error.code === 'insufficient_quota' || msg.includes('quota') || msg.includes('billing');
        const isKeyError = error.status === 401 || error.code === 'invalid_api_key';

        if (isQuota) {
            return res.status(200).json({
                response: 'ZENTRAX-AI is temporarily unavailable because the API quota has been exceeded. Please try again later.',
                fallback: true
            });
        }
        if (isKeyError) {
            return res.status(200).json({
                response: 'ZENTRAX-AI cannot connect because the API key is invalid. Please contact the administrator.',
                fallback: true
            });
        }

        res.status(200).json({
            response: 'ZENTRAX-AI encountered an unexpected error. Please try again later.',
            fallback: true
        });
    }
};
