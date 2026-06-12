const { db } = require('../middleware/auth');

/**
 * ActivityService — Tracks project-level actions for the timeline.
 */
class ActivityService {
    /**
     * Logs a new activity for a project.
     * @param {Object} params
     * @param {string} params.projectId
     * @param {string} params.userId
     * @param {string} params.actionType — 'task_created', 'task_completed', 'member_joined', 'mentor_feedback', 'project_created'
     * @param {string} params.message
     */
    async logActivity({ projectId, userId, actionType, message }) {
        try {
            if (!projectId) return;

            const activityData = {
                projectId,
                userId,
                actionType,
                message,
                timestamp: new Date().toISOString()
            };

            await db.collection('project_activity').add(activityData);
            console.log(`[Activity] Logged ${actionType} for project ${projectId}`);
        } catch (error) {
            console.error('[Activity] Failed to log activity:', error.message);
        }
    }

    /**
     * Fetches activity for a project.
     */
    async getProjectActivity(projectId, limit = 50) {
        try {
            const snapshot = await db.collection('project_activity')
                .where('projectId', '==', projectId)
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .get();

            const activities = [];
            snapshot.forEach(doc => activities.push({ id: doc.id, ...doc.data() }));
            return activities;
        } catch (error) {
            console.error('[Activity] Failed to fetch activity:', error.message);
            return [];
        }
    }
}

module.exports = new ActivityService();
