const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { db, verifyToken, requireRole } = require('../middleware/auth');
const { sendMentorNotificationEmail } = require('../services/emailService');
const { sessionLimiter } = require('../middleware/rateLimiters');

// POST /api/mentor-sessions — Student creates session request
router.post('/', verifyToken, requireRole('student'), sessionLimiter, async (req, res) => {
    try {
        const { mentorId, projectId, projectTitle, topic, summary, preferredDate, preferredTime, sessionType } = req.body;
        const studentId = req.user.uid;

        if (!mentorId || !topic || !sessionType) {
            return res.status(400).json({ error: 'mentorId, topic, and sessionType are required' });
        }

        // Get student name
        let studentName = 'Student';
        try {
            const userDoc = await db.collection('users').doc(studentId).get();
            if (userDoc.exists) studentName = userDoc.data().name || 'Student';
        } catch {}

        const session = {
            studentId,
            studentName,
            mentorId,
            projectId: projectId || null,
            projectTitle: projectTitle || null,
            topic,
            summary: summary || '',
            preferredDate: preferredDate || null,
            preferredTime: preferredTime || null,
            sessionType,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        const docRef = await db.collection('mentor_sessions').add(session);

        // Notify mentor
        await db.collection('notifications').add({
            userId: mentorId,
            type: 'session_request',
            title: 'New Session Request',
            message: `${studentName} requested a ${sessionType} session: ${topic}`,
            read: false,
            time: new Date().toISOString()
        }).catch(() => {});

        // Send email notification to mentor
        let emailSent = false;
        try {
            const mentorDoc = await db.collection('users').doc(mentorId).get();
            if (mentorDoc.exists) {
                const m = mentorDoc.data();
                emailSent = await sendMentorNotificationEmail({
                    mentorEmail: m.email,
                    mentorName: m.name || 'Mentor',
                    studentName,
                    projectName: projectTitle || 'N/A',
                    requestType: `Mentoring Session Request (${sessionType})`,
                    message: `A student has requested a ${sessionType} mentoring session on the topic: "${topic}".${summary ? ' Summary: ' + summary : ''}${preferredDate ? ' Preferred schedule: ' + preferredDate : ''}${preferredTime ? ' at ' + preferredTime : ''}. Please review and respond to this request at your earliest convenience.`
                });
            }
        } catch (emailErr) {
            console.error('[Email] Non-fatal error in session request flow:', emailErr.message);
        }

        console.log(`[Email] Session request email ${emailSent ? 'sent' : 'failed but session saved'}`);
        res.status(201).json({
            success: true,
            id: docRef.id,
            message: 'Session request sent successfully',
            emailSent,
            emailMessage: emailSent
                ? 'The mentor has been notified by email'
                : 'Session request saved, but email notification could not be sent',
            ...session
        });
    } catch (error) {
        console.error('Error creating session:', error);
        res.status(500).json({ success: false, error: 'Failed to create session request' });
    }
});

// GET /api/mentor-sessions — List sessions for current user
router.get('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { role } = req.query;

        const sessionsMap = {};

        // 1. Query by primary field (studentId or mentorId)
        const field = role === 'mentor' ? 'mentorId' : 'studentId';
        const snap1 = await db.collection('mentor_sessions')
            .where(field, '==', userId).get();
        snap1.forEach(doc => { sessionsMap[doc.id] = { id: doc.id, ...doc.data() }; });

        // 2. Also query by participantIds (for team members)
        if (role !== 'mentor') {
            const snap2 = await db.collection('mentor_sessions')
                .where('participantIds', 'array-contains', userId).get();
            snap2.forEach(doc => { sessionsMap[doc.id] = { id: doc.id, ...doc.data() }; });
        }

        // Enrich with mentor name
        const sessions = Object.values(sessionsMap);
        const mentorIds = [...new Set(sessions.filter(s => s.mentorId).map(s => s.mentorId))];
        const mentorNames = {};
        for (const mid of mentorIds) {
            try {
                const mDoc = await db.collection('users').doc(mid).get();
                if (mDoc.exists) mentorNames[mid] = mDoc.data().name || 'Mentor';
            } catch { /* skip */ }
        }
        sessions.forEach(s => { s.mentorName = mentorNames[s.mentorId] || null; });
        sessions.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

        res.status(200).json({ sessions });
    } catch (error) {
        console.error('Error fetching sessions:', error);
        res.status(200).json({ sessions: [] });
    }
});

