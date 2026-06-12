const rateLimit = require('express-rate-limit');

// ─── Helper: create a limiter with clean JSON response + logging ───
function createLimiter({ windowMs, max, label, message }) {
    return rateLimit({
        windowMs,
        max,
        standardHeaders: true,   // Return rate limit info in `RateLimit-*` headers
        legacyHeaders: false,    // Disable `X-RateLimit-*` headers
        handler: (req, res) => {
            console.warn(`[RateLimit] ${label} limit exceeded — IP: ${req.ip}, Path: ${req.originalUrl}`);
            res.status(429).json({
                success: false,
                error: message
            });
        }
    });
}

// ═══════════════════════════════════════════════════
//  NOTE: No global API limiter.
//  Rate limiting is applied ONLY to write/abuse-prone
//  routes, never to read endpoints.
// ═══════════════════════════════════════════════════

// ─── Auth — 10 req / 10 min per IP ───
const authLimiter = createLimiter({
    windowMs: 10 * 60 * 1000,
    max: 10,
    label: 'Auth',
    message: 'Too many login attempts. Please try again later.'
});

// ─── AI Chat send — 30 req / 1 min per IP ───
const aiChatLimiter = createLimiter({
    windowMs: 1 * 60 * 1000,
    max: 30,
    label: 'AI Chat',
    message: 'AI request limit reached. Please wait a moment and try again.'
});

// ─── Mentor Request submission — 15 req / 1 hr per IP ───
const mentorRequestLimiter = createLimiter({
    windowMs: 60 * 60 * 1000,
    max: 15,
    label: 'Mentor Request',
    message: 'Too many mentor requests. Please try again later.'
});

// ─── Doubt submission — 20 req / 1 hr per IP ───
const doubtLimiter = createLimiter({
    windowMs: 60 * 60 * 1000,
    max: 20,
    label: 'Doubt Submission',
    message: 'Too many doubt submissions. Please wait before submitting again.'
});

// ─── Session request — 15 req / 1 hr per IP ───
const sessionLimiter = createLimiter({
    windowMs: 60 * 60 * 1000,
    max: 15,
    label: 'Session Request',
    message: 'Too many session requests. Please try again later.'
});

// ─── File upload — 20 uploads / 1 hr per IP ───
const uploadLimiter = createLimiter({
    windowMs: 60 * 60 * 1000,
    max: 20,
    label: 'File Upload',
    message: 'Upload limit reached. Please try again later.'
});

// ─── Discussion message spam — 30 msg / 5 min per IP ───
const messageLimiter = createLimiter({
    windowMs: 5 * 60 * 1000,
    max: 30,
    label: 'Message',
    message: 'You are sending messages too quickly. Please slow down.'
});

module.exports = {
    authLimiter,
    aiChatLimiter,
    mentorRequestLimiter,
    doubtLimiter,
    sessionLimiter,
    uploadLimiter,
    messageLimiter
};
