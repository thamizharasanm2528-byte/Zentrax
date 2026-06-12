const { db } = require('../middleware/auth');

/**
 * Service for managing AI user preferences (style, language, stack).
 * Collection: ai_user_preferences | Document ID: userId
 */
class AIPreferenceService {
    /**
     * Default preferences for new users.
     */
    getDefaultPreferences() {
        return {
            prefers_step_by_step: false,
            prefers_short_answers: false,
            prefers_code_only: false,
            preferred_language: 'English',
            preferred_stack: 'MERN (React/Node.js/Express/MongoDB)'
        };
    }

    /**
     * Fetches preferences for a specific user.
     */
    async getPreferences(userId) {
        try {
            const doc = await db.collection('ai_user_preferences').doc(userId).get();
            if (!doc.exists) {
                return this.getDefaultPreferences();
            }
            return {
                ...this.getDefaultPreferences(),
                ...doc.data()
            };
        } catch (error) {
            console.error('[AI Prefs] Fetch error:', error.message);
            return this.getDefaultPreferences();
        }
    }

    /**
     * Updates/Sets preferences for a user.
     */
    async setPreferences(userId, preferences) {
        try {
            await db.collection('ai_user_preferences').doc(userId).set({
                ...preferences,
                updated_at: new Date().toISOString()
            }, { merge: true });
            return true;
        } catch (error) {
            console.error('[AI Prefs] Update error:', error.message);
            return false;
        }
    }
}

module.exports = new AIPreferenceService();
