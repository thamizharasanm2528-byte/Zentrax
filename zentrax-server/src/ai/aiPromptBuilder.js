/**
 * AI Prompt Builder
 *
 * Dedicated module that assembles the final system prompt from structured
 * context layers:
 *
 *   Layer 1 — Base system prompt  (always included, never trimmed)
 *   Layer 2 — User preferences    (small, always included if present)
 *   Layer 3 — Past corrections    (budget-capped, highest confidence first)
 *   Layer 4 — Knowledge context   (budget-capped, fills remaining space)
 *
 * Character budgets prevent the prompt from overloading the model's context
 * window.  Each layer has an independent cap AND there is a global ceiling.
 *
 * This module is pure logic — no Firestore calls, no side effects —
 * making it easy to test and reason about.
 */

/* ─── Budget Constants ──────────────────────────────────────────
 *  Llama-3.3-70b-versatile has ~128k context, but we keep the
 *  system prompt lean so the model has room for conversation
 *  history + response.  1 token ≈ 4 chars.
 * ─────────────────────────────────────────────────────────────── */
const BUDGET = {
    // Max characters for the ENTIRE system prompt (all layers combined)
    TOTAL_SYSTEM_MAX: 6000,

    // Per-layer caps (characters)
    PREFERENCES_MAX: 500,
    CORRECTIONS_MAX: 2000,
    KNOWLEDGE_MAX: 1500,

    // Max number of correction items to include
    CORRECTIONS_ITEM_LIMIT: 5,
};

class AIPromptBuilder {

    /**
     * Builds the complete messages array for the Groq chat completion API.
     *
     * @param {object}   ctx
     * @param {string}   ctx.basePrompt       — ZENTRAX-AI system persona (required)
     * @param {object}   ctx.preferences      — user preference object (optional)
     * @param {string}   ctx.corrections      — formatted correction context (optional)
     * @param {string}   ctx.knowledge        — RAG knowledge context (optional)
     * @param {object[]} ctx.history          — conversation history messages (optional)
     * @param {string}   ctx.userMessage      — current user message (required)
     * @returns {object[]} — OpenAI-format messages array
     */
    build(ctx) {
        const {
            basePrompt,
            preferences = null,
            corrections = '',
            knowledge = '',
            history = [],
            userMessage,
        } = ctx;

        // 1. Start with the base prompt (never trimmed)
        let systemContent = basePrompt;

        // 2. Append preference layer
        const prefBlock = this._buildPreferenceBlock(preferences);
        if (prefBlock) {
            systemContent += prefBlock;
        }

        // 3. Append corrections layer (budget-capped)
        const corrBlock = this._buildCorrectionBlock(corrections);
        if (corrBlock) {
            systemContent += corrBlock;
        }

        // 4. Append knowledge layer (fills remaining budget)
        const remaining = BUDGET.TOTAL_SYSTEM_MAX - systemContent.length;
        const knowBlock = this._buildKnowledgeBlock(knowledge, remaining);
        if (knowBlock) {
            systemContent += knowBlock;
        }

        // 5. Final safety trim (should rarely trigger)
        if (systemContent.length > BUDGET.TOTAL_SYSTEM_MAX) {
            systemContent = systemContent.substring(0, BUDGET.TOTAL_SYSTEM_MAX);
            console.warn(`[PromptBuilder] System prompt trimmed to ${BUDGET.TOTAL_SYSTEM_MAX} chars`);
        }

        // 6. Assemble messages array
        const messages = [
            { role: 'system', content: systemContent },
            ...history,
            { role: 'user', content: userMessage },
        ];

        return messages;
    }

    /**
     * Returns a debug summary of what was included in the prompt.
     * Useful for logging without leaking full prompt content.
     */
    summarize(ctx) {
        const parts = ['base'];
        if (ctx.preferences) parts.push('preferences');
        if (ctx.corrections) parts.push(`corrections(${ctx.corrections.split('\n').length} items)`);
        if (ctx.knowledge) parts.push('knowledge');
        parts.push(`history(${(ctx.history || []).length} msgs)`);
        return parts.join(' + ');
    }

    /* ─── Layer Builders ──────────────────────────────────────── */

    /**
     * Layer 2: User Preferences → style guide instructions
     */
    _buildPreferenceBlock(prefs) {
        if (!prefs) return '';

        const lines = [];

        if (prefs.prefers_step_by_step) {
            lines.push('- Provide clear, numbered step-by-step instructions.');
        }
        if (prefs.prefers_short_answers) {
            lines.push('- Keep responses extremely concise and to the point.');
        }
        if (prefs.prefers_code_only) {
            lines.push('- Strictly provide ONLY code blocks with minimal text explanation.');
        }
        if (prefs.preferred_language && prefs.preferred_language !== 'English') {
            lines.push(`- Respond primarily in: ${prefs.preferred_language}.`);
        }
        if (prefs.preferred_stack) {
            lines.push(`- Assume the user works with: ${prefs.preferred_stack}.`);
        }

        if (lines.length === 0) return '';

        let block = '\n\n### USER STYLE GUIDE (Strictly adhere to this):\n' + lines.join('\n');

        // Cap to budget
        if (block.length > BUDGET.PREFERENCES_MAX) {
            block = block.substring(0, BUDGET.PREFERENCES_MAX);
        }

        return block;
    }

    /**
     * Layer 3: Past Corrections → mistake avoidance context
     *
     * Input is already a formatted string from aiCorrectionRetrievalService.
     * We apply a character cap and item limit here.
     */
    _buildCorrectionBlock(corrections) {
        if (!corrections || corrections.trim().length === 0) return '';

        // Item limit: take only top N lines
        let lines = corrections.split('\n').filter(l => l.trim());
        if (lines.length > BUDGET.CORRECTIONS_ITEM_LIMIT) {
            lines = lines.slice(0, BUDGET.CORRECTIONS_ITEM_LIMIT);
        }

        let body = lines.join('\n');

        // Character cap
        if (body.length > BUDGET.CORRECTIONS_MAX) {
            // Trim from the end (lowest-priority corrections)
            body = body.substring(0, BUDGET.CORRECTIONS_MAX);
            // Clean up to last complete line
            const lastNewline = body.lastIndexOf('\n');
            if (lastNewline > 0) {
                body = body.substring(0, lastNewline);
            }
        }

        if (body.trim().length === 0) return '';

        return '\n\n### KNOWN CORRECTIONS (Apply these — do NOT repeat past mistakes):\n'
             + 'Incorporate these verified corrections when relevant:\n'
             + body;
    }

    /**
     * Layer 4: Knowledge Context → RAG enrichment
     *
     * This gets the leftover budget after base + prefs + corrections.
     */
    _buildKnowledgeBlock(knowledge, remainingBudget) {
        if (!knowledge || knowledge.trim().length === 0) return '';

        const cap = Math.min(BUDGET.KNOWLEDGE_MAX, Math.max(remainingBudget - 80, 0)); // 80 chars for header
        if (cap <= 0) return '';

        let body = knowledge;
        if (body.length > cap) {
            body = body.substring(0, cap);
            // Clean up to last complete sentence or line
            const lastPeriod = body.lastIndexOf('.');
            const lastNewline = body.lastIndexOf('\n');
            const cutPoint = Math.max(lastPeriod, lastNewline);
            if (cutPoint > cap * 0.5) {
                body = body.substring(0, cutPoint + 1);
            }
        }

        if (body.trim().length === 0) return '';

        return '\n\nRelevant knowledge context (use this to enrich your answer):\n' + body;
    }
}

module.exports = new AIPromptBuilder();
