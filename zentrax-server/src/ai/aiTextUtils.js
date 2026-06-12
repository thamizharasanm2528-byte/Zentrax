/**
 * Shared text utilities for the AI module.
 *
 * Centralizes keyword extraction and stopword filtering
 * used by aiMistakeMemoryService, aiCorrectionRetrievalService, and aiKnowledgeService.
 */

const STOPWORDS = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over',
    'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
    'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
    'same', 'so', 'than', 'too', 'very', 'just', 'because', 'but', 'and',
    'or', 'if', 'while', 'about', 'what', 'which', 'who', 'whom', 'this',
    'that', 'these', 'those', 'i', 'me', 'my', 'we', 'our', 'you', 'your',
    'he', 'him', 'his', 'she', 'her', 'it', 'its', 'they', 'them', 'their',
    'help', 'please', 'want', 'need', 'know', 'tell', 'show', 'explain',
    'give', 'make', 'get', 'use', 'try', 'like', 'think', 'work',
]);

/**
 * Extracts meaningful keywords from text after removing stopwords.
 * @param {string} text — raw input text
 * @returns {string[]} — array of lowercase keywords (min length 3)
 */
function extractKeywords(text) {
    return (text || '').toLowerCase()
        .replace(/[^a-z0-9\s.-]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !STOPWORDS.has(w));
}

/**
 * Updates `last_used_at` on a batch of ai_memory documents.
 * Fire-and-forget — caller should .catch(() => {}).
 * @param {object} db — Firestore db reference
 * @param {string[]} memoryIds — array of memory doc IDs
 */
async function touchMemoriesLastUsed(db, memoryIds) {
    if (!memoryIds || memoryIds.length === 0) return;
    const now = new Date().toISOString();
    const batch = db.batch();
    for (const id of memoryIds) {
        batch.update(db.collection('ai_memory').doc(id), { last_used_at: now });
    }
    await batch.commit();
}

module.exports = { extractKeywords, touchMemoriesLastUsed, STOPWORDS };
