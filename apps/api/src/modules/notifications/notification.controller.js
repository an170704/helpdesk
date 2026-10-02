const AppError = require('../../utils/AppError');
const notificationService = require('./notification.service');

async function listNotifications(req, res) {
  const result = await notificationService.findForUser(req.user.id);
  res.json(result);
}

async function markRead(req, res) {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) {
    throw new AppError(400, 'Invalid ID');
  }

  await notificationService.markRead(id, req.user.id);
  res.json({ message: 'Marked as read' });
}

async function markAllRead(req, res) {
  await notificationService.markAllRead(req.user.id);
  res.json({ message: 'All marked as read' });
}

async function deleteNotification(req, res) {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) {
    throw new AppError(400, 'Invalid ID');
  }

  await notificationService.remove(id, req.user.id);
  res.status(204).end();
}

async function clearNotifications(req, res) {
  await notificationService.removeAll(req.user.id);
  res.status(204).end();
}

module.exports = { listNotifications, markRead, markAllRead, deleteNotification, clearNotifications };
