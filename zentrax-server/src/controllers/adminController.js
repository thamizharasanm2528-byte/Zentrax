const { db, admin } = require('../middleware/auth');

// ─── Helper: log admin action ───
async function logAdminAction(adminEmail, action, targetType, targetId) {
    try {
        await db.collection('admin_logs').add({
            admin_email: adminEmail,
            action,
            target_type: targetType || null,
            target_id: targetId || null,
            created_at: new Date().toISOString()
        });
    } catch (err) {
        console.error('[Admin] Failed to log action:', err.message);
    }
}

// ═══════════════════════════════════════════
//  OVERVIEW
// ═══════════════════════════════════════════
exports.getOverview = async (req, res) => {
    try {
        const [usersSnap, projectsSnap, doubtsSnap, reportsSnap, sessionsSnap] = await Promise.all([
            db.collection('users').get(),
            db.collection('projects').get(),
            db.collection('doubts').get(),
            db.collection('reports').get().catch(() => ({ size: 0, docs: [] })),
            db.collection('mentor_sessions').get().catch(() => ({ size: 0, docs: [] })),
        ]);

        const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const today = new Date().toISOString().split('T')[0];

        const metrics = {
            totalUsers: users.length,
            totalStudents: users.filter(u => u.role === 'student').length,
            students: users.filter(u => u.role === 'student').length,
            totalMentors: users.filter(u => u.role === 'mentor').length,
            mentors: users.filter(u => u.role === 'mentor').length,
            totalProjects: projectsSnap.size,
            projects: projectsSnap.size,
            activeProjects: projectsSnap.docs.filter(d => {
                const s = d.data().status;
                return s === 'development' || s === 'planning' || s === 'testing';
            }).length,
            totalDoubts: doubtsSnap.size,
            pendingDoubts: doubtsSnap.docs.filter(d => {
                const s = d.data().status;
                return s === 'Open' || s === 'Pending';
            }).length,
            openReports: reportsSnap.docs ? reportsSnap.docs.filter(d => d.data().status === 'open').length : 0,
            totalSessions: sessionsSnap.size,
            todaySignups: users.filter(u => u.createdAt?.startsWith(today)).length,
        };

        // Recent activity (last 20 users + projects by creation date)
        const recentUsers = users
            .filter(u => u.createdAt)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 10)
            .map(u => ({
                type: 'user_registered',
                label: `${u.name || u.email} joined as ${u.role}`,
                time: u.createdAt
            }));

        const recentProjects = projectsSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(p => p.createdAt)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 10)
            .map(p => ({
                type: 'project_created',
                label: `Project "${p.title || p.name || p.id}" created`,
                time: p.createdAt
            }));

        const recentActivity = [...recentUsers, ...recentProjects]
            .sort((a, b) => new Date(b.time) - new Date(a.time))
            .slice(0, 15);

        res.json({ success: true, data: { metrics, recentActivity } });
    } catch (error) {
        console.error('[Admin] Overview error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to fetch overview data' });
    }
};

// ═══════════════════════════════════════════
//  USERS
// ═══════════════════════════════════════════
exports.getUsers = async (req, res) => {
    try {
        const { search, role, status } = req.query;
        let query = db.collection('users');

        if (role && (role === 'student' || role === 'mentor')) {
            query = query.where('role', '==', role);
        }

        const snap = await query.get();
        let users = snap.docs.map(d => ({
            uid: d.id,
            ...d.data(),
            is_active: d.data().is_active !== false,
            is_flagged: d.data().is_flagged === true,
        }));

        // Filter by status
        if (status === 'active') users = users.filter(u => u.is_active && !u.is_flagged);
        if (status === 'deactivated') users = users.filter(u => !u.is_active);
        if (status === 'flagged') users = users.filter(u => u.is_flagged);

        // Search
        if (search) {
            const s = search.toLowerCase();
            users = users.filter(u =>
                (u.name || '').toLowerCase().includes(s) ||
                (u.email || '').toLowerCase().includes(s)
            );
        }

        // Sort by createdAt desc
        users.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        res.json({ success: true, data: { users, total: users.length } });
    } catch (error) {
        console.error('[Admin] Get users error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to fetch users' });
    }
};

