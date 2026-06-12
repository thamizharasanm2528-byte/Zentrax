const express = require('express');
const router = express.Router();
const { db, verifyToken, requireRole } = require('../middleware/auth');

// GET /api/student/dashboard — Consolidated dashboard data for students
router.get('/dashboard', verifyToken, requireRole('student'), async (req, res) => {
    try {
        const userId = req.user.uid;
        console.log(`[Student Dashboard] Loading dashboard for user ${userId}`);

        // ─── Projects ───
        const projSnap = await db.collection('projects').get();
        const projects = [];
        projSnap.forEach(doc => {
            const d = doc.data();
            // Standardize Ownership Check: handle all variants (createdBy, authorId, owner_id)
            const isOwner = d.createdBy === userId || d.authorId === userId || d.owner_id === userId;
            const isMember = d.members?.includes(userId);
            
            if (isOwner || isMember) {
                projects.push({ id: doc.id, ...d });
            }
        });
        projects.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

        // ─── Project Progress Summary ───
        const projectProgress = projects.map(p => {
            const tasks = p.tasks || [];
            const total = tasks.length;
            const completed = tasks.filter(t => t.status === 'completed').length;
            const inProgress = tasks.filter(t => t.status === 'in-progress').length;
            const pending = total - completed - inProgress;
            const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
            return {
                projectId: p.id,
                projectTitle: p.title,
                status: p.status,
                total, completed, inProgress, pending, percentage
            };
        });

        // ─── Pending Mentor Feedback ───
        const feedbackSnap = await db.collection('project_feedback').get();
        const pendingFeedback = [];
        const projectIds = projects.map(p => p.id);
        feedbackSnap.forEach(doc => {
            const d = doc.data();
            if (projectIds.includes(d.projectId)) {
                const proj = projects.find(p => p.id === d.projectId);
                pendingFeedback.push({
                    id: doc.id,
                    mentorName: d.userName,
                    projectName: proj?.title || 'Project',
                    message: d.text,
                    type: d.type,
                    createdAt: d.createdAt
                });
            }
        });
        pendingFeedback.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

        // ─── Open Doubts ───
        const doubtSnap = await db.collection('doubts')
            .where('studentId', '==', userId)
            .get();
        const openDoubts = [];
        doubtSnap.forEach(doc => {
            const d = doc.data();
            openDoubts.push({
                id: doc.id,
                question: d.problemDescription,
                whatTried: d.whatTried,
                status: d.status,
                mentorResponse: d.mentorResponse || null,
                createdAt: d.createdAt
            });
        });
        openDoubts.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

        // ─── Notifications ───
        const notifSnap = await db.collection('notifications')
            .where('userId', '==', userId)
            .get();
        const notifications = [];
        notifSnap.forEach(doc => {
            const d = doc.data();
            notifications.push({ id: doc.id, ...d });
        });
        notifications.sort((a, b) => (b.time || '').localeCompare(a.time || ''));

        // ─── Recent Activity (Disabled at user request) ───
        const activity = [];

        // ─── Skill Progress (deduplicated, normalized tech names) ───
        const skillMap = {};
        const normalizeSkill = (name) => {
            const lower = name.trim().toLowerCase().replace(/[\s._-]+/g, '');
            const displayMap = {
                'react': 'React', 'reactjs': 'React', 'nodejs': 'Node.js', 'node': 'Node.js',
                'nodej': 'Node.js', 'javascript': 'JavaScript', 'js': 'JavaScript',
                'typescript': 'TypeScript', 'ts': 'TypeScript', 'python': 'Python',
                'firebase': 'Firebase', 'mongodb': 'MongoDB', 'mongo': 'MongoDB',
                'express': 'Express', 'expressjs': 'Express', 'nextjs': 'Next.js',
                'next': 'Next.js', 'tailwindcss': 'TailwindCSS', 'tailwind': 'TailwindCSS',
                'css': 'CSS', 'html': 'HTML', 'flutter': 'Flutter', 'dart': 'Dart',
                'java': 'Java', 'kotlin': 'Kotlin', 'swift': 'Swift', 'go': 'Go',
                'rust': 'Rust', 'csharp': 'C#', 'c#': 'C#', 'cpp': 'C++', 'c++': 'C++',
                'php': 'PHP', 'ruby': 'Ruby', 'rails': 'Rails', 'vue': 'Vue.js',
                'vuejs': 'Vue.js', 'angular': 'Angular', 'svelte': 'Svelte',
                'django': 'Django', 'flask': 'Flask', 'sql': 'SQL', 'mysql': 'MySQL',
                'postgresql': 'PostgreSQL', 'postgres': 'PostgreSQL', 'redis': 'Redis',
                'docker': 'Docker', 'kubernetes': 'Kubernetes', 'aws': 'AWS',
                'graphql': 'GraphQL', 'git': 'Git',
            };
            return displayMap[lower] || name.trim();
        };

        projects.forEach(p => {
            const tasks = p.tasks || [];
            const pct = tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100) : 0;
            (p.techStack || []).forEach(tech => {
                const normalized = normalizeSkill(tech);
                if (!skillMap[normalized]) skillMap[normalized] = { total: 0, count: 0 };
                skillMap[normalized].total += pct;
                skillMap[normalized].count += 1;
            });
        });
        const skills = Object.entries(skillMap).map(([name, data]) => ({
            name,
            progress: Math.min(100, Math.round(data.total / data.count))
        })).sort((a, b) => b.progress - a.progress);

        // ─── Upcoming Tasks (pending/in-progress from all projects) ───
        const upcomingTasks = [];
        projects.forEach(p => {
            (p.tasks || []).forEach(t => {
                if (t.status === 'pending' || t.status === 'in-progress') {
                    upcomingTasks.push({
                        title: t.title || t.name || 'Untitled Task',
                        status: t.status,
                        projectId: p.id,
                        projectTitle: p.title,
                        dueDate: t.dueDate || t.deadline || null,
                        assignee: t.assignee || null
                    });
                }
            });
        });
        // Sort: in-progress first, then by due date
        upcomingTasks.sort((a, b) => {
            if (a.status !== b.status) return a.status === 'in-progress' ? -1 : 1;
            if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
            return a.dueDate ? -1 : 1;
        });

        // ─── Unified Team Inbox (Invites + Join Requests) ───
        let teamInvites = [];
        try {
            // 1. Invites TO this user (single where to avoid composite index requirement)
            const invSnap = await db.collection('team_invites')
                .where('receiverId', '==', userId)
                .get();
            
            console.log(`[Dashboard Inbox] Found ${invSnap.size} total invites for user ${userId}`);
            
            for (const doc of invSnap.docs) {
                const d = doc.data();
                // Filter pending in-memory (avoids composite index on receiverId + status)
                if (d.status !== 'pending') continue;
                
                // Enrich with names if missing
                let senderName = d.senderName || 'Someone';
                let projectTitle = d.projectTitle || 'A Project';
                
                try {
                    const [uDoc, pDoc] = await Promise.all([
                        db.collection('users').doc(d.senderId).get(),
                        db.collection('projects').doc(d.projectId).get()
                    ]);
                    if (uDoc.exists) senderName = uDoc.data().name || senderName;
                    if (pDoc.exists) projectTitle = pDoc.data().title || projectTitle;
                } catch (e) {}

                teamInvites.push({
                    id: doc.id,
                    type: 'invite', // You are invited
                    senderName,
                    projectId: d.projectId,
                    projectTitle,
                    createdAt: d.createdAt
                });
            }

            // 2. Join Requests FOR this user's project (single where to avoid composite index)
            const joinSnap = await db.collection('join_requests')
                .where('owner_id', '==', userId)
                .get();

            for (const doc of joinSnap.docs) {
                const d = doc.data();
                // Filter pending in-memory
                if (d.status !== 'pending') continue;
                
                let senderName = d.senderName || 'A student';
                let projectTitle = 'Your Project';

                try {
                    const [uDoc, pDoc] = await Promise.all([
                        db.collection('users').doc(d.sender_id).get(),
                        db.collection('projects').doc(d.project_id).get()
                    ]);
                    if (uDoc.exists) senderName = uDoc.data().name || senderName;
                    if (pDoc.exists) projectTitle = pDoc.data().title || projectTitle;
                } catch (e) {}

                teamInvites.push({
                    id: doc.id,
                    type: 'request', // Someone wants to join YOUR project
                    senderName,
                    projectId: d.project_id,
                    projectTitle,
                    createdAt: d.created_at
                });
            }

            teamInvites.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        } catch (e) {
            console.error('[Dashboard Inbox] Error:', e);
        }

        // ─── Project Health (derived from progress) ───
        const projectHealth = projects.map(p => {
            const pp = projectProgress.find(x => x.projectId === p.id);
            const pct = pp?.percentage || 0;
            let health = 'at-risk', label = '🔴 At Risk';
            if (pct >= 50) { health = 'healthy'; label = '🟢 Healthy'; }
            else if (pct > 0) { health = 'needs-progress'; label = '🟡 Needs Progress'; }
            return { projectId: p.id, projectTitle: p.title, health, label, percentage: pct };
        });

        // ─── Daily Activity Summary ───
        const todayStr = new Date().toISOString().slice(0, 10);
        let tasksCompletedToday = 0;
        let postsToday = 0;
        projects.forEach(p => {
            (p.tasks || []).forEach(t => {
                if (t.status === 'completed' && t.completedAt && t.completedAt.slice(0, 10) === todayStr) {
                    tasksCompletedToday++;
                }
            });
        });
        activity.forEach(a => {
            if (a.time && a.time.slice(0, 10) === todayStr) postsToday++;
        });
        const dailyActivity = { tasksCompleted: tasksCompletedToday, posts: postsToday };

        // ─── User data (Feature 6: remove level/points dependency) ───
        let userData = {};
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists) userData = userDoc.data();
        } catch (e) { }

        // ─── Stats Calculation (Feature 6) ───
        const totalProjects = projects.length;
        const activeProjects = projects.filter(p => p.status !== 'Completed').length;
        const completedProjects = projects.filter(p => p.status === 'Completed').length;
        
        // teamCount is basically totalProjects the user is in
        const teamCount = totalProjects;

        // Connections: unique members (excluding self)
        const memberSet = new Set();
        projects.forEach(p => {
            (p.members || []).forEach(m => { if (m !== userId) memberSet.add(m); });
        });

        // Mentor Connections: unique mentors from those projects
        const mentorSet = new Set();
        for (const p of projects) {
            const members = p.members || [];
            for (const mid of members) {
                if (mid === userId) continue;
                try {
                    const mDoc = await db.collection('users').doc(mid).get();
                    if (mDoc.exists && (mDoc.data().role || '').toLowerCase() === 'mentor') {
                        mentorSet.add(mid);
                    }
                } catch (e) {}
            }
        }

        res.status(200).json({
            success: true,
            data: {
                user: userData,
                stats: {
                    totalProjects,
                    activeProjects,
                    completedProjects,
                    teamCount,
                    totalConnections: memberSet.size,
                    mentorConnections: mentorSet.size
                },
                projects: projects.slice(0, 5),
                projectProgress,
                pendingFeedback: pendingFeedback.slice(0, 5),
                openDoubts,
                notifications: notifications.slice(0, 5),
                activity: activity.slice(0, 10),
                skills: skills.slice(0, 8),
                upcomingTasks: upcomingTasks.slice(0, 8),
                teamInvites: teamInvites.slice(0, 5),
                projectHealth,
                dailyActivity
            }
        });
    } catch (error) {
        console.error('[Firestore] Failed to load student dashboard', {
            uid: req.user?.uid,
            error: error.message
        });
        res.status(200).json({
            success: false,
            error: 'Unable to load dashboard data',
            data: {
                stats: { activeProjects: 0, totalConnections: 0, level: 'Beginner' },
                projects: [], projectProgress: [], pendingFeedback: [],
                openDoubts: [], notifications: [], activity: [], skills: []
            }
        });
    }
});

module.exports = router;
