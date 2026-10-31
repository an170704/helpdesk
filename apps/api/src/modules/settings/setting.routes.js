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
router.post('/demo/refresh-example-due', settingController.refreshExampleDue);
router.post('/demo/reset-agent-last-assigned', settingController.resetAgentLastAssigned);

module.exports = router;
