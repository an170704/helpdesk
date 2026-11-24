const { Router } = require('express');
const { authenticate, requireRole } = require('../../middlewares/auth');
const chatController = require('./chat.controller');

const router = Router();

router.use(authenticate);

router.get('/status', chatController.status);
router.get('/transcripts', requireRole('admin'), chatController.listTranscripts);
router.get('/transcripts/:sessionId', requireRole('admin'), chatController.getTranscript);
router.post('/', chatController.chat);

module.exports = router;
