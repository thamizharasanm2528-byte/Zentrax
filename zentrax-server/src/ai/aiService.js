const OpenAI = require('openai');
const aiMemoryService = require('./aiMemoryService');
const aiKnowledgeService = require('./aiKnowledgeService');
const aiCorrectionRetrievalService = require('./aiCorrectionRetrievalService');
const aiPromptBuilder = require('./aiPromptBuilder');

// Groq-compatible client using OpenAI SDK
const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1'
});

const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

/**
 * Helper: checks if an error is a quota/billing/rate-limit issue.
 */
function isQuotaOrRateError(error) {
    if (error.status === 429) return true;
    if (error.code === 'insufficient_quota') return true;
    const msg = (error.message || '').toLowerCase();
    return msg.includes('quota') || msg.includes('billing') || msg.includes('rate_limit');
}

/**
 * Core AI Service for ZENTRAX-AI (Groq backend).
 *
 * Orchestration flow:
 *   1. Fetch context layers in parallel (knowledge, corrections, history)
 *   2. Delegate prompt assembly to aiPromptBuilder (budget-aware)
 *   3. Call Groq LLM
 *   4. Return response (or graceful fallback)
 */
class AIService {
    constructor() {
        this.systemPrompt = `You are ZENTRAX-AI, a friendly and highly supportive technical mentor for students and beginner developers.

Your role is to help students:
- build software projects from idea to completion
- choose the right tech stacks for their needs
- debug code and fix errors
- understand programming concepts in simple words
- break down complex tasks into clear, manageable steps
- guide project planning, architecture, and execution

Your tone must always be:
- warm and encouraging — like a senior student helping a junior
- conversational and natural — not robotic or formal
- beginner-friendly — explain simply first, then go deeper
- clear and practical — give actionable advice, not vague theory

Behavior rules:
- Respond like a helpful mentor who genuinely cares, not like a search engine
- If the user seems confused or stuck, reassure them and guide them step by step
- If the user writes casually (like "bro suggest tech stack" or "why this error coming"), respond naturally and warmly — match their energy while staying helpful
- If the user asks a technical question, answer clearly with examples and explanations
- Always make the student feel supported and capable
- Use conversational transitions like "Got it!", "Great question!", "Here's what I'd suggest:", "Let me break this down for you"
- When suggesting solutions, explain WHY each choice is good, not just WHAT to use
- If you don't have enough context, ask a friendly follow-up question instead of guessing

Response style:
1. Brief friendly acknowledgment of their question
2. Clear explanation in simple language
3. Step-by-step help or structured breakdown
4. Code example or practical illustration if relevant
5. Encouraging closing line or offer to help further

Example response style:
"Great question! For a student collaboration platform, here's a solid tech stack I'd recommend:

**Frontend** — React (great community, tons of tutorials)
**Backend** — Node.js + Express (pairs perfectly with React)
**Database** — Firebase Firestore (real-time sync, easy auth)

Here's why this combo works well: React handles the UI smoothly, Node.js keeps everything in JavaScript so you don't need to switch languages, and Firebase handles authentication and database without needing to set up a server.

Want me to suggest a folder structure for this setup too?"

Important:
- Do NOT give one-line dry responses unless the user specifically asks for a short answer
- Do NOT be overly formal or stiff
- Do NOT start every response with "I'd be happy to help" or similar repetitive phrases
- Keep responses focused and practical — students are busy
- Use markdown formatting (bold, bullet points, numbered lists, code blocks) to make responses scannable`;
    }

    /**
     * Generates a conversational response using Groq.
     * Returns { response, fallback } — fallback=true if AI could not respond.
     */
    async generateResponse(chatId, userMessage, userPreferences = null) {
        try {
            // ── 1. Fetch all context layers in parallel ──
            // Each fetch is independently wrapped — a failure in one
            // does not block or break the others.

            const [knowledgeContext, correctionsContext, history] = await Promise.all([
                // Layer 4: Knowledge (RAG)
                aiKnowledgeService.searchKnowledgeBase(userMessage)
                    .catch(err => {
                        console.warn('[AI RAG] Knowledge search failed (non-fatal):', err.message);
                        return '';
                    }),

                // Layer 3: Past corrections (ai_memory + ai_feedback)
                aiCorrectionRetrievalService.retrieve(userMessage, 5)
                    .catch(err => {
                        console.warn('[AI Retrieval] Correction search failed (non-fatal):', err.message);
                        return '';
                    }),

                // Conversation history (last 16 messages)
                aiMemoryService.getContextMessages(chatId, 16)
                    .catch(err => {
                        console.warn('[AI Memory] History fetch failed (non-fatal):', err.message);
                        return [];
                    }),
            ]);

            // ── 2. Assemble prompt via builder ──
            // The builder handles character budgets, prioritization,
            // and layer ordering. See aiPromptBuilder.js.

            const promptCtx = {
                basePrompt: this.systemPrompt,
                preferences: userPreferences,
                corrections: correctionsContext,
                knowledge: knowledgeContext,
                history,
                userMessage,
            };

            const messages = aiPromptBuilder.build(promptCtx);
            const promptSummary = aiPromptBuilder.summarize(promptCtx);

            // ── 3. Call Groq ──
            console.log(`[AI] Model: ${GROQ_MODEL} | Context: ${promptSummary}`);
            const t0 = Date.now();

            const completion = await client.chat.completions.create({
                model: GROQ_MODEL,
                messages,
                temperature: 0.8,
                top_p: 0.9,
            });

            const aiResponse = completion.choices[0].message.content;
            console.log(`[AI] Groq responded in ${Date.now() - t0}ms`);

            // Conversation saving is handled by the controller (fire-and-forget)
            return { response: aiResponse, fallback: false };
        } catch (error) {
            // Handle specific errors gracefully instead of crashing
            if (isQuotaOrRateError(error)) {
                console.error('[AI] Groq quota/rate limit exceeded', { chatId, code: error.code, status: error.status });
                return {
                    response: "Hey, I'm having a small issue responding right now — the AI service is temporarily at capacity. Please try again in a moment! 🙏",
                    fallback: true
                };
            }

            if (error.status === 401 || error.code === 'invalid_api_key') {
                console.error('[AI] Invalid Groq API key', { chatId });
                return {
                    response: "Hmm, it looks like ZENTRAX-AI isn't properly connected right now. The admin needs to check the API configuration. Hang tight! 🔧",
                    fallback: true
                };
            }

            // Unknown error — still don't crash, return friendly fallback
            console.error('[AI] Groq error:', error.message || error);
            return {
                response: "Hey, I'm having a small issue responding right now. Please try again in a moment — I'll be back! 💪",
                fallback: true
            };
        }
    }
}

module.exports = new AIService();
