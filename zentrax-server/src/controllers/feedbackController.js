const { db } = require('../middleware/auth');

// POST /api/feedback/give — Mentor gives feedback or assigns task
exports.giveFeedback = async (req, res) => {
    try {
        const { studentId, message, type } = req.body; // type: 'feedback' or 'task'
        const mentorId = req.user.uid;

        if (!studentId || !message || !type) {
            return res.status(400).json({ error: 'studentId, message, and type are required' });
        }

        const feedbackData = {
            mentor_id: mentorId,
            student_id: studentId,
            message: message.trim(),
            type,
            status: type === 'task' ? 'pending' : null,
            created_at: new Date().toISOString()
        };

        const docRef = await db.collection('mentor_feedback').add(feedbackData);

        // Notify student
        await db.collection('notifications').add({
            userId: studentId,
            title: type === 'task' ? 'New Task Assigned' : 'New Feedback Received',
            message: `Your mentor sent you ${type === 'task' ? 'a task' : 'feedback'}.`,
            read: false,
            created_at: new Date().toISOString()
        });

        res.status(201).json({ success: true, id: docRef.id, ...feedbackData });
    } catch (error) {
        console.error('Error giving feedback:', error);
        res.status(500).json({ error: 'Failed to give feedback' });
    }
};

// GET /api/feedback — Student views their feedback/tasks
exports.getStudentFeedback = async (req, res) => {
    try {
        const studentId = req.user.uid;

        const snapshot = await db.collection('mentor_feedback')
            .where('student_id', '==', studentId)
            .orderBy('created_at', 'desc')
            .get();

        const feedback = [];
        snapshot.forEach(doc => {
            feedback.push({ id: doc.id, ...doc.data() });
        });

        res.status(200).json({ success: true, feedback });
    } catch (error) {
        console.error('Error fetching feedback:', error);
        res.status(200).json({ success: true, feedback: [] });
    }
};

// PUT /api/feedback/task/:feedbackId — Mark task as done
exports.markTaskDone = async (req, res) => {
    try {
        const { feedbackId } = req.params;
        const studentId = req.user.uid;

        const docRef = db.collection('mentor_feedback').doc(feedbackId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Feedback/Task not found' });
        }

        const data = doc.data();
        if (data.student_id !== studentId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        if (data.type !== 'task') {
            return res.status(400).json({ error: 'This is not a task' });
        }

        await docRef.update({
            status: 'done',
            completed_at: new Date().toISOString()
        });

        // Notify mentor
        await db.collection('notifications').add({
            userId: data.mentor_id,
            title: 'Task Completed',
            message: `A student has completed the task: "${data.message.substring(0, 30)}..."`,
            read: false,
            created_at: new Date().toISOString()
        });

        res.status(200).json({ success: true, message: 'Task marked as done' });
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ error: 'Failed to update task' });
    }
};
