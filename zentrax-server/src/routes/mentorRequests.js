const express = require('express');
const router = express.Router();
const { db, verifyToken, requireRole } = require('../middleware/auth');
const { sendMentorNotificationEmail } = require('../services/emailService');
const { mentorRequestLimiter } = require('../middleware/rateLimiters');

// POST /api/mentor/request — Student sends a mentorship request
router.post('/request', verifyToken, requireRole('student'), mentorRequestLimiter, async (req, res) => {
    try {
        const { mentorId, projectId, message } = req.body;
        const studentId = req.user.uid;

        if (!mentorId || !projectId) {
            return res.status(400).json({ error: 'mentorId and projectId are required' });
        }

        // Check for existing pending request
        // Uses composite index: student_id + mentor_id + project_id + status
        console.log(`[Mentor Requests] Checking duplicate request: student=${studentId}, mentor=${mentorId}, project=${projectId}`);
        const existing = await db.collection('mentorship_requests')
            .where('student_id', '==', studentId)
            .where('mentor_id', '==', mentorId)
            .where('project_id', '==', projectId)
            .where('status', '==', 'pending')
            .get();

        if (!existing.empty) {
            return res.status(400).json({ error: 'A pending request already exists for this mentor and project' });
        }

        const requestData = {
            student_id: studentId,
            mentor_id: mentorId,
            project_id: projectId,
            message: message || '',
            status: 'pending',
            created_at: new Date().toISOString()
        };

        const docRef = await db.collection('mentorship_requests').add(requestData);
        console.log(`[Mentor Requests] Created request ${docRef.id}`);

        // Get project title for the notification
        let projectTitle = 'a project';
        try {
            const projDoc = await db.collection('projects').doc(projectId).get();
            if (projDoc.exists) projectTitle = projDoc.data().title || projectTitle;
        } catch (e) { }

        // Create notification for the mentor
        await db.collection('notifications').add({
            userId: mentorId,
            type: 'mentor',
            title: 'New Mentorship Request',
            message: `A student is requesting your guidance on "${projectTitle}".`,
            read: false,
            time: new Date().toISOString(),
            metadata: { requestId: docRef.id, projectId, studentId }
        });

        // Send email notification to mentor
        let emailSent = false;
        try {
            const mentorDoc = await db.collection('users').doc(mentorId).get();
            if (mentorDoc.exists) {
                const mentorData = mentorDoc.data();
                let studentName = 'A student';
                try {
                    const sDoc = await db.collection('users').doc(studentId).get();
                    if (sDoc.exists) studentName = sDoc.data().name || studentName;
                } catch {}
                emailSent = await sendMentorNotificationEmail({
                    mentorEmail: mentorData.email,
                    mentorName: mentorData.name || 'Mentor',
                    studentName,
                    projectName: projectTitle,
                    requestType: 'Mentorship Request',
                    message: message || 'A student has formally requested your mentorship and guidance for their project.'
                });
            }
        } catch (emailErr) {
            console.error('[Email] Non-fatal error in mentor request flow:', emailErr.message);
        }

        console.log(`[Email] Mentor request email ${emailSent ? 'sent' : 'failed but request saved'}`);
        res.status(201).json({
            success: true,
            id: docRef.id,
            message: 'Mentor request submitted successfully',
            emailSent,
            emailMessage: emailSent
                ? 'Notification email sent to mentor'
                : 'Request saved, but email notification could not be sent',
            ...requestData
        });
    } catch (error) {
        console.error('[Firestore] Failed to send mentorship request', {
            collection: 'mentorship_requests',
            uid: req.user?.uid,
            error: error.message
        });
        res.status(500).json({ success: false, error: 'Failed to send mentorship request' });
    }
});

