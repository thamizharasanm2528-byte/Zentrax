const express = require('express');
const router = express.Router();
const { db, verifyToken, requireRole } = require('../middleware/auth');
const emailService = require('../services/emailService');

// GET /api/join/open-projects — Browse projects looking for teammates
router.get('/open-projects', verifyToken, async (req, res) => {
    try {
        const userId = req.user.uid;

        // Fetch user profile for skill filtering (Feature 3)
        const userDoc = await db.collection('users').doc(userId).get();
        const userSkills = (userDoc.exists ? userDoc.data().skills : []) || [];
        const studentSkills = userSkills.map(s => s.toLowerCase().trim());

        // IMPORTANT: Do NOT use .where('looking_for_teammates', '==', true) because
        // Firestore silently excludes documents that don't have the field at all.
        // Instead, fetch all projects and filter in-memory with fallback defaults.
        const snapshot = await db.collection('projects').get();

        const projects = [];
        snapshot.forEach(doc => {
            const d = doc.data();
            const ownerId = d.createdBy || d.authorId;

            // Skip projects the user owns or is already a member of
            if (ownerId === userId) return;
            if ((d.members || []).includes(userId)) return;

            // Backward compatibility: default missing fields
            const isLooking = d.looking_for_teammates !== undefined ? d.looking_for_teammates : true;
            const visibility = d.visibility || 'public';

            // Only show public projects that are looking for teammates
            if (!isLooking || visibility !== 'public') return;

            // Calculate slots
            const currentMembers = (d.members || []).length;
            const maxSize = d.teamSize || d.slots_available ? (d.teamSize || 5) : 5;
            const slotsLeft = d.slots_available !== undefined
                ? d.slots_available
                : Math.max(0, maxSize - currentMembers);

            // Skip full teams
            if (slotsLeft <= 0) return;

            // Feature 3: Smart Filter (Skill Match)
            const requiredSkills = (d.requiredSkills || []).map(s => s.toLowerCase().trim());
            const intersection = studentSkills.filter(s => requiredSkills.includes(s));
            
            // Inclusion rule: Projects with matches appear first, but non-matches are no longer hidden
            const matchScore = intersection.length;

            projects.push({ id: doc.id, ...d, slotsLeft, matchScore });
        });

        // Feature 3: Sort by highest matchScore first, then by most recent
        projects.sort((a, b) => {
            if (b.matchScore !== a.matchScore) {
                return b.matchScore - a.matchScore;
            }
            return (b.createdAt || '').localeCompare(a.createdAt || '');
        });

        // Enrich with owner name AND enforce "Active User" gate (Feature: Authentication Cleanliness)
        const activeProjects = [];
        for (let project of projects) {
            try {
                const ownerDoc = await db.collection('users').doc(project.createdBy || project.authorId).get();
                if (ownerDoc.exists) {
                    project.ownerName = ownerDoc.data().name || ownerDoc.data().email;
                    activeProjects.push(project);
                }
            } catch (e) {
                // Skip projects with errors or missing owners
            }
        }

        console.log(`[Join Team] Found ${activeProjects.length} projects from verified active students`);
        res.status(200).json({ projects: activeProjects });
    } catch (error) {
        console.error('[Firestore] Failed to fetch open projects', {
            collection: 'projects',
            uid: req.user?.uid,
            error: error.message
        });
        res.status(200).json({ projects: [] });
    }
});

