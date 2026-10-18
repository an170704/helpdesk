const { Router } = require('express');
const { authenticate, requireRole } = require('../../middlewares/auth');
const settingController = require('./setting.controller');

const router = Router();

router.use(authenticate);
router.use(requireRole('admin'));

router.get('/chatbot', settingController.getChatbot);
router.put('/chatbot', settingController.updateChatbot);
router.post('/chatbot/test', settingController.testChatbot);
router.get('/general', settingController.getGeneral);
router.put('/general', settingController.updateGeneral);

module.exports = router;
