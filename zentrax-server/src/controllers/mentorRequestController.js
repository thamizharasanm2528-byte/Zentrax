const { db } = require('../middleware/auth');
const emailService = require('../services/emailService');

// POST /api/mentor/request — Student sends a mentorship request
exports.sendRequest = async (req, res) => {
    try {
        const { mentorId, message, projectId } = req.body;
        const studentId = req.user.uid;

        if (!mentorId) {
            return res.status(400).json({ error: 'mentorId is required' });
        }

        // Check if a request already exists
        const existing = await db.collection('mentor_requests')
            .where('student_id', '==', studentId)
            .where('mentor_id', '==', mentorId)
            .where('status', '==', 'pending')
            .get();

        if (!existing.empty) {
            return res.status(400).json({ error: 'A pending request already exists for this mentor' });
        }

        // Optional: Verify project ownership if projectId provided
        if (projectId) {
            const projDoc = await db.collection('projects').doc(projectId).get();
            if (!projDoc.exists) {
                return res.status(404).json({ error: 'Selected project not found' });
            }
            const projData = projDoc.data();
            const ownerId = projData.createdBy || projData.authorId || projData.owner_id;
            if (ownerId !== studentId) {
                return res.status(403).json({ error: 'You do not have permission to assign mentor to this project' });
            }
        }

        const requestData = {
            student_id: studentId,
            mentor_id: mentorId,
            projectId: projectId || null,
            message: message || '',
            status: 'pending',
            created_at: new Date().toISOString()
        };

        const docRef = await db.collection('mentor_requests').add(requestData);

        // Create notification for mentor (In-app + Email)
        await db.collection('notifications').add({
            userId: mentorId,
            title: 'New Mentor Request',
            message: `A student has requested you as their mentor.`,
            read: false,
            created_at: new Date().toISOString()
        });

        // Trigger Email Notification to Mentor
        try {
            const studentDoc = await db.collection('users').doc(studentId).get();
            const mentorDoc = await db.collection('users').doc(mentorId).get();
            if (studentDoc.exists && mentorDoc.exists) {
                const studentName = studentDoc.data().name || 'A student';
                const mentorData = mentorDoc.data();
                await emailService.sendNotificationEmail({
                    recipientEmail: mentorData.email,
                    recipientName: mentorData.name || 'Mentor',
                    subject: `Mentorship Request from ${studentName} — ZENTRAX`,
                    title: 'New Mentorship Request',
                    message: `<strong>${studentName}</strong> has submitted a formal request for your mentorship on the ZENTRAX platform. Please visit your dashboard to review the student's profile, project details, and respond to the request at your earliest convenience.`,
                    ctaLabel: 'Review Request',
                    ctaLink: `http://localhost:5173/mentor/analytics`
                });
            }
        } catch (emailErr) {
            console.error('[Email Error] Failed to send mentor request notification:', emailErr.message);
        }

        res.status(201).json({ success: true, id: docRef.id, ...requestData });
    } catch (error) {
        console.error('Error sending mentor request:', error);
        res.status(500).json({ error: 'Failed to send request' });
    }
};

// GET /api/mentor/requests — Get requests for user
exports.getRequests = async (req, res) => {
    try {
        const userId = req.user.uid;
        const { role } = req.query; // 'student' or 'mentor'
        
        let query = db.collection('mentor_requests');
        
        if (role === 'student') {
            query = query.where('student_id', '==', userId);
        } else {
            query = query.where('mentor_id', '==', userId);
        }

        const snapshot = await query.get();
        const requests = [];
        
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const otherId = role === 'student' ? data.mentor_id : data.student_id;
            
            // Enrich with user info
            const userDoc = await db.collection('users').doc(otherId).get();
            const userData = userDoc.exists ? userDoc.data() : { name: 'Unknown User' };
            
            requests.push({
                id: doc.id,
                ...data,
                otherUser: {
                    name: userData.name,
                    email: userData.email,
                    profilePicture: userData.profilePicture
                }
            });
        }

        requests.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
        res.status(200).json({ success: true, requests });
    } catch (error) {
        console.error('Error fetching requests:', error);
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
};

// PUT /api/mentor/request/:requestId — Update request status (Accept/Reject)
exports.updateRequestStatus = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { status } = req.body; // 'accepted' or 'rejected'
        const mentorId = req.user.uid;

        if (!['accepted', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const reqRef = db.collection('mentor_requests').doc(requestId);
        const reqDoc = await reqRef.get();

        if (!reqDoc.exists) {
            return res.status(404).json({ error: 'Request not found' });
        }

        const data = reqDoc.data();
        if (data.mentor_id !== mentorId) {
            return res.status(403).json({ error: 'Not authorized to update this request' });
        }

        await reqRef.update({ status, updated_at: new Date().toISOString() });

        // If accepted, create a connection/chat
        if (status === 'accepted') {
            const { FieldValue } = require('firebase-admin/firestore');
            
            // 1. Add mentor to project members if projectId exists
            if (data.projectId) {
                try {
                    await db.collection('projects').doc(data.projectId).update({
                        members: FieldValue.arrayUnion(mentorId)
                    });
                    console.log(`[Mentor Assignment] Added mentor ${mentorId} to project ${data.projectId}`);
                } catch (err) {
                    console.error('[Mentor Assignment] Failed to add mentor to project members:', err.message);
                }
            }

            // 2. Check if chat already exists
            const chatSnap = await db.collection('mentor_chats')
                .where('student_id', '==', data.student_id)
                .where('mentor_id', '==', mentorId)
                .get();

            if (chatSnap.empty) {
                await db.collection('mentor_chats').add({
                    student_id: data.student_id,
                    mentor_id: mentorId,
                    last_message: 'Connection established',
                    updated_at: new Date().toISOString()
                });
            }

            // 3. Notify student (In-app + Email)
            await db.collection('notifications').add({
                userId: data.student_id,
                title: 'Mentor Request Accepted!',
                message: `Your mentor request has been accepted. You can now chat!`,
                read: false,
                created_at: new Date().toISOString(),
                metadata: { projectId: data.projectId, mentorId }
            });

            // Trigger Email Notification to Student
            try {
                const studentDoc = await db.collection('users').doc(data.student_id).get();
                const mentorDoc = await db.collection('users').doc(mentorId).get();
                if (studentDoc.exists && mentorDoc.exists) {
                    const studentData = studentDoc.data();
                    const mentorName = mentorDoc.data().name || 'Your mentor';
                    await emailService.sendNotificationEmail({
                        recipientEmail: studentData.email,
                        recipientName: studentData.name || 'Student',
                        subject: `Mentorship Approved — ${mentorName}`,
                        title: 'Mentorship Request Approved',
                        message: `We are pleased to inform you that <strong>${mentorName}</strong> has accepted your mentorship request. You now have direct access to communicate with your mentor through the platform. We encourage you to begin your collaboration by visiting the project workspace.`,
                        ctaLabel: 'Go to Workspace',
                        ctaLink: data.projectId ? `http://localhost:5173/project/${data.projectId}` : `http://localhost:5173/dashboard`
                    });
                }
            } catch (emailErr) {
                console.error('[Email Error] Failed to send mentor acceptance notification:', emailErr.message);
            }
        }

        res.status(200).json({ success: true, message: `Request ${status}` });
    } catch (error) {
        console.error('Error updating request:', error);
        res.status(500).json({ error: 'Failed to update request' });
    }
};
