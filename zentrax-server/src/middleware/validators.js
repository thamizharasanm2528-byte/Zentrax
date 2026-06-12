const { body, validationResult } = require('express-validator');

// ─── Helper: run validation rules and return errors if any ───
function handleValidation(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const formatted = errors.array().map(e => ({
            field: e.path || e.param,
            message: e.msg
        }));
        console.warn(`[Validation] Invalid input on ${req.method} ${req.originalUrl}:`, formatted.map(e => e.field).join(', '));
        return res.status(400).json({ success: false, errors: formatted });
    }
    next();
}

// ═══════════════════════════════════════════════════
//  Validation rule sets for ZENTRAX routes
// ═══════════════════════════════════════════════════

const validateMentorRequest = [
    body('mentorId').notEmpty().withMessage('mentorId is required'),
    body('projectId').notEmpty().withMessage('projectId is required'),
    body('message').optional().isLength({ max: 1000 }).withMessage('Message must be under 1000 characters'),
    handleValidation
];

const validateDoubtSubmission = [
    body('problemDescription').notEmpty().withMessage('Problem description is required')
        .isLength({ min: 10, max: 5000 }).withMessage('Problem description must be 10–5000 characters'),
    body('whatTried').notEmpty().withMessage('What you tried is required')
        .isLength({ min: 5, max: 5000 }).withMessage('What you tried must be 5–5000 characters'),
    body('projectId').optional().isString(),
    handleValidation
];

const validateSessionRequest = [
    body('mentorId').notEmpty().withMessage('mentorId is required'),
    body('topic').notEmpty().withMessage('Session topic is required')
        .isLength({ max: 200 }).withMessage('Topic must be under 200 characters'),
    body('sessionType').notEmpty().withMessage('sessionType is required'),
    body('summary').optional().isLength({ max: 2000 }).withMessage('Summary must be under 2000 characters'),
    handleValidation
];

const validateProjectCreation = [
    body('title').notEmpty().withMessage('Project title is required')
        .isLength({ min: 3, max: 100 }).withMessage('Title must be 3–100 characters'),
    body('description').optional().isLength({ max: 5000 }).withMessage('Description must be under 5000 characters'),
    handleValidation
];

const validateUploadMeta = [
    body('projectId').optional().isString().withMessage('projectId must be a string'),
    body('type').optional().isIn(['image', 'video', 'document', 'attachment']).withMessage('type must be image, video, document, or attachment'),
    handleValidation
];

module.exports = {
    handleValidation,
    validateMentorRequest,
    validateDoubtSubmission,
    validateSessionRequest,
    validateProjectCreation,
    validateUploadMeta
};
