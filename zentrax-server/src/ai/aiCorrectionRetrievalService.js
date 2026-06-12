const { db } = require('../middleware/auth');
const aiMistakeMemoryService = require('./aiMistakeMemoryService');
const { extractKeywords, touchMemoriesLastUsed } = require('./aiTextUtils');

/**
 * AI Correction Retrieval Service
 *
 * Unified retrieval layer that searches BOTH:
 *   1. ai_memory   — curated, high-confidence corrected patterns
 *   2. ai_feedback — raw user corrections (with corrected_response)
 *
 * Strategy:
 *   • If embeddings are available → cosine similarity search (future)
 *   • If embeddings are NOT available → keyword/topic matching (current)
 *
 * The service merges, deduplicates, and ranks results from both sources,
 * then returns a single formatted context string for system-prompt injection.
 *
 * Fallback: returns '' if nothing matches — AI works normally.
 */
class AICorrectionRetrievalService {

    constructor() {
        // Feature flag: switch to true when an embedding provider is configured
        // (e.g. OpenAI text-embedding-3-small, Cohere embed-v3, etc.)
        this.embeddingsEnabled = false;
    }

    /* ═══════════════════════════════════════════════════════════
     *  PUBLIC API — single entry point for aiService.js
     * ═══════════════════════════════════════════════════════════ */