exports.updateUserStatus = async (req, res) => {
    try {
        const { uid } = req.params;
        const { action } = req.body; // 'deactivate' | 'reactivate' | 'flag' | 'unflag'

        const updates = {};
        if (action === 'deactivate') updates.is_active = false;
        else if (action === 'reactivate') updates.is_active = true;
        else if (action === 'flag') updates.is_flagged = true;
        else if (action === 'unflag') updates.is_flagged = false;
        else return res.status(400).json({ success: false, error: 'Invalid action' });

        await db.collection('users').doc(uid).update(updates);
        await logAdminAction(req.user.email, `user_${action}`, 'user', uid);

        res.json({ success: true, message: `User ${action}d successfully` });
    } catch (error) {
        console.error('[Admin] Update user error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to update user' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { uid } = req.params;
        // Soft delete — mark as inactive and deleted
        await db.collection('users').doc(uid).update({
            is_active: false,
            is_deleted: true,
            deleted_at: new Date().toISOString()
        });
        await logAdminAction(req.user.email, 'user_delete', 'user', uid);

        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        console.error('[Admin] Delete user error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to delete user' });
    }
};

// ═══════════════════════════════════════════
//  PROJECTS
// ═══════════════════════════════════════════
exports.getProjects = async (req, res) => {
    try {
        const { search, status } = req.query;
        const snap = await db.collection('projects').get();

        let projects = snap.docs.map(d => ({
            id: d.id,
            ...d.data(),
            is_active: d.data().is_active !== false,
            is_flagged: d.data().is_flagged === true,
        }));

        if (status && status !== 'all') {
            projects = projects.filter(p => p.status === status);
        }

        if (search) {
            const s = search.toLowerCase();
            projects = projects.filter(p =>
                (p.title || p.name || '').toLowerCase().includes(s)
            );
        }

        // Enrich with owner names
        const ownerIds = [...new Set(projects.map(p => p.createdBy).filter(Boolean))];
        const ownerMap = {};
        for (const oid of ownerIds.slice(0, 50)) {
            try {
                const uDoc = await db.collection('users').doc(oid).get();
                if (uDoc.exists) ownerMap[oid] = uDoc.data().name || uDoc.data().email || 'Unknown';
            } catch { ownerMap[oid] = 'Unknown'; }
        }

        projects = projects.map(p => ({
            ...p,
            ownerName: ownerMap[p.createdBy] || 'Unknown',
            teamSize: (p.members || []).length,
        }));

        projects.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        res.json({ success: true, data: { projects, total: projects.length } });
    } catch (error) {
        console.error('[Admin] Get projects error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to fetch projects' });
    }
};

exports.updateProjectStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body; // 'flag' | 'unflag' | 'deactivate' | 'reactivate'

        const updates = {};
        if (action === 'flag') updates.is_flagged = true;
        else if (action === 'unflag') updates.is_flagged = false;
        else if (action === 'deactivate') updates.is_active = false;
        else if (action === 'reactivate') updates.is_active = true;
        else return res.status(400).json({ success: false, error: 'Invalid action' });

        await db.collection('projects').doc(id).update(updates);
        await logAdminAction(req.user.email, `project_${action}`, 'project', id);

        res.json({ success: true, message: `Project ${action}d successfully` });
    } catch (error) {
        console.error('[Admin] Update project error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to update project' });
    }
};

exports.deleteProject = async (req, res) => {
    try {
        const { id } = req.params;
        await db.collection('projects').doc(id).update({
            is_active: false,
            is_deleted: true,
            deleted_at: new Date().toISOString()
        });
        await logAdminAction(req.user.email, 'project_delete', 'project', id);

        res.json({ success: true, message: 'Project deleted successfully' });
    } catch (error) {
        console.error('[Admin] Delete project error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to delete project' });
    }
};

