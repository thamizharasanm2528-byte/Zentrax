// ─── Centralized Error Handler ───
// Must be registered LAST in Express middleware chain: app.use(errorHandler)

function errorHandler(err, req, res, _next) {
    // Multer errors (file too large, wrong type, etc.)
    if (err.code === 'LIMIT_FILE_SIZE') {
        console.error('[Upload] File rejected: size too large');
        return res.status(413).json({ success: false, error: 'File is too large' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        console.error('[Upload] Unexpected file field');
        return res.status(400).json({ success: false, error: 'Unexpected file field' });
    }
    if (err.message && err.message.startsWith('Unsupported file type')) {
        console.error(`[Upload] ${err.message}`);
        return res.status(400).json({ success: false, error: err.message });
    }

    // Validation errors (express-validator)
    if (err.type === 'entity.parse.failed') {
        console.error('[Validation] Malformed JSON body');
        return res.status(400).json({ success: false, error: 'Invalid JSON body' });
    }

    // Default server error
    const status = err.status || err.statusCode || 500;
    const message = status === 500 ? 'Something went wrong' : (err.message || 'Something went wrong');

    console.error(`[Error] ${status} — ${err.message || 'Unknown error'}`, status === 500 ? err.stack : '');

    res.status(status).json({
        success: false,
        error: message
    });
}

module.exports = errorHandler;
