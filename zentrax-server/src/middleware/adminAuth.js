/**
 * Admin access middleware — email whitelist from ADMIN_EMAILS env var.
 * Usage: router.use(verifyToken, checkAdminAccess);
 */

/** Parse the ADMIN_EMAILS whitelist from .env */
function getAdminEmails() {
    return (process.env.ADMIN_EMAILS || '')
        .split(',')
        .map(e => e.trim().toLowerCase())
        .filter(Boolean);
}

/** Check if an email is in the admin whitelist */
function isAdminEmail(email) {
    return getAdminEmails().includes((email || '').toLowerCase());
}

/** Express middleware — blocks non-admin users with 403 */
const checkAdminAccess = (req, res, next) => {
    const userEmail = (req.user?.email || '').toLowerCase();
    const route = req.originalUrl || req.url;

    if (!userEmail || !isAdminEmail(userEmail)) {
        console.warn(`[AdminAccess] ⛔ Unauthorized admin route attempt | email=${userEmail || 'unknown'} | route=${route} | ip=${req.ip}`);
        return res.status(403).json({
            success: false,
            error: 'Access denied. Admin only.'
        });
    }

    console.log(`[AdminAccess] ✅ Admin access granted | email=${userEmail} | route=${route}`);
    next();
};

module.exports = { checkAdminAccess, isAdminEmail, getAdminEmails };