// POST /api/join/request — Student requests to join a project
router.post('/request', verifyToken, requireRole('student'), async (req, res) => {
    try {
        const { projectId, message } = req.body;
        const senderId = req.user.uid;

        if (!projectId) {
            return res.status(400).json({ error: 'projectId is required' });
        }

        // Get project to find the owner
        const projDoc = await db.collection('projects').doc(projectId).get();
        if (!projDoc.exists) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const project = projDoc.data();
        const ownerId = project.createdBy || project.authorId;

        // Check if already a member
        if ((project.members || []).includes(senderId)) {
            return res.status(400).json({ error: 'You are already a member of this project' });
        }

        // Check if team is full (count only students, not mentors)
        // First check if the sender is a mentor or student
        let senderRole = 'student';
        try {
            const senderDoc = await db.collection('users').doc(senderId).get();
            if (senderDoc.exists) senderRole = (senderDoc.data().role || 'student').toLowerCase();
        } catch (e) {}

        if (senderRole !== 'mentor') {
            // Count only non-mentor members toward team size
            let studentCount = 0;
            for (const mid of (project.members || [])) {
                try {
                    const mDoc = await db.collection('users').doc(mid).get();
                    if (!mDoc.exists || (mDoc.data().role || 'student').toLowerCase() !== 'mentor') {
                        studentCount++;
                    }
                } catch (e) { studentCount++; }
            }
            const slotsLeft = Math.max(0, (project.teamSize || 5) - studentCount);
            if (slotsLeft === 0) {
                return res.status(400).json({ error: 'This team has enough members. The team is full!' });
            }
        }

        // Check one-mentor-per-project rule
        try {
            const senderDoc = await db.collection('users').doc(senderId).get();
            if (senderDoc.exists && (senderDoc.data().role || '').toLowerCase() === 'mentor') {
                // Check if project already has a mentor
                const memberIds = project.members || [];
                for (const mid of memberIds) {
                    try {
                        const mDoc = await db.collection('users').doc(mid).get();
                        if (mDoc.exists && (mDoc.data().role || '').toLowerCase() === 'mentor') {
                            return res.status(400).json({ error: 'This project already has a mentor. Only one mentor is allowed per project.' });
                        }
                    } catch (e) {}
                }
            }
        } catch (e) {}

        console.log(`[Join Requests] Checking duplicate: project=${projectId}, sender=${senderId}`);
        const existing = await db.collection('join_requests')
            .where('project_id', '==', projectId)
            .where('sender_id', '==', senderId)
            .where('status', '==', 'pending')
            .get();

        if (!existing.empty) {
            return res.status(400).json({ error: 'You already have a pending request for this project' });
        }

        const requestData = {
            project_id: projectId,
            sender_id: senderId,
            owner_id: ownerId,
            message: message || '',
            status: 'pending',
            created_at: new Date().toISOString()
        };

        const docRef = await db.collection('join_requests').add(requestData);
        console.log(`[Join Requests] Created request ${docRef.id} for project ${projectId}`);

        // Get sender name for notification
        let senderName = 'A student';
        try {
            const senderDoc = await db.collection('users').doc(senderId).get();
            if (senderDoc.exists) senderName = senderDoc.data().name || senderName;
        } catch (e) {}

        // Notify the project owner (In-app + Email)
        await db.collection('notifications').add({
            userId: ownerId,
            type: 'team',
            title: 'Join Request',
            message: `${senderName} wants to join "${project.title}".`,
            read: false,
            time: new Date().toISOString(),
            metadata: { joinRequestId: docRef.id, projectId, senderId }
        });

        // Trigger Email Notification to Owner
        try {
            const ownerDoc = await db.collection('users').doc(ownerId).get();
            if (ownerDoc.exists) {
                const ownerData = ownerDoc.data();
                await emailService.sendNotificationEmail({
                    recipientEmail: ownerData.email,
                    recipientName: ownerData.name || 'Project Owner',
                    subject: `New Membership Request — ${project.title}`,
                    title: 'New Team Membership Request',
                    message: `<strong>${senderName}</strong> has submitted a request to join your project "<strong>${project.title}</strong>". Please review their profile and qualifications on the dashboard to proceed with your decision.`,
                    ctaLabel: 'Review Request',
                    ctaLink: `http://localhost:5173/dashboard`
                });
            }
        } catch (emailErr) {
            console.error('[Email Error] Failed to send join request notification to owner:', emailErr.message);
        }

        res.status(201).json({ id: docRef.id, ...requestData });
    } catch (error) {
        console.error('[Firestore] Failed to send join request', {
            collection: 'join_requests',
            uid: req.user?.uid,
            projectId: req.body?.projectId,
            error: error.message
        });
        res.status(500).json({ error: 'Failed to send join request' });
    }
});

// GET /api/join/requests/:projectId — Get join requests for a project (for owner)
router.get('/requests/:projectId', verifyToken, async (req, res) => {
    try {
        const { projectId } = req.params;

        const snapshot = await db.collection('join_requests')
            .where('project_id', '==', projectId)
            .get();

        const requests = [];
        snapshot.forEach(doc => { requests.push({ id: doc.id, ...doc.data() }); });

        requests.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

        // Enrich with sender name
        for (let request of requests) {
            try {
                const userDoc = await db.collection('users').doc(request.sender_id).get();
                if (userDoc.exists) {
                    const data = userDoc.data();
                    request.senderName = data.name || data.email;
                    request.senderSkills = data.skills || [];
                }
            } catch (e) {}
        }

        console.log(`[Join Requests] Found ${requests.length} requests for project ${projectId}`);
        res.status(200).json({ requests });
    } catch (error) {
        console.error('[Firestore] Failed to fetch join requests', {
            collection: 'join_requests',
            projectId: req.params.projectId,
            error: error.message
        });
        res.status(200).json({ requests: [] });
    }
});

