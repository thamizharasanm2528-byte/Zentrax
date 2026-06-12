const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ─── Ensure upload directory exists ───
const UPLOAD_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ─── Allowed MIME types ───
const ALLOWED_TYPES = {
    image: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    video: ['video/mp4', 'video/quicktime', 'video/webm'],
    document: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
    ],
    attachment: [
        'application/json',
        'application/zip',
        'text/csv',
        // Also allow images, docs, videos as "attachments"
        'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
        'application/pdf', 'text/plain',
        'video/mp4'
    ]
};

// ─── Size limits (bytes) ───
const SIZE_LIMITS = {
    image: 5 * 1024 * 1024,       // 5 MB
    video: 50 * 1024 * 1024,      // 50 MB
    document: 10 * 1024 * 1024,   // 10 MB
    attachment: 50 * 1024 * 1024   // 50 MB (covers video attachments)
};

// ─── Storage configuration ───
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const typeDir = path.join(UPLOAD_DIR, req.uploadType || 'misc');
        if (!fs.existsSync(typeDir)) fs.mkdirSync(typeDir, { recursive: true });
        cb(null, typeDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

// ─── File filter factory ───
function createFileFilter(category) {
    const allowed = ALLOWED_TYPES[category] || [];
    return (req, file, cb) => {
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: ${allowed.join(', ')}`));
        }
    };
}

// ─── Export pre-configured uploaders ───
function createUploader(category) {
    return multer({
        storage,
        fileFilter: createFileFilter(category),
        limits: { fileSize: SIZE_LIMITS[category] || SIZE_LIMITS.attachment }
    });
}

// Middleware that sets req.uploadType before multer processes the file
function withUploadType(type) {
    return (req, res, next) => {
        req.uploadType = type;
        next();
    };
}

const imageUpload = createUploader('image');
const videoUpload = createUploader('video');
const documentUpload = createUploader('document');
const attachmentUpload = createUploader('attachment');

module.exports = {
    imageUpload,
    videoUpload,
    documentUpload,
    attachmentUpload,
    withUploadType,
    UPLOAD_DIR
};
