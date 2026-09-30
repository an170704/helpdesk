const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { authenticate } = require('../../middlewares/auth');
const AppError = require('../../utils/AppError');
const attachmentController = require('./attachment.controller');

const UPLOAD_DIR = path.join(__dirname, '..', '..', '..', 'uploads', 'attachments');
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
const MAX_FILES = 5;
const MAX_SIZE = 5 * 1024 * 1024;

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE, files: MAX_FILES },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, ALLOWED_EXTENSIONS.includes(ext));
  },
});

const router = Router();

router.post('/:id/attachments', authenticate, (req, res, next) => {
  upload.array('files', MAX_FILES)(req, res, (err) => {
    if (err) {
      return next(new AppError(400, `Upload failed: ${err.message}`));
    }
    next();
  });
}, attachmentController.uploadAttachments);

module.exports = router;