// PUT /api/join/accept — Accept a join request
router.put('/accept', verifyToken, async (req, res) => {
    try {
        const { requestId } = req.body;
        const userId = req.user.uid;

        if (!requestId) return res.status(400).json({ error: 'requestId is required' });

        const reqRef = db.collection('join_requests').doc(requestId);
        const reqDoc = await reqRef.get();

        if (!reqDoc.exists) return res.status(404).json({ error: 'Request not found' });

        const data = reqDoc.data();
        if (data.owner_id !== userId) return res.status(403).json({ error: 'Only the project owner can accept requests' });

        // Add student to project members and decrement slots
        const { FieldValue } = require('firebase-admin/firestore');
        const projRef = db.collection('projects').doc(data.project_id);
        const projDoc = await projRef.get();
        const projData = projDoc.exists ? projDoc.data() : {};

        // Check if team is full before accepting (count only students, not mentors)
        let senderRole = 'student';
        try {
            const sDoc = await db.collection('users').doc(data.sender_id).get();
            if (sDoc.exists) senderRole = (sDoc.data().role || 'student').toLowerCase();
        } catch (e) {}

        if (senderRole !== 'mentor') {
            let studentCount = 0;
            for (const mid of (projData.members || [])) {
                try {
                    const mDoc = await db.collection('users').doc(mid).get();
                    if (!mDoc.exists || (mDoc.data().role || 'student').toLowerCase() !== 'mentor') {
                        studentCount++;
                    }
                } catch (e) { studentCount++; }
            }
            const maxSize = projData.teamSize || 5;
            if (studentCount >= maxSize) {
                return res.status(400).json({ error: 'Cannot accept — team already has enough students!' });
            }
        }

        // One-mentor-per-project enforcement
        try {
            const senderDoc = await db.collection('users').doc(data.sender_id).get();
            if (senderDoc.exists && (senderDoc.data().role || '').toLowerCase() === 'mentor') {
                for (const mid of (projData.members || [])) {
                    try {
                        const mDoc = await db.collection('users').doc(mid).get();
                        if (mDoc.exists && (mDoc.data().role || '').toLowerCase() === 'mentor') {
                            await reqRef.update({ status: 'rejected', rejected_at: new Date().toISOString() });
                            return res.status(400).json({ error: 'This project already has a mentor. Only one mentor allowed per project.' });
                        }
                    } catch (e) {}
                }
            }
        } catch (e) {}

        // Update request status
        await reqRef.update({ status: 'accepted', accepted_at: new Date().toISOString() });

        const updateFields = {
            members: FieldValue.arrayUnion(data.sender_id)
        };

        // Decrement slots_available if it exists
        const currentSlots = projData.slots_available;
        if (currentSlots !== undefined && currentSlots > 0) {
            updateFields.slots_available = currentSlots - 1;
            // Auto-close recruitment when no more slots
            if (currentSlots - 1 <= 0) {
                updateFields.looking_for_teammates = false;
            }
        }

        await projRef.update(updateFields);

        // Get project title for notification
        let projectTitle = 'the project';
        try {
            const projDoc = await db.collection('projects').doc(data.project_id).get();
            if (projDoc.exists) projectTitle = projDoc.data().title || projectTitle;
        } catch (e) {}

        // Notify the student (In-app + Email)
        await db.collection('notifications').add({
            userId: data.sender_id,
            type: 'team',
            title: 'Join Request Accepted! 🎉',
            message: `Your request to join "${projectTitle}" has been accepted. You're now a team member!`,
            read: false,
            time: new Date().toISOString(),
            metadata: { joinRequestId: requestId, projectId: data.project_id }
        });

        // Trigger Email Notification
        try {
            const senderDoc = await db.collection('users').doc(data.sender_id).get();
            if (senderDoc.exists) {
                const senderData = senderDoc.data();
                await emailService.sendNotificationEmail({
                    recipientEmail: senderData.email,
                    recipientName: senderData.name || 'Student',
                    subject: `Membership Approved — ${projectTitle}`,
                    title: 'Membership Request Approved',
                    message: `We are pleased to inform you that your request to join the project "<strong>${projectTitle}</strong>" has been approved by the project owner. You have been added to the team and now have full access to the project workspace. We encourage you to introduce yourself to your new teammates and begin collaborating.`,
                    ctaLabel: 'Open Project Workspace',
                    ctaLink: `http://localhost:5173/project/${data.project_id}`
                });
            }
        } catch (emailErr) {
            console.error('[Email Error] Failed to send join request acceptance email:', emailErr.message);
        }

        // Log project activity
        const activityService = require('../services/activityService');
        await activityService.logActivity({
            projectId: data.project_id,
            userId: data.sender_id,
            actionType: 'member_joined',
            message: `Joined the project team.`
        });

        console.log(`[Join Requests] Accepted request ${requestId} by owner ${userId}`);
        res.status(200).json({ message: 'Request accepted, student added to project' });
    } catch (error) {
        console.error('[Firestore] Failed to accept join request', {
            collection: 'join_requests',
            requestId: req.body?.requestId,
            uid: req.user?.uid,
            error: error.message
        });
        res.status(500).json({ error: 'Failed to accept request' });
    }
});

