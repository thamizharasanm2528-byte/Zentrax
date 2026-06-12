const { db } = require('../middleware/auth');
const { extractKeywords, touchMemoriesLastUsed } = require('./aiTextUtils');

/**
 * AI Mistake Memory Service
 *
 * Stores corrected patterns derived from user feedback so the assistant
 * avoids repeating the same mistakes.  This is a **memory layer**, not
 * model training — patterns are injected into the system prompt at
 * inference time.
 *
 * Firestore collection: ai_memory
 * Document structure:
 *   memory_id      — Firestore auto-id
 *   topic          — inferred category (e.g. "React", "Firebase", "Git")
 *   mistake_pattern  — what the AI got wrong
 *   corrected_pattern — the correct response / approach
 *   confidence_score  — 0-1, bumped each time the memory is re-confirmed
 *   created_at     — ISO timestamp
 *   last_used_at   — ISO timestamp (updated when injected into a prompt)
 *   source_feedback_id — reference to the original ai_feedback doc
 *   created_by     — userId of the person who provided the correction
 */
class AIMistakeMemoryService {

    /* ────────────────────────────────────────────
     *  Topic inference (lightweight keyword match)
     * ──────────────────────────────────────────── */

    /**
     * Infers a topic from the prompt / correction text.
     * Uses simple keyword matching — no LLM call required.
     */
    inferTopic(text) {
        const lower = (text || '').toLowerCase();

        const topicMap = [
            { keywords: ['react', 'jsx', 'usestate', 'useeffect', 'component', 'hook', 'redux', 'next.js', 'nextjs'], topic: 'React' },
            { keywords: ['node', 'express', 'middleware', 'npm', 'require', 'module.exports'], topic: 'Node.js' },
            { keywords: ['firebase', 'firestore', 'auth', 'cloud function', 'realtime database'], topic: 'Firebase' },
            { keywords: ['mongodb', 'mongoose', 'schema', 'collection', 'aggregate'], topic: 'MongoDB' },
            { keywords: ['python', 'pip', 'django', 'flask', 'pandas', 'numpy'], topic: 'Python' },
            { keywords: ['css', 'tailwind', 'flexbox', 'grid', 'responsive', 'media query', 'styling'], topic: 'CSS' },
            { keywords: ['html', 'dom', 'semantic', 'accessibility', 'a11y'], topic: 'HTML' },
            { keywords: ['git', 'branch', 'merge', 'commit', 'pull request', 'rebase'], topic: 'Git' },
            { keywords: ['sql', 'postgres', 'mysql', 'query', 'join', 'index'], topic: 'SQL' },
            { keywords: ['api', 'rest', 'graphql', 'endpoint', 'fetch', 'axios', 'http'], topic: 'APIs' },
            { keywords: ['docker', 'container', 'kubernetes', 'deploy', 'ci/cd', 'pipeline'], topic: 'DevOps' },
            { keywords: ['typescript', 'type', 'interface', 'generic', 'enum'], topic: 'TypeScript' },
            { keywords: ['testing', 'jest', 'mocha', 'unit test', 'integration test', 'cypress'], topic: 'Testing' },
            { keywords: ['socket', 'websocket', 'socket.io', 'real-time', 'realtime'], topic: 'WebSockets' },
            { keywords: ['security', 'xss', 'csrf', 'injection', 'cors', 'token', 'jwt'], topic: 'Security' },
        ];

        for (const entry of topicMap) {
            if (entry.keywords.some(kw => lower.includes(kw))) {
                return entry.topic;
            }
        }
        return 'General';
    }

    /* ────────────────────────────────────────────
     *  Create memory from feedback
     * ──────────────────────────────────────────── */

    /**
     * Converts a user correction (from the feedback modal) into a
     * reusable mistake-memory entry.
     *
     * @param {object} opts
     * @param {string} opts.prompt          — original user question
     * @param {string} opts.aiResponse      — the AI's wrong answer
     * @param {string} opts.correctedResponse — user-provided correction
     * @param {string} opts.issueType       — factually_wrong | poor_format | too_long_short | other
     * @param {string} opts.userId          — who submitted the correction
     * @param {string} opts.feedbackId      — id of the parent ai_feedback doc
     * @returns {string|null} memory doc id, or null on failure
     */
    async createFromFeedback({ prompt, aiResponse, correctedResponse, issueType, userId, feedbackId }) {
        try {
            // Guard: need both the mistake and the correction
            if (!prompt || !correctedResponse) return null;

            // Build concise patterns
            const mistakePattern = this._buildMistakePattern(prompt, aiResponse, issueType);
            const correctedPattern = this._buildCorrectedPattern(prompt, correctedResponse);
            const topic = this.inferTopic(`${prompt} ${correctedResponse}`);

            // Check for duplicate/similar memory before creating a new one
            const existing = await this._findSimilarMemory(topic, prompt);
            if (existing) {
                // Boost confidence of existing memory instead of duplicating
                await this._boostConfidence(existing.id, correctedPattern);
                console.log(`[AI Memory] Boosted existing memory ${existing.id} (topic: ${topic})`);
                return existing.id;
            }

            const now = new Date().toISOString();
            const docRef = await db.collection('ai_memory').add({
                topic,
                mistake_pattern: mistakePattern,
                corrected_pattern: correctedPattern,
                confidence_score: 0.5,       // starts at 50 %, boosted on re-confirmation
                issue_type: issueType || 'other',
                source_prompt: prompt,
                created_at: now,
                last_used_at: now,
                source_feedback_id: feedbackId || null,
                created_by: userId || null,
            });

            console.log(`[AI Memory] Created memory ${docRef.id} — topic: ${topic}`);
            return docRef.id;
        } catch (error) {
            console.error('[AI Memory] Create error:', error.message);
            return null;
        }
    }