// PUT /api/mentor-sessions/:id/status — Mentor Accept/Reject/Reschedule
router.put('/:id/status', verifyToken, requireRole('mentor'), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, newDate, newTime } = req.body;
        const mentorId = req.user.uid;

        if (!['accepted', 'rejected', 'rescheduled', 'completed'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const sessionRef = db.collection('mentor_sessions').doc(id);
        const sessionDoc = await sessionRef.get();
        if (!sessionDoc.exists) return res.status(404).json({ error: 'Session not found' });

        const sessionData = sessionDoc.data();
        if (sessionData.mentorId !== mentorId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const updateData = { status, updatedAt: new Date().toISOString() };
        if (status === 'rescheduled' && newDate) updateData.preferredDate = newDate;
        if (status === 'rescheduled' && newTime) updateData.preferredTime = newTime;

        // On accept: generate roomId and resolve project team members
        if (status === 'accepted') {
            updateData.roomId = crypto.randomUUID();
            const participantIds = [sessionData.studentId, mentorId];
            // Add project team members if project is linked
            if (sessionData.projectId) {
                try {
                    const projDoc = await db.collection('projects').doc(sessionData.projectId).get();
                    if (projDoc.exists) {
                        const members = projDoc.data().members || [];
                        members.forEach(m => { if (!participantIds.includes(m)) participantIds.push(m); });
                    }
                } catch {}
            }
            updateData.participantIds = participantIds;
        }

        await sessionRef.update(updateData);

        // Notify student
        const statusMessages = {
            accepted: `We are pleased to inform you that your ${sessionData.sessionType} session request "${sessionData.topic}" has been approved by your mentor. Please prepare accordingly and join on the scheduled date.`,
            rejected: `After review, your session request "${sessionData.topic}" could not be accommodated at this time. We encourage you to submit a new request with alternative timing.`,
            rescheduled: `Your session "${sessionData.topic}" has been rescheduled${newDate ? ` to ${newDate}` : ''}${newTime ? ` at ${newTime}` : ''}. Please update your calendar accordingly.`,
            completed: `Your mentoring session "${sessionData.topic}" has been marked as completed. We hope the session was productive and valuable.`
        };

        await db.collection('notifications').add({
            userId: sessionData.studentId,
            type: `session_${status}`,
            title: `Session ${status.charAt(0).toUpperCase() + status.slice(1)}`,
            message: statusMessages[status],
            read: false,
            time: new Date().toISOString()
        }).catch(() => {});

        // Send email to student
        let emailSent = false;
        try {
            const studentDoc = await db.collection('users').doc(sessionData.studentId).get();
            if (studentDoc.exists) {
                const s = studentDoc.data();
                emailSent = await sendMentorNotificationEmail({
                    mentorEmail: s.email,
                    mentorName: s.name || 'Student',
                    studentName: 'Your Assigned Mentor',
                    projectName: sessionData.projectTitle || 'N/A',
                    requestType: `Session ${status.charAt(0).toUpperCase() + status.slice(1)}`,
                    message: statusMessages[status]
                });
            }
        } catch (emailErr) {
            console.error('[Email] Non-fatal error in session status update:', emailErr.message);
        }

        console.log(`[Email] Session update email ${emailSent ? 'sent to student' : 'failed but action saved'}`);
        res.status(200).json({
            success: true,
            message: `Session ${status}`,
            emailSent,
            emailMessage: emailSent
                ? `Session update email sent to the student`
                : `Session ${status}, but email could not be sent`
        });
    } catch (error) {
        console.error('Error updating session:', error);
        res.status(500).json({ success: false, error: 'Failed to update session' });
    }
});

// GET /api/mentor-sessions/:id/messages — Fetch persistent chat history
router.get('/:id/messages', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const uid = req.user.uid;

        // Authorization check
        const sessionDoc = await db.collection('mentor_sessions').doc(id).get();
        if (!sessionDoc.exists) return res.status(404).json({ error: 'Session not found' });
        
        const session = sessionDoc.data();
        const isAuthorized = uid === session.mentorId || uid === session.studentId ||
            (session.participantIds && session.participantIds.includes(uid));
            
        if (!isAuthorized) return res.status(403).json({ error: 'Access denied' });

        const messagesSnap = await db.collection('session_messages')
            .where('sessionId', '==', id)
            .orderBy('createdAt', 'asc')
            .get();

        const messages = [];
        messagesSnap.forEach(doc => messages.push({ id: doc.id, ...doc.data() }));

        res.json({ messages });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// GET /api/mentor-sessions/:id — Fetch single session
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const doc = await db.collection('mentor_sessions').doc(req.params.id).get();
        if (!doc.exists) return res.status(404).json({ error: 'Session not found' });

        const data = doc.data();
        const uid = req.user.uid;

        // Authorization check
        const isAuthorized = uid === data.mentorId || uid === data.studentId ||
            (data.participantIds && data.participantIds.includes(uid));
        if (!isAuthorized) return res.status(403).json({ error: 'Access denied' });

        // Fetch mentor and student names
        let mentorName = 'Mentor', studentName = 'Student';
        try {
            const [mDoc, sDoc] = await Promise.all([
                db.collection('users').doc(data.mentorId).get(),
                db.collection('users').doc(data.studentId).get()
            ]);
            if (mDoc.exists) mentorName = mDoc.data().name || 'Mentor';
            if (sDoc.exists) studentName = sDoc.data().name || 'Student';
        } catch {}

        // spec compliance aliases
        const session = {
            id: doc.id,
            ...data,
            mentorName,
            studentName,
            hostId: data.mentorId, // spec: host_id
            scheduledDate: data.preferredDate, // spec: scheduled_date
            scheduledTime: data.preferredTime, // spec: scheduled_time
            sessionId: doc.id // spec: session_id
        };

        res.json({ session });
    } catch (error) {
        console.error('Error fetching session:', error);
        res.status(500).json({ error: 'Failed to fetch session' });
    }
});

