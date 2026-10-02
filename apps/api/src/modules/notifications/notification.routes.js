const { Router } = require('express');
const { authenticate } = require('../../middlewares/auth');
const notificationController = require('./notification.controller');

const router = Router();

router.use(authenticate);

router.get('/', notificationController.listNotifications);
router.delete('/', notificationController.clearNotifications);
router.patch('/read-all', notificationController.markAllRead);
router.patch('/:id/read', notificationController.markRead);
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
