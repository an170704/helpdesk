const { Router } = require('express');
const { authenticate } = require('../../middlewares/auth');
const upload = require('../../middlewares/upload');
const AppError = require('../../utils/AppError');
const commentController = require('./comment.controller');

const router = Router();

router.use(authenticate);

router.post('/:id/comments', (req, res, next) => {
  upload.array('files', 5)(req, res, (err) => {
    if (err) {
      return next(new AppError(400, `Upload failed: ${err.message}`));
    }
    next();
  });
}, commentController.createComment);

router.get('/:id/comments', commentController.listComments);

module.exports = router;
