const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { checkAdminAccess, isAdminEmail } = require('../middleware/adminAuth');
const admin = require('../controllers/adminController');

// ─── Lightweight admin check (no heavy data fetch) ───
// Used by frontend login flow to detect admin and redirect
router.get('/check', verifyToken, (req, res) => {
    const email = (req.user?.email || '').toLowerCase();
    const result = isAdminEmail(email);
    if (result) {
        console.log(`[AdminAccess] ✅ Admin login detected | email=${email}`);
    }
    res.json({ success: true, isAdmin: result });
});

// All other admin routes require authentication + admin email check
router.use(verifyToken, checkAdminAccess);

// Overview
router.get('/overview', admin.getOverview);

// Users
router.get('/users', admin.getUsers);
router.put('/users/:uid/status', admin.updateUserStatus);
router.delete('/users/:uid', admin.deleteUser);

// Projects
router.get('/projects', admin.getProjects);
router.put('/projects/:id/status', admin.updateProjectStatus);
router.delete('/projects/:id', admin.deleteProject);

// Mentorship
router.get('/mentorship', admin.getMentorship);

// Reports
router.get('/reports', admin.getReports);
router.put('/reports/:id', admin.updateReport);

// Logs
router.get('/logs', admin.getLogs);

// System Health
router.get('/system-health', admin.getSystemHealth);

module.exports = router;