// GET /api/mentor/requests — Get mentorship requests (for mentors: incoming, for students: sent)
router.get('/requests', verifyToken, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { role } = req.query;

        console.log(`[Mentor Requests] Fetching requests for ${role || 'mentor'} ${userId}`);

        let snapshot;
        if (role === 'student') {
            snapshot = await db.collection('mentorship_requests')
                .where('student_id', '==', userId)
                .get();
        } else {
            snapshot = await db.collection('mentorship_requests')
                .where('mentor_id', '==', userId)
                .get();
        }

        const requests = [];
        snapshot.forEach(doc => { requests.push({ id: doc.id, ...doc.data() }); });

        // Sort by most recent first
        requests.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

        console.log(`[Mentor Requests] Found ${requests.length} requests for ${role || 'mentor'} ${userId}`);

        // Enrich with project and user info
        for (let request of requests) {
            try {
                const projDoc = await db.collection('projects').doc(request.project_id).get();
                if (projDoc.exists) request.projectTitle = projDoc.data().title;
            } catch (e) { }
            try {
                const studentDoc = await db.collection('users').doc(request.student_id).get();
                if (studentDoc.exists) {
                    request.studentName = studentDoc.data().name;
                    request.studentId = request.student_id;
                }
                const mentorDoc = await db.collection('users').doc(request.mentor_id).get();
                if (mentorDoc.exists) {
                    request.mentorName = mentorDoc.data().name;
                    request.mentorId = request.mentor_id;
                }
                const userDoc = await db.collection('users').doc(role === 'student' ? request.mentor_id : request.student_id).get();
                if (userDoc.exists) request.otherUserName = userDoc.data().name;
            } catch (e) { }
        }

        res.status(200).json({ requests });
    } catch (error) {
        console.error('[Firestore] Failed to fetch mentorship requests', {
            collection: 'mentorship_requests',
            uid: req.user?.uid,
            error: error.message
        });
        res.status(200).json({ requests: [] });
    }
});

// PUT /api/mentor/accept — Mentor accepts a request
router.put('/accept', verifyToken, requireRole('mentor'), async (req, res) => {
    try {
        const { requestId } = req.body;
        const mentorId = req.user.uid;

        if (!requestId) return res.status(400).json({ error: 'requestId is required' });

        const reqRef = db.collection('mentorship_requests').doc(requestId);
        const reqDoc = await reqRef.get();

        if (!reqDoc.exists) return res.status(404).json({ error: 'Request not found' });

        const data = reqDoc.data();
        if (data.mentor_id !== mentorId) return res.status(403).json({ error: 'Not your request' });

        // Update request status
        await reqRef.update({ status: 'accepted', accepted_at: new Date().toISOString() });

        // Add mentor to project members
        const { FieldValue } = require('firebase-admin/firestore');
        await db.collection('projects').doc(data.project_id).update({
            mentorId: mentorId,
            members: FieldValue.arrayUnion(mentorId)
        });

        // Notify the student
        let mentorName = 'A mentor';
        try {
            const mentorDoc = await db.collection('users').doc(mentorId).get();
            if (mentorDoc.exists) mentorName = mentorDoc.data().name || mentorName;
        } catch (e) { }

        await db.collection('notifications').add({
            userId: data.student_id,
            type: 'mentor',
            title: 'Mentorship Request Accepted! 🎉',
            message: `${mentorName} has accepted your mentorship request and joined your project.`,
            read: false,
            time: new Date().toISOString(),
            metadata: { requestId, projectId: data.project_id }
        });

        // Send email to student
        let emailSent = false;
        try {
            const studentDoc = await db.collection('users').doc(data.student_id).get();
            if (studentDoc.exists) {
                const s = studentDoc.data();
                let projectTitle = 'your project';
                try {
                    const pDoc = await db.collection('projects').doc(data.project_id).get();
                    if (pDoc.exists) projectTitle = pDoc.data().title || projectTitle;
                } catch {}
                emailSent = await sendMentorNotificationEmail({
                    mentorEmail: s.email,
                    mentorName: s.name || 'Student',
                    studentName: mentorName,
                    projectName: projectTitle,
                    requestType: 'Mentorship Request Approved',
                    message: `We are pleased to inform you that ${mentorName} has accepted your mentorship request and has been assigned to your project. You may now collaborate directly with your mentor through the platform.`
                });
            }
        } catch (emailErr) {
            console.error('[Email] Non-fatal error in accept flow:', emailErr.message);
        }

        console.log(`[Email] Acceptance email ${emailSent ? 'sent to student' : 'failed but action saved'}`);
        console.log(`[Mentor Requests] Accepted request ${requestId} by mentor ${mentorId}`);
        res.status(200).json({
            success: true,
            message: 'Request accepted, mentor added to project',
            emailSent,
            emailMessage: emailSent ? 'Acceptance email sent to the student' : 'Request accepted, but email could not be sent'
        });
    } catch (error) {
        console.error('[Firestore] Failed to accept mentorship request', {
            requestId: req.body?.requestId,
            uid: req.user?.uid,
            error: error.message
        });
        res.status(500).json({ success: false, error: 'Failed to accept request' });
    }
});

