const { Router } = require('express');
const { authenticate } = require('../../middlewares/auth');
const chatController = require('./chat.controller');

const router = Router();

router.use(authenticate);

router.get('/status', chatController.status);
router.post('/', chatController.chat);

module.exports = router;