    /* ────────────────────────────────────────────
     *  NOTE: Memory search/retrieval is handled by
     *  aiCorrectionRetrievalService.retrieve() which
     *  searches both ai_memory and ai_feedback.
     * ──────────────────────────────────────────── */

    /* ────────────────────────────────────────────
     *  List memories (for admin/debug endpoint)
     * ──────────────────────────────────────────── */

    async listMemories(topicFilter = null, limit = 50) {
        try {
            let query = db.collection('ai_memory')
                .orderBy('confidence_score', 'desc')
                .limit(limit);

            if (topicFilter) {
                query = db.collection('ai_memory')
                    .where('topic', '==', topicFilter)
                    .orderBy('confidence_score', 'desc')
                    .limit(limit);
            }

            const snap = await query.get();
            const list = [];
            snap.forEach(doc => list.push({ memory_id: doc.id, ...doc.data() }));
            return list;
        } catch (error) {
            console.error('[AI Memory] List error:', error.message);
            return [];
        }
    }

    /**
     * Deletes a single memory document.
     */
    async deleteMemory(memoryId) {
        try {
            await db.collection('ai_memory').doc(memoryId).delete();
            console.log(`[AI Memory] Deleted memory ${memoryId}`);
            return true;
        } catch (error) {
            console.error('[AI Memory] Delete error:', error.message);
            return false;
        }
    }

    /* ────────────────────────────────────────────
     *  Private helpers
     * ──────────────────────────────────────────── */

    _buildMistakePattern(prompt, aiResponse, issueType) {
        const issueLabel = {
            factually_wrong: 'Factually incorrect',
            poor_format: 'Poorly formatted',
            too_long_short: 'Inappropriate length',
            other: 'Unclear or inaccurate',
        }[issueType] || 'Inaccurate';

        // Keep it short — we inject this into the prompt
        const shortPrompt = (prompt || '').substring(0, 150);
        const shortResponse = (aiResponse || '').substring(0, 200);
        return `When asked "${shortPrompt}", the AI gave a ${issueLabel.toLowerCase()} answer: "${shortResponse}..."`;
    }

    _buildCorrectedPattern(prompt, correctedResponse) {
        const shortPrompt = (prompt || '').substring(0, 150);
        const shortCorrection = (correctedResponse || '').substring(0, 300);
        return `For "${shortPrompt}", the correct approach is: ${shortCorrection}`;
    }

    _extractKeywords(text) {
        return extractKeywords(text);
    }

    _rankByKeywordRelevance(memories, keywords) {
        if (keywords.length === 0) return memories;

        return memories
            .map(m => {
                const text = `${m.source_prompt || ''} ${m.mistake_pattern || ''} ${m.corrected_pattern || ''}`.toLowerCase();
                const hits = keywords.filter(kw => text.includes(kw)).length;
                return { ...m, _relevance: hits };
            })
            .filter(m => m._relevance > 0 || m.confidence_score >= 0.7) // keep high-confidence even without keyword match
            .sort((a, b) => b._relevance - a._relevance || b.confidence_score - a.confidence_score);
    }

    _formatForPrompt(memories) {
        const lines = memories.map((m, i) =>
            `${i + 1}. [${m.topic}] ${m.corrected_pattern}`
        );
        return lines.join('\n');
    }

    async _findSimilarMemory(topic, prompt) {
        try {
            const snap = await db.collection('ai_memory')
                .where('topic', '==', topic)
                .limit(20)
                .get();

            if (snap.empty) return null;

            // Simple similarity: check if the source prompt overlaps significantly
            const promptWords = new Set(this._extractKeywords(prompt));
            let best = null;
            let bestScore = 0;

            snap.forEach(doc => {
                const data = doc.data();
                const memWords = this._extractKeywords(data.source_prompt || '');
                const overlap = memWords.filter(w => promptWords.has(w)).length;
                const score = promptWords.size > 0 ? overlap / promptWords.size : 0;

                if (score > 0.6 && score > bestScore) {
                    bestScore = score;
                    best = { id: doc.id, ...data };
                }
            });

            return best;
        } catch {
            return null;
        }
    }

    async _boostConfidence(memoryId, updatedCorrection) {
        try {
            const docRef = db.collection('ai_memory').doc(memoryId);
            const doc = await docRef.get();
            if (!doc.exists) return;

            const current = doc.data().confidence_score || 0.5;
            const boosted = Math.min(current + 0.1, 1.0); // cap at 1.0

            const update = {
                confidence_score: boosted,
                last_used_at: new Date().toISOString(),
            };

            // Only overwrite the correction if confidence is still building (not yet verified)
            // This prevents a single bad correction from replacing a verified high-confidence memory
            if (updatedCorrection && current < 0.7) {
                update.corrected_pattern = updatedCorrection;
            }

            await docRef.update(update);
        } catch (error) {
            console.warn('[AI Memory] Boost failed:', error.message);
        }
    }

    async _touchLastUsed(memoryIds) {
        return touchMemoriesLastUsed(db, memoryIds);
    }
}

module.exports = new AIMistakeMemoryService();
