const { db } = require('../middleware/auth');

/**
 * AIKnowledgeService — Embeddings temporarily disabled.
 *
 * Groq does not provide embedding APIs, so semantic search is skipped.
 * Knowledge can still be stored as plain text (without embeddings).
 * When an embedding provider is added later, re-enable generateEmbedding().
 */
class AIKnowledgeService {
    /**
     * Embedding generation — DISABLED (Groq has no embedding API).
     * Returns null immediately without making any API calls.
     */
    async generateEmbedding(text) {
        console.log('[AI] Knowledge search skipped (embeddings disabled — Groq has no embedding API)');
        return null;
    }

    /**
     * Cosine similarity — kept for future use when embeddings are re-enabled.
     */
    cosineSimilarity(vecA, vecB) {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Knowledge base search — returns empty (embeddings disabled).
     */
    async searchKnowledgeBase(query, limit = 3) {
        try {
            if (!query || query.trim().length < 3) return '';

            const snap = await db.collection('knowledge_base').limit(50).get();
            if (snap.empty) return '';

            // Simple keyword extraction (no stopwords for brevity)
            const keywords = query.toLowerCase()
                .replace(/[^a-z0-9\s.-]/g, ' ')
                .split(/\s+/)
                .filter(w => w.length > 2);

            if (keywords.length === 0) return '';

            const results = [];
            snap.forEach(doc => {
                const d = doc.data();
                const text = `${d.topic || ''} ${d.content || ''} ${(d.tags || []).join(' ')}`.toLowerCase();
                const hits = keywords.filter(kw => text.includes(kw)).length;
                if (hits > 0) {
                    results.push({ topic: d.topic, content: d.content, _score: hits });
                }
            });

            if (results.length === 0) return '';

            results.sort((a, b) => b._score - a._score);
            return results
                .slice(0, limit)
                .map(r => `[${r.topic}] ${r.content}`)
                .join('\n');
        } catch (err) {
            console.warn('[AI Knowledge] Search failed (non-fatal):', err.message);
            return '';
        }
    }

    /**
     * Adds new knowledge to the database (stored as plain text, no embedding).
     */
    async addKnowledge(topic, content, tags = []) {
        try {
            await db.collection('knowledge_base').add({
                topic,
                content,
                tags,
                embedding: null, // Placeholder — will be populated when embeddings are re-enabled
                created_at: new Date()
            });
            console.log(`[AI Knowledge] Stored knowledge: "${topic}" (without embedding)`);
            return true;
        } catch (error) {
            console.error('[AI Knowledge] Failed to add knowledge:', error.message);
            return false;
        }
    }
}

module.exports = new AIKnowledgeService();
