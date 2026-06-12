const { db } = require('../middleware/auth');
const { sendMentorNotificationEmail } = require('../services/emailService');

exports.submitDoubt = async (req, res) => {
    try {
        const { problemDescription, whatTried, screenshotUrl, projectId, attachments } = req.body;
        const studentId = req.user.uid;

        if (!problemDescription || !whatTried) {
            return res.status(400).json({ error: 'Problem description and what you tried are required' });
        }

        // Get student name
        let studentName = 'Student';
        try {
            const userDoc = await db.collection('users').doc(studentId).get();
            if (userDoc.exists) studentName = userDoc.data().name || 'Student';
        } catch {}

        // Get project title if projectId provided
        let projectTitle = null;
        if (projectId) {
            try {
                const proj = await db.collection('projects').doc(projectId).get();
                if (proj.exists) projectTitle = proj.data().title;
            } catch {}
        }

        const newDoubt = {
            studentId,
            studentName,
            mentorId: null,
            problemDescription,
            whatTried,
            projectId: projectId || null,
            projectTitle: projectTitle || null,
            screenshotUrl: screenshotUrl || null,
            attachments: Array.isArray(attachments) ? attachments : [],
            status: 'Open',
            createdAt: new Date().toISOString()
        };

        const docRef = await db.collection('doubts').add(newDoubt);

        // Send email to assigned mentor (if project has one)
        let emailSent = false;
        try {
            if (projectId) {
                const proj = await db.collection('projects').doc(projectId).get();
                if (proj.exists) {
                    const mentorId = proj.data().mentorId;
                    if (mentorId) {
                        const mentorDoc = await db.collection('users').doc(mentorId).get();
                        if (mentorDoc.exists) {
                            const m = mentorDoc.data();
                            emailSent = await sendMentorNotificationEmail({
                                mentorEmail: m.email,
                                mentorName: m.name || 'Mentor',
                                studentName,
                                projectName: projectTitle || 'N/A',
                                requestType: 'Student Query Submitted',
                                message: `A student has submitted a technical query that requires your review and guidance. Summary: ${problemDescription.substring(0, 200)}`
                            });
                        }
                    }
                }
            }
        } catch (emailErr) {
            console.error('[Email] Non-fatal error in doubt submission flow:', emailErr.message);
        }

        console.log(`[Email] Doubt email ${emailSent ? 'sent' : 'failed but doubt saved'}`);
        res.status(201).json({
            success: true,
            id: docRef.id,
            message: 'Doubt submitted successfully',
            emailSent,
            emailMessage: emailSent
                ? 'Email notification sent to the mentor'
                : projectId ? 'Doubt saved, but email notification could not be sent' : 'Doubt saved (no mentor assigned yet)',
            ...newDoubt
        });
    } catch (error) {
        console.error('Error submitting doubt:', error);
        res.status(500).json({ success: false, error: 'Failed to submit doubt' });
    }
};

exports.getDoubts = async (req, res) => {
    try {
        const { status, limit: queryLimit } = req.query;

        let query = db.collection('doubts');

        if (status) query = query.where('status', '==', status);

        const snapshot = await query.get();
        const doubts = [];

        snapshot.forEach(doc => {
            doubts.push({ id: doc.id, ...doc.data() });
        });

        doubts.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

        const result = queryLimit ? doubts.slice(0, parseInt(queryLimit)) : doubts;
        res.status(200).json({ success: true, data: { doubts: result } });
    } catch (error) {
        console.error('Error fetching doubts:', error);
        res.status(500).json({ error: 'Failed to fetch doubts' });
    }
};

// Get doubts for current student only
exports.getStudentDoubts = async (req, res) => {
    try {
        const studentId = req.user.uid;
        const snap = await db.collection('doubts')
            .where('studentId', '==', studentId).get();

        const doubts = [];
        snap.forEach(doc => doubts.push({ id: doc.id, ...doc.data() }));
        doubts.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        res.status(200).json({ success: true, data: { doubts } });
    } catch (error) {
        console.error('Error fetching student doubts:', error);
        res.status(200).json({ doubts: [] });
    }
};

exports.updateDoubtStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, response } = req.body;
        const mentorId = req.user.uid;

        const updateData = {
            status,
            mentorId,
            updatedAt: new Date().toISOString()
        };

        if (response) {
            updateData.mentorResponse = response;
        }

        await db.collection('doubts').doc(id).update(updateData);

        // Notify student and log activity
        const doubtDoc = await db.collection('doubts').doc(id).get();
        if (doubtDoc.exists) {
            const d = doubtDoc.data();
            
            // Notification
            await db.collection('notifications').add({
                userId: d.studentId,
                type: 'doubt_response',
                title: status === 'Resolved' ? 'Doubt Resolved' : 'Doubt Updated',
                message: response ? `Mentor replied: "${response.substring(0, 80)}..."` : `Your doubt status was updated to ${status}`,
                read: false,
                time: new Date().toISOString()
            }).catch(() => {});

            // Activity Log
            if (d.projectId) {
                const activityService = require('../services/activityService');
                await activityService.logActivity({
                    projectId: d.projectId,
                    userId: mentorId,
                    actionType: 'mentor_feedback',
                    message: response ? `Mentor provided feedback on a doubt.` : `Mentor updated doubt status to ${status}.`
                });
            }

            // Email notification to student
            try {
                let mentorName = 'Your Mentor';
                try {
                    const mentorDoc = await db.collection('users').doc(mentorId).get();
                    if (mentorDoc.exists) mentorName = mentorDoc.data().name || mentorName;
                } catch {}

                const studentDoc = await db.collection('users').doc(d.studentId).get();
                if (studentDoc.exists) {
                    const studentData = studentDoc.data();
                    const emailTitle = status === 'Resolved' ? 'Doubt Resolved! ✅' : 'Doubt Updated';
                    const emailMsg = response
                        ? `<strong>${mentorName}</strong> has responded to your doubt${d.projectTitle ? ` on "<strong>${d.projectTitle}</strong>"` : ''}:<br><br><em>"${response.substring(0, 300)}${response.length > 300 ? '...' : ''}"</em>`
                        : `Your doubt${d.projectTitle ? ` on "<strong>${d.projectTitle}</strong>"` : ''} has been updated to <strong>${status}</strong> by ${mentorName}.`;

                    await sendMentorNotificationEmail({
                        mentorEmail: studentData.email,
                        mentorName: studentData.name || 'Student',
                        studentName: mentorName,
                        projectName: d.projectTitle || 'N/A',
                        requestType: status === 'Resolved' ? 'Query Resolved' : 'Query Status Update',
                        message: response ? `Your mentor has provided the following response: ${response.substring(0, 200)}` : `Your query status has been updated to "${status}" by your assigned mentor.`
                    });
                }
            } catch (emailErr) {
                console.error('[Email Error] Failed to send doubt response email:', emailErr.message);
            }
        }

        res.status(200).json({ message: 'Doubt updated successfully' });
    } catch (error) {
        console.error('Error updating doubt:', error);
        res.status(500).json({ error: 'Failed to update doubt' });
    }
};