// ═══════════════════════════════════════════
//  MENTORSHIP
// ═══════════════════════════════════════════
exports.getMentorship = async (req, res) => {
    try {
        const { type } = req.query; // 'doubts' | 'sessions' | 'all'

        const result = { doubts: [], sessions: [] };

        if (!type || type === 'all' || type === 'doubts') {
            const snap = await db.collection('doubts').get();
            result.doubts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            result.doubts.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        }

        if (!type || type === 'all' || type === 'sessions') {
            try {
                const snap = await db.collection('mentor_sessions').get();
                result.sessions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                result.sessions.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            } catch { /* collection may not exist */ }
        }

        res.json({
            success: true,
            data: {
                ...result,
                totalDoubts: result.doubts.length,
                pendingDoubts: result.doubts.filter(d => d.status === 'Open' || d.status === 'Pending').length,
                totalSessions: result.sessions.length,
            }
        });
    } catch (error) {
        console.error('[Admin] Mentorship error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to fetch mentorship data' });
    }
};

// ═══════════════════════════════════════════
//  REPORTS
// ═══════════════════════════════════════════
exports.getReports = async (req, res) => {
    try {
        const { status } = req.query;
        let query = db.collection('reports');

        if (status && status !== 'all') {
            query = query.where('status', '==', status);
        }

        const snap = await query.get();
        const reports = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

        res.json({ success: true, data: { reports, total: reports.length } });
    } catch (error) {
        console.error('[Admin] Get reports error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to fetch reports' });
    }
};

exports.updateReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, admin_note } = req.body; // 'reviewed' | 'resolved' | 'ignored'

        const updates = { status, updated_at: new Date().toISOString() };
        if (admin_note) updates.admin_note = admin_note;

        await db.collection('reports').doc(id).update(updates);
        await logAdminAction(req.user.email, `report_${status}`, 'report', id);

        res.json({ success: true, message: `Report ${status} successfully` });
    } catch (error) {
        console.error('[Admin] Update report error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to update report' });
    }
};

// ═══════════════════════════════════════════
//  LOGS
// ═══════════════════════════════════════════
exports.getLogs = async (req, res) => {
    try {
        const snap = await db.collection('admin_logs')
            .orderBy('created_at', 'desc')
            .limit(100)
            .get()
            .catch(() => ({ docs: [] }));

        const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        res.json({ success: true, data: { logs, total: logs.length } });
    } catch (error) {
        console.error('[Admin] Get logs error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to fetch logs' });
    }
};

// ═══════════════════════════════════════════
//  SYSTEM HEALTH
// ═══════════════════════════════════════════
exports.getSystemHealth = async (req, res) => {
    try {
        const health = {
            backend: { status: 'operational', message: 'Express server running' },
            firestore: { status: 'checking', message: '' },
            email: { status: 'checking', message: '' },
            ai: { status: 'checking', message: '' },
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            timestamp: new Date().toISOString(),
        };

        // Check Firestore
        try {
            await db.collection('users').limit(1).get();
            health.firestore = { status: 'operational', message: 'Connected' };
        } catch {
            health.firestore = { status: 'error', message: 'Connection failed' };
        }

        // Check Email
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            health.email = { status: 'operational', message: `Configured (${process.env.EMAIL_USER})` };
        } else {
            health.email = { status: 'warning', message: 'Not configured' };
        }

        // Check AI
        if (process.env.GROQ_API_KEY) {
            health.ai = { status: 'operational', message: 'API key configured' };
        } else {
            health.ai = { status: 'warning', message: 'Not configured' };
        }

        res.json({ success: true, data: health });
    } catch (error) {
        console.error('[Admin] System health error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to check system health' });
    }
};