// POST /api/mentor-sessions/:id/start — Mentor starts live session
router.post('/:id/start', verifyToken, requireRole('mentor'), async (req, res) => {
    try {
        const sessionRef = db.collection('mentor_sessions').doc(req.params.id);
        const sessionDoc = await sessionRef.get();
        if (!sessionDoc.exists) return res.status(404).json({ error: 'Session not found' });

        const data = sessionDoc.data();
        if (data.mentorId !== req.user.uid) return res.status(403).json({ error: 'Not authorized' });
        if (data.status !== 'accepted') return res.status(400).json({ error: 'Session must be accepted first' });

        await sessionRef.update({
            status: 'live',
            startedAt: new Date().toISOString()
        });

        // Notify student & participants
        const notifyIds = (data.participantIds || [data.studentId]).filter(id => id !== req.user.uid);
        for (const uid of notifyIds) {
            await db.collection('notifications').add({
                userId: uid,
                type: 'session_started',
                title: 'Live Session Started',
                message: `The live session "${data.topic}" has started. Join now!`,
                link: `/live-session/${req.params.id}`,
                read: false,
                time: new Date().toISOString()
            }).catch(() => {});
        }

        // Email notification to all participants
        let mentorName = 'Your Mentor';
        try {
            const mentorDoc = await db.collection('users').doc(req.user.uid).get();
            if (mentorDoc.exists) mentorName = mentorDoc.data().name || mentorName;
        } catch {}

        for (const uid of notifyIds) {
            try {
                const userDoc = await db.collection('users').doc(uid).get();
                if (userDoc.exists) {
                    const u = userDoc.data();
                    await sendMentorNotificationEmail({
                        mentorEmail: u.email,
                        mentorName: u.name || 'Student',
                        studentName: mentorName,
                        projectName: data.projectTitle || 'N/A',
                        requestType: 'Live Session In Progress',
                        message: `The live mentoring session "${data.topic}" is now in progress. Please join the session at your earliest convenience to participate in the discussion with ${mentorName}.`
                    });
                }
            } catch (emailErr) {
                console.error('[Email Error] Failed to send session start email:', emailErr.message);
            }
        }

        console.log(`[LiveSession] Session ${req.params.id} started by ${req.user.email}`);
        res.json({ success: true, message: 'Session started', roomId: data.roomId });
    } catch (error) {
        console.error('Error starting session:', error);
        res.status(500).json({ error: 'Failed to start session' });
    }
});

// POST /api/mentor-sessions/:id/end — End live session
router.post('/:id/end', verifyToken, async (req, res) => {
    try {
        const sessionRef = db.collection('mentor_sessions').doc(req.params.id);
        const sessionDoc = await sessionRef.get();
        if (!sessionDoc.exists) return res.status(404).json({ error: 'Session not found' });

        const data = sessionDoc.data();
        const uid = req.user.uid;
        if (uid !== data.mentorId && uid !== data.studentId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await sessionRef.update({
            status: 'completed',
            endedAt: new Date().toISOString()
        });

        // Notify all participants
        const notifyIds = (data.participantIds || []).filter(id => id !== uid);
        for (const pid of notifyIds) {
            await db.collection('notifications').add({
                userId: pid,
                type: 'session_ended',
                title: 'Session Ended',
                message: `The session "${data.topic}" has ended.`,
                read: false,
                time: new Date().toISOString()
            }).catch(() => {});
        }

        // Email notification to all participants
        let enderName = 'The host';
        try {
            const enderDoc = await db.collection('users').doc(uid).get();
            if (enderDoc.exists) enderName = enderDoc.data().name || enderName;
        } catch {}

        for (const pid of notifyIds) {
            try {
                const userDoc = await db.collection('users').doc(pid).get();
                if (userDoc.exists) {
                    const u = userDoc.data();
                    await sendMentorNotificationEmail({
                        mentorEmail: u.email,
                        mentorName: u.name || 'Participant',
                        studentName: enderName,
                        projectName: data.projectTitle || 'N/A',
                        requestType: 'Session Completed',
                        message: `The mentoring session "${data.topic}" has been concluded. We hope the session was productive and provided valuable insights. You may review any shared materials or notes in the project workspace.`
                    });
                }
            } catch (emailErr) {
                console.error('[Email Error] Failed to send session end email:', emailErr.message);
            }
        }

        console.log(`[LiveSession] Session ${req.params.id} ended by ${req.user.email}`);
        res.json({ success: true, message: 'Session ended' });
    } catch (error) {
        console.error('Error ending session:', error);
        res.status(500).json({ error: 'Failed to end session' });
    }
});

module.exports = router;