// PUT /api/join/reject — Reject a join request
router.put('/reject', verifyToken, async (req, res) => {
    try {
        const { requestId } = req.body;
        const userId = req.user.uid;

        if (!requestId) return res.status(400).json({ error: 'requestId is required' });

        const reqRef = db.collection('join_requests').doc(requestId);
        const reqDoc = await reqRef.get();

        if (!reqDoc.exists) return res.status(404).json({ error: 'Request not found' });

        const data = reqDoc.data();
        if (data.owner_id !== userId) return res.status(403).json({ error: 'Only the project owner can reject requests' });

        await reqRef.update({ status: 'rejected', rejected_at: new Date().toISOString() });

        // Get project title
        let projectTitle = 'a project';
        try {
            const projDoc = await db.collection('projects').doc(data.project_id).get();
            if (projDoc.exists) projectTitle = projDoc.data().title || projectTitle;
        } catch (e) {}

        // Notify the student
        await db.collection('notifications').add({
            userId: data.sender_id,
            type: 'team',
            title: 'Join Request Update',
            message: `Your request to join "${projectTitle}" was not accepted. Try other open projects!`,
            read: false,
            time: new Date().toISOString(),
            metadata: { joinRequestId: requestId }
        });

        // Email notification to the student
        try {
            const senderDoc = await db.collection('users').doc(data.sender_id).get();
            if (senderDoc.exists) {
                const senderData = senderDoc.data();
                await emailService.sendNotificationEmail({
                    recipientEmail: senderData.email,
                    recipientName: senderData.name || 'Student',
                    subject: `Membership Request Update — ${projectTitle}`,
                    title: 'Membership Request Update',
                    message: `Thank you for your interest in joining the project "<strong>${projectTitle}</strong>". After careful consideration, the project owner has decided not to proceed with your request at this time. We encourage you to explore other open projects on the platform — there are many teams actively seeking collaborators with your skill set.`,
                    ctaLabel: 'Explore Open Projects',
                    ctaLink: 'http://localhost:5173/join-team'
                });
            }
        } catch (emailErr) {
            console.error('[Email Error] Failed to send join rejection email:', emailErr.message);
        }

        console.log(`[Join Requests] Rejected request ${requestId} by owner ${userId}`);
        res.status(200).json({ message: 'Request rejected' });
    } catch (error) {
        console.error('[Firestore] Failed to reject join request', {
            collection: 'join_requests',
            requestId: req.body?.requestId,
            uid: req.user?.uid,
            error: error.message
        });
        res.status(500).json({ error: 'Failed to reject request' });
    }
});

// GET /api/join/my-requests — Get student's own sent join requests
router.get('/my-requests', verifyToken, async (req, res) => {
    try {
        const userId = req.user.uid;
        const snapshot = await db.collection('join_requests')
            .where('sender_id', '==', userId)
            .get();

        const requests = [];
        snapshot.forEach(doc => { requests.push({ id: doc.id, ...doc.data() }); });
        requests.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

        console.log(`[Join Requests] Found ${requests.length} sent requests for user ${userId}`);
        res.status(200).json({ requests });
    } catch (error) {
        console.error('[Firestore] Failed to fetch my join requests', {
            collection: 'join_requests',
            uid: req.user?.uid,
            error: error.message
        });
        res.status(200).json({ requests: [] });
    }
});

module.exports = router;
