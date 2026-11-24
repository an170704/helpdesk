const AppError = require('../../utils/AppError');
const chatService = require('./chat.service');
const settingService = require('../settings/setting.service');

async function status(req, res) {
  res.json({ enabled: await settingService.isChatbotEnabled() });
}

function normalizeSessionId(value) {
  if (value === undefined || value === null || value === '') return null;
  const sessionId = String(value).trim();
  if (!/^[A-Za-z0-9-]{1,64}$/.test(sessionId)) {
    throw new AppError(400, 'Invalid session_id');
  }
  return sessionId;
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
  const sessionId = normalizeSessionId(body.session_id);
  const result = await chatService.ask({
    question,
    history,
    userId: req.user.id,
    sessionId,
  });
  res.json(result);
}

async function listTranscripts(req, res) {
  const requested = Number(req.query.limit);
  const limit = Number.isInteger(requested) && requested > 0 ? Math.min(requested, 500) : 100;
  const sessions = await chatService.listSessions(limit);
  res.json({ sessions });
}

async function getTranscript(req, res) {
  const sessionId = normalizeSessionId(req.params.sessionId);
  const messages = sessionId ? await chatService.findTranscript(sessionId) : [];
  res.json({ session_id: sessionId, messages });
}

module.exports = { status, chat, listTranscripts, getTranscript };
