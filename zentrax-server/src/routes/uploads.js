const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { imageUpload, videoUpload, documentUpload, attachmentUpload, withUploadType } = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/rateLimiters');
const { db } = require('../middleware/auth');

// ─── Helper: save metadata to Firestore + return response ───
async function handleUpload(req, res, type) {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file provided' });
    }

    const file = req.file;
    const fileData = {
        user_id: req.user.uid,
        project_id: req.body.projectId || null,
        type,
        file_name: file.originalname,
        file_url: `/uploads/${type}/${file.filename}`,
        mime_type: file.mimetype,
        size: file.size,
        created_at: new Date().toISOString()
    };

    try {
        const docRef = await db.collection('uploads').add(fileData);
        console.log(`[Upload] ${type} uploaded successfully: ${file.originalname} (${(file.size / 1024).toFixed(1)} KB)`);
        res.status(201).json({
            success: true,
            message: 'File uploaded successfully',
            file: { id: docRef.id, ...fileData }
        });
    } catch (err) {
        console.error(`[Upload] Failed to save metadata for ${file.originalname}:`, err.message);
        res.status(500).json({ success: false, error: 'File saved but metadata failed' });
    }
}

// ═══════════════════════════════════════════════════
//  POST /api/upload/image
// ═══════════════════════════════════════════════════
router.post('/image',
    verifyToken,
    uploadLimiter,
    withUploadType('image'),
    imageUpload.single('file'),
    (req, res) => handleUpload(req, res, 'image')
);

// ═══════════════════════════════════════════════════
//  POST /api/upload/video
// ═══════════════════════════════════════════════════
router.post('/video',
    verifyToken,
    uploadLimiter,
    withUploadType('video'),
    videoUpload.single('file'),
    (req, res) => handleUpload(req, res, 'video')
);

// ═══════════════════════════════════════════════════
//  POST /api/upload/document
// ═══════════════════════════════════════════════════
router.post('/document',
    verifyToken,
    uploadLimiter,
    withUploadType('document'),
    documentUpload.single('file'),
    (req, res) => handleUpload(req, res, 'document')
);

// ═══════════════════════════════════════════════════
//  POST /api/upload/attachment
// ═══════════════════════════════════════════════════
router.post('/attachment',
    verifyToken,
    uploadLimiter,
    withUploadType('attachment'),
    attachmentUpload.single('file'),
    (req, res) => handleUpload(req, res, 'attachment')
);

// ═══════════════════════════════════════════════════
//  GET /api/upload/list — List uploads for current user
// ═══════════════════════════════════════════════════
router.get('/list', verifyToken, async (req, res) => {
    try {
        const { projectId, type } = req.query;
        let query = db.collection('uploads').where('user_id', '==', req.user.uid);
        if (projectId) query = query.where('project_id', '==', projectId);
        if (type) query = query.where('type', '==', type);

        const snap = await query.get();
        const uploads = [];
        snap.forEach(doc => uploads.push({ id: doc.id, ...doc.data() }));
        uploads.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

        res.status(200).json({ success: true, uploads });
    } catch (err) {
        console.error('[Upload] Failed to list uploads:', err.message);
        res.status(500).json({ success: false, error: 'Failed to fetch uploads' });
    }
});

module.exports = router;
