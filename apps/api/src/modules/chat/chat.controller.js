const AppError = require('../../utils/AppError');
const chatService = require('./chat.service');
const settingService = require('../settings/setting.service');

async function status(req, res) {
  res.json({ enabled: await settingService.isChatbotEnabled() });
}

async function chat(req, res) {
  const body = req.body || {};
  const question = body.question ? String(body.question).trim() : '';

  if (!question) {
    throw new AppError(400, 'question is required');
  }
  if (question.length > 2000) {
    throw new AppError(400, 'question is too long (max 2000 characters)');
  }

  const history = Array.isArray(body.history) ? body.history : [];
  const result = await chatService.ask({ question, history });
  res.json(result);
}

module.exports = { status, chat };