// PUT /api/mentor/reject — Mentor rejects a request
router.put('/reject', verifyToken, requireRole('mentor'), async (req, res) => {
    try {
        const { requestId } = req.body;
        const mentorId = req.user.uid;

        if (!requestId) return res.status(400).json({ error: 'requestId is required' });

        const reqRef = db.collection('mentorship_requests').doc(requestId);
        const reqDoc = await reqRef.get();

        if (!reqDoc.exists) return res.status(404).json({ error: 'Request not found' });

        const data = reqDoc.data();
        if (data.mentor_id !== mentorId) return res.status(403).json({ error: 'Not your request' });

        await reqRef.update({ status: 'rejected', rejected_at: new Date().toISOString() });

        // Notify the student
        await db.collection('notifications').add({
            userId: data.student_id,
            type: 'mentor',
            title: 'Mentorship Request Updated',
            message: 'Your mentorship request was not accepted. Try reaching out to another mentor.',
            read: false,
            time: new Date().toISOString(),
            metadata: { requestId }
        });

        // Send email to student
        let emailSent = false;
        try {
            const studentDoc = await db.collection('users').doc(data.student_id).get();
            if (studentDoc.exists) {
                const s = studentDoc.data();
                emailSent = await sendMentorNotificationEmail({
                    mentorEmail: s.email,
                    mentorName: s.name || 'Student',
                    studentName: 'Mentorship Team',
                    projectName: 'N/A',
                    requestType: 'Mentorship Request Update',
                    message: 'Thank you for your interest in mentorship. Unfortunately, the mentor is unable to accept your request at this time. We encourage you to explore other available mentors on the platform who may be well-suited to support your project.'
                });
            }
        } catch (emailErr) {
            console.error('[Email] Non-fatal error in reject flow:', emailErr.message);
        }

        console.log(`[Email] Rejection email ${emailSent ? 'sent to student' : 'failed but action saved'}`);
        console.log(`[Mentor Requests] Rejected request ${requestId} by mentor ${mentorId}`);
        res.status(200).json({
            success: true,
            message: 'Request rejected',
            emailSent,
            emailMessage: emailSent ? 'Rejection email sent to the student' : 'Request rejected, but email could not be sent'
        });
    } catch (error) {
        console.error('[Firestore] Failed to reject mentorship request', {
            requestId: req.body?.requestId,
            uid: req.user?.uid,
            error: error.message
        });
        res.status(500).json({ success: false, error: 'Failed to reject request' });
    }
});

// DELETE /api/mentor/request/:requestId — Student withdraws a request
router.delete('/request/:requestId', verifyToken, requireRole('student'), async (req, res) => {
    try {
        const { requestId } = req.params;
        const studentId = req.user.uid;

        console.log(`[Mentor Requests] Withdrawing request: id=${requestId}, student=${studentId}`);
        const reqRef = db.collection('mentorship_requests').doc(requestId);
        const reqDoc = await reqRef.get();

        if (!reqDoc.exists) {
            return res.status(404).json({ error: 'Request not found' });
        }

        const data = reqDoc.data();
        if (data.student_id !== studentId) {
            return res.status(403).json({ error: 'Not authorized to withdraw this request' });
        }

        await reqRef.delete();
        console.log(`[Mentor Requests] Successfully withdrawn request ${requestId}`);
        res.status(200).json({ success: true, message: 'Request withdrawn successfully' });
    } catch (error) {
        console.error('[Firestore] Failed to withdraw mentorship request', {
            requestId: req.params.requestId,
            uid: req.user?.uid,
            error: error.message
        });
        res.status(500).json({ success: false, error: 'Failed to withdraw request' });
    }
});

// GET /api/mentor/list — Get all available mentors
router.get('/list', verifyToken, async (req, res) => {
    console.log(`[Mentor Requests] Fetching mentor list`);
    try {
        const snapshot = await db.collection('users')
            .where('role', '==', 'mentor')
            .get();

        const mentors = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            mentors.push({
                id: doc.id,
                name: data.name,
                email: data.email,
                skills: data.skills || [],
                bio: data.bio || '',
                profilePicture: data.profilePicture || null,
                availability: data.availability || 'Available',
                college: data.college || '',
                experienceLevel: data.experienceLevel || ''
            });
        });

        console.log(`[Mentor Requests] Found ${mentors.length} mentors`);
        
        // Debug: if no mentors found, log all distinct roles in users collection
        if (mentors.length === 0) {
            const allUsers = await db.collection('users').get();
            const roles = {};
            allUsers.forEach(doc => {
                const r = doc.data().role || 'undefined';
                roles[r] = (roles[r] || 0) + 1;
            });
            console.log(`[Mentor Requests] DEBUG — No mentors found. User roles in DB:`, roles);
        }

        res.status(200).json({ mentors });
    } catch (error) {
        console.error('[Firestore] Failed to fetch mentor list', {
            collection: 'users',
            error: error.message
        });
        res.status(200).json({ mentors: [] });
    }
});

module.exports = router;