    /**
     * Retrieves the most relevant corrections for a user prompt.
     * Merges curated memories + raw feedback corrections.
     * Returns a formatted string ready for system prompt injection,
     * or '' if nothing matches (safe fallback).
     *
     * @param {string} userMessage — the current user prompt
     * @param {number} limit      — max corrections to return
     * @returns {string}
     */
    async retrieve(userMessage, limit = 5) {
        try {
            if (!userMessage || userMessage.trim().length < 3) return '';

            const topic = aiMistakeMemoryService.inferTopic(userMessage);
            const keywords = this._extractKeywords(userMessage);

            if (keywords.length === 0) return '';

            // Run both searches in parallel — neither blocks the other
            const [curatedResults, feedbackResults] = await Promise.all([
                this._searchCuratedMemories(topic, keywords, limit),
                this._searchFeedbackCorrections(topic, keywords, limit),
            ]);

            // Merge and deduplicate
            const merged = this._mergeAndRank(curatedResults, feedbackResults, keywords, limit);

            if (merged.length === 0) return '';

            // Touch last_used_at on curated memories (fire-and-forget)
            const memoryIds = merged.filter(r => r._source === 'memory').map(r => r.id);
            if (memoryIds.length > 0) {
                this._touchLastUsed(memoryIds).catch(() => {});
            }

            const formatted = this._formatForPrompt(merged);
            console.log(`[AI Retrieval] Found ${merged.length} corrections (${curatedResults.length} curated + ${feedbackResults.length} feedback) for topic: ${topic}`);
            return formatted;
        } catch (error) {
            // Non-fatal — AI still works normally without corrections
            console.warn('[AI Retrieval] Search failed (non-fatal):', error.message);
            return '';
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  SOURCE 1: Curated ai_memory collection
     * ═══════════════════════════════════════════════════════════ */

    async _searchCuratedMemories(topic, keywords, limit) {
        try {
            let results = [];

            // 1a. Topic-specific memories
            if (topic !== 'General') {
                try {
                    const topicSnap = await db.collection('ai_memory')
                        .where('topic', '==', topic)
                        .orderBy('confidence_score', 'desc')
                        .limit(limit)
                        .get();
                    topicSnap.forEach(doc => results.push({
                        id: doc.id,
                        ...doc.data(),
                        _source: 'memory',
                    }));
                } catch (indexErr) {
                    // Composite index might be missing — fallback to topic-only
                    console.warn('[AI Retrieval] Memory topic+score index missing, using fallback:', indexErr.message);
                    const fallbackSnap = await db.collection('ai_memory')
                        .where('topic', '==', topic)
                        .limit(limit)
                        .get();
                    fallbackSnap.forEach(doc => results.push({
                        id: doc.id,
                        ...doc.data(),
                        _source: 'memory',
                    }));
                }
            }

            // 1b. General-topic memories (fill remaining slots)
            if (results.length < limit) {
                const remaining = limit - results.length;
                const existingIds = new Set(results.map(r => r.id));
                try {
                    const generalSnap = await db.collection('ai_memory')
                        .where('topic', '==', 'General')
                        .orderBy('confidence_score', 'desc')
                        .limit(remaining)
                        .get();
                    generalSnap.forEach(doc => {
                        if (!existingIds.has(doc.id)) {
                            results.push({ id: doc.id, ...doc.data(), _source: 'memory' });
                        }
                    });
                } catch {
                    // Non-fatal — skip general memories if index is missing
                }
            }

            return results;
        } catch (error) {
            console.warn('[AI Retrieval] Curated memory search failed:', error.message);
            return [];
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  SOURCE 2: Raw ai_feedback collection (corrections only)
     * ═══════════════════════════════════════════════════════════ */

    async _searchFeedbackCorrections(topic, keywords, limit) {
        try {
            // Only fetch feedback entries that have a corrected_response
            // Strategy: fetch recent 'improved' and 'not_helpful' ratings that include corrections
            let allFeedback = [];

            // 2a. Fetch 'improved' feedback (strongest signal — user literally wrote a correction)
            try {
                const improvedSnap = await db.collection('ai_feedback')
                    .where('feedback_type', '==', 'improved')
                    .orderBy('created_at', 'desc')
                    .limit(30)
                    .get();
                improvedSnap.forEach(doc => {
                    const data = doc.data();
                    if (data.corrected_response && data.prompt) {
                        allFeedback.push({ id: doc.id, ...data, _source: 'feedback', _feedbackWeight: 1.0 });
                    }
                });
            } catch (indexErr) {
                // Index might be missing — fallback without orderBy
                console.warn('[AI Retrieval] Feedback improved index missing, using fallback:', indexErr.message);
                try {
                    const fallbackSnap = await db.collection('ai_feedback')
                        .where('feedback_type', '==', 'improved')
                        .limit(30)
                        .get();
                    fallbackSnap.forEach(doc => {
                        const data = doc.data();
                        if (data.corrected_response && data.prompt) {
                            allFeedback.push({ id: doc.id, ...data, _source: 'feedback', _feedbackWeight: 1.0 });
                        }
                    });
                } catch { /* skip */ }
            }

            // 2b. Fetch 'not_helpful' feedback that has corrections
            try {
                const notHelpfulSnap = await db.collection('ai_feedback')
                    .where('feedback_type', '==', 'not_helpful')
                    .orderBy('created_at', 'desc')
                    .limit(20)
                    .get();
                notHelpfulSnap.forEach(doc => {
                    const data = doc.data();
                    if (data.corrected_response && data.prompt) {
                        allFeedback.push({ id: doc.id, ...data, _source: 'feedback', _feedbackWeight: 0.7 });
                    }
                });
            } catch {
                // Index might be missing — try without orderBy
                try {
                    const fallbackSnap = await db.collection('ai_feedback')
                        .where('feedback_type', '==', 'not_helpful')
                        .limit(20)
                        .get();
                    fallbackSnap.forEach(doc => {
                        const data = doc.data();
                        if (data.corrected_response && data.prompt) {
                            allFeedback.push({ id: doc.id, ...data, _source: 'feedback', _feedbackWeight: 0.7 });
                        }
                    });
                } catch { /* skip */ }
            }

            if (allFeedback.length === 0) return [];

            // 2c. Rank by keyword relevance to current prompt
            const scored = allFeedback.map(fb => {
                const text = `${fb.prompt || ''} ${fb.corrected_response || ''} ${fb.ai_response || ''}`.toLowerCase();
                const hits = keywords.filter(kw => text.includes(kw)).length;
                const keywordScore = keywords.length > 0 ? hits / keywords.length : 0;

                // Topic bonus: if the feedback matches the inferred topic
                const feedbackTopic = aiMistakeMemoryService.inferTopic(`${fb.prompt || ''} ${fb.corrected_response || ''}`);
                const topicBonus = feedbackTopic === topic ? 0.2 : 0;

                return {
                    ...fb,
                    _relevanceScore: (keywordScore * fb._feedbackWeight) + topicBonus,
                };
            });

            // Filter: require at least SOME keyword overlap (>10% keywords match)
            const relevant = scored
                .filter(fb => fb._relevanceScore > 0.1)
                .sort((a, b) => b._relevanceScore - a._relevanceScore)
                .slice(0, limit);

            return relevant;
        } catch (error) {
            console.warn('[AI Retrieval] Feedback search failed:', error.message);
            return [];
        }
    }

    /* ═══════════════════════════════════════════════════════════
     *  Merge + Rank + Deduplicate
     * ═══════════════════════════════════════════════════════════ */

    _mergeAndRank(curatedResults, feedbackResults, keywords, limit) {
        // Normalize scores so we can compare across sources
        const all = [];

        // Curated memories get higher base priority (they've been confirmed/boosted)
        for (const mem of curatedResults) {
            const text = `${mem.source_prompt || ''} ${mem.corrected_pattern || ''}`.toLowerCase();
            const hits = keywords.filter(kw => text.includes(kw)).length;
            const keywordScore = keywords.length > 0 ? hits / keywords.length : 0;
            const confidenceBoost = (mem.confidence_score || 0.5) * 0.4; // 0–0.4 boost

            all.push({
                id: mem.id,
                _source: 'memory',
                _finalScore: keywordScore + confidenceBoost + 0.1, // +0.1 curated bonus
                topic: mem.topic || 'General',
                correction: mem.corrected_pattern || '',
                mistake: mem.mistake_pattern || '',
                confidence: mem.confidence_score || 0.5,
            });
        }

        // Raw feedback corrections get scored by relevance + feedback weight
        for (const fb of feedbackResults) {
            // Dedup: skip if a curated memory already covers this prompt
            const fbKeywords = new Set(this._extractKeywords(fb.prompt || ''));
            const isDuplicate = all.some(existing => {
                if (existing._source !== 'memory') return false;
                const existingKw = new Set(this._extractKeywords(existing.correction));
                const overlap = [...fbKeywords].filter(kw => existingKw.has(kw)).length;
                return fbKeywords.size > 0 && overlap / fbKeywords.size > 0.5;
            });

            if (isDuplicate) continue;

            const feedbackTopic = aiMistakeMemoryService.inferTopic(`${fb.prompt || ''} ${fb.corrected_response || ''}`);

            all.push({
                id: fb.id,
                _source: 'feedback',
                _finalScore: fb._relevanceScore || 0,
                topic: feedbackTopic,
                correction: this._buildFeedbackCorrection(fb),
                mistake: this._buildFeedbackMistake(fb),
                confidence: fb._feedbackWeight || 0.5,
            });
        }

        // Sort by final score (highest first) and take top N
        all.sort((a, b) => b._finalScore - a._finalScore);
        return all.slice(0, limit);
    }

    /* ═══════════════════════════════════════════════════════════
     *  Formatting
     * ═══════════════════════════════════════════════════════════ */

    _formatForPrompt(corrections) {
        if (corrections.length === 0) return '';

        const lines = corrections.map((c, i) => {
            const source = c._source === 'memory' ? '✓' : '○'; // ✓ = curated, ○ = from feedback
            const confidence = c.confidence >= 0.8 ? 'HIGH' : c.confidence >= 0.5 ? 'MED' : 'LOW';
            return `${i + 1}. ${source} [${c.topic}] (${confidence}) ${c.correction}`;
        });

        return lines.join('\n');
    }

    _buildFeedbackCorrection(fb) {
        const shortPrompt = (fb.prompt || '').substring(0, 120);
        const shortCorrection = (fb.corrected_response || '').substring(0, 250);
        return `For "${shortPrompt}", the user corrected: ${shortCorrection}`;
    }

    _buildFeedbackMistake(fb) {
        const shortResponse = (fb.ai_response || '').substring(0, 150);
        const issueLabel = {
            factually_wrong: 'gave a factually incorrect response',
            poor_format: 'gave a poorly formatted response',
            too_long_short: 'gave an inappropriately-lengthed response',
            other: 'gave an inaccurate response',
        }[fb.issue_type] || 'gave an inaccurate response';

        return `The AI ${issueLabel}: "${shortResponse}..."`;
    }

    /* ═══════════════════════════════════════════════════════════
     *  Keyword extraction (reused from aiMistakeMemoryService)
     * ═══════════════════════════════════════════════════════════ */

    _extractKeywords(text) {
        return extractKeywords(text);
    }

    /* ═══════════════════════════════════════════════════════════
     *  Utilities
     * ═══════════════════════════════════════════════════════════ */

    async _touchLastUsed(memoryIds) {
        return touchMemoriesLastUsed(db, memoryIds);
    }

    /* ═══════════════════════════════════════════════════════════
     *  Embedding support (prepared for future)
     * ═══════════════════════════════════════════════════════════ */

    /**
     * Cosine similarity between two embedding vectors.
     * Ready for use when an embedding provider is configured.
     */
    cosineSimilarity(vecA, vecB) {
        if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
        let dot = 0, normA = 0, normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dot += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        const denom = Math.sqrt(normA) * Math.sqrt(normB);
        return denom === 0 ? 0 : dot / denom;
    }

    /**
     * When embeddings are enabled, this replaces keyword matching:
     *   1. Generate embedding for user message
     *   2. Search ai_memory + ai_feedback for nearest vectors
     *   3. Rank by cosine similarity
     *
     * Placeholder — activate by setting this.embeddingsEnabled = true
     * and providing a generateEmbedding(text) implementation.
     */
    async _embeddingSearch(userMessage, limit) {
        // TODO: Implement when an embedding provider is added
        // const queryVec = await embeddingProvider.embed(userMessage);
        // const snap = await db.collection('ai_memory').get();
        // ... cosine similarity ranking ...
        return [];
    }
}

module.exports = new AICorrectionRetrievalService();
