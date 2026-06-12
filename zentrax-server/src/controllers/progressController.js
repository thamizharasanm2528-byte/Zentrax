const { db } = require('../middleware/auth');

// POST /api/progress/submit — Student submits progress
exports.submitProgress = async (req, res) => {
    try {
        const { projectId, description } = req.body;
        const studentId = req.user.uid;

        if (!description) {
            return res.status(400).json({ error: 'Description is required' });
        }

        const updateData = {
            student_id: studentId,
            project_id: projectId || null,
            description: description.trim(),
            created_at: new Date().toISOString()
        };

        const docRef = await db.collection('progress_updates').add(updateData);

        // Notify assigned mentor if exists
        // Find mentor from connections/chats
        const chatSnap = await db.collection('mentor_chats')
            .where('student_id', '==', studentId)
            .get();

        if (!chatSnap.empty) {
            for (const doc of chatSnap.docs) {
                const mentorId = doc.data().mentor_id;
                await db.collection('notifications').add({
                    userId: mentorId,
                    title: 'New Progress Update',
                    message: `A student submitted a progress update.`,
                    read: false,
                    created_at: new Date().toISOString()
                }).catch(() => {});
            }
        }

        res.status(201).json({ success: true, id: docRef.id, ...updateData });
    } catch (error) {
        console.error('Error submitting progress:', error);
        res.status(500).json({ error: 'Failed to submit progress' });
    }
};

// GET /api/progress/:studentId — Mentor views student progress
exports.getStudentProgress = async (req, res) => {
    try {
        const { studentId } = req.params;
        
        const snapshot = await db.collection('progress_updates')
            .where('student_id', '==', studentId)
            .orderBy('created_at', 'desc')
            .get();

        const updates = [];
        snapshot.forEach(doc => {
            updates.push({ id: doc.id, ...doc.data() });
        });

        res.status(200).json({ success: true, updates });
    } catch (error) {
        console.error('Error fetching progress updates:', error);
        res.status(200).json({ success: true, updates: [] });
    }
};
