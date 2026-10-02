const { Router } = require('express');
const { authenticate } = require('../../middlewares/auth');
const upload = require('../../middlewares/upload');
const AppError = require('../../utils/AppError');
const attachmentController = require('./attachment.controller');

const router = Router();

router.post('/:id/attachments', authenticate, (req, res, next) => {
  upload.array('files', 5)(req, res, (err) => {
    if (err) {
      return next(new AppError(400, `Upload failed: ${err.message}`));
    }
    next();
  });
}, attachmentController.uploadAttachments);

module.exports = router;
