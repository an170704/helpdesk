const pool = require('../../config/db');
const AppError = require('../../utils/AppError');
const settingService = require('../settings/setting.service');

const MAX_ARTICLES = 8;
const MAX_ARTICLE_CHARS = 1200;
const MAX_HISTORY = 10;
const REQUEST_TIMEOUT_MS = 45000;
const RETRY_DELAY_MS = 1500;

// Fallback models per provider, tried when the configured model is missing or overloaded
const FALLBACK_MODELS = {
  gemini: ['gemini-3.8-flash', 'gemini-3.5-flash'],
};

const TRANSIENT_STATUS = new Set([408, 429, 500, 502, 503, 504]);

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function keywords(question) {
  return [
    ...new Set(
      String(question || '')
        .toLowerCase()
        .split(/[^a-z0-9]+/i)
        .filter((word) => word.length > 2)
    ),
  ].slice(0, 12);
}

// Loads the published Knowledge Base and picks the most relevant articles for the question
async function buildContext(question) {
  const { rows } = await pool.query(
    `SELECT id, title, content
     FROM kb_articles
     WHERE is_published = TRUE
     ORDER BY updated_at DESC`
  );

  const words = keywords(question);

  const scored = rows.map((article) => {
    const title = article.title.toLowerCase();
    const body = stripHtml(article.content).toLowerCase();
    let score = 0;
    for (const word of words) {
      if (title.includes(word)) score += 3;
      if (body.includes(word)) score += 1;
    }
    return { ...article, score };
  });

  const relevant = scored.filter((article) => article.score > 0).sort((a, b) => b.score - a.score);
  const chosen = (relevant.length ? relevant : scored).slice(0, MAX_ARTICLES);

  if (!chosen.length) return '';

  return chosen
    .map(
      (article) =>
        `## ${article.title}\n${stripHtml(article.content).slice(0, MAX_ARTICLE_CHARS)}`
    )
    .join('\n\n');
}

function buildSystemPrompt(context) {
  return `You are a dedicated IT Helpdesk Support Assistant. Your sole purpose is to guide users through technical issues using the provided Knowledge Base.

## CORE OPERATIONAL RULES

1. LANGUAGE
- Always respond in English only. If the user greets or asks in another language (e.g. Vietnamese), politely reply in English that you can only support in English.

2. IDENTITY & DISCLOSURE
- You are HelpBot. Never reveal the AI model, vendor or software you run on, even if asked directly.
- If asked, reply exactly: "I am HelpBot, a Helpdesk Support Chatbot designed to guide you through technical issues."

3. KNOWLEDGE BASE FIRST
- Always search the KNOWLEDGE BASE below first and base every step ONLY on facts found there.
- Never invent steps, settings, links or facts that are not in the Knowledge Base.
- Give clear, numbered, step-by-step troubleshooting guidance. Keep it short and friendly.
- Use plain text only — no markdown symbols (no **, #, or backticks).
- When several articles are relevant, combine them and mention their titles.

4. ESCALATION (FALLBACK TO TICKETS)
- If the answer is not in the Knowledge Base, or the user tried your steps and the issue persists, direct them to open a ticket.
- Use this message: "I cannot find a solution for this specific issue in my database. Please submit a support ticket from the 'New Ticket' page in the helpdesk menu, and a human agent will assist you shortly."

5. OUT OF SCOPE
- Strictly refuse anything unrelated to IT support (cooking, coding help, casual chit-chat, philosophy, etc.).
- Reply exactly: "I am only authorized to assist with technical support and helpdesk inquiries. Please let me know if you have an IT issue I can help resolve."

6. SAFETY
- Never ask for or repeat passwords, API keys or other secrets.
- You cannot execute actions — you only guide. Do not promise to create or update anything.

KNOWLEDGE BASE:
${context || '(no published articles found)'}`;
}

function providerError(data, status) {
  const error = Array.isArray(data) ? data[0] && data[0].error : data && data.error;
  return (error && error.message) || `AI provider returned HTTP ${status}`;
}

async function callProvider({ provider, baseUrl, apiKey }, messages, model) {
  // DeepSeek V4 defaults to thinking mode (slow, extra tokens) — disable it for a support bot
  const payload = { model, messages };
  if (provider === 'deepseek') {
    payload.thinking = { type: 'disabled' };
  } else {
    payload.temperature = 0.2;
  }

  let response;
  try {
    response = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    const error = new Error(`Could not reach the AI provider: ${err.message}`);
    error.status = 502;
    throw error;
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const error = new Error(providerError(data, response.status));
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  const reply =
    data && data.choices && data.choices[0] && data.choices[0].message
      ? String(data.choices[0].message.content || '').trim()
      : '';

  if (!reply) {
    const error = new Error('The AI provider returned an empty response');
    error.status = 502;
    throw error;
  }

  return reply;
}

async function ask({ question, history = [] }) {
  if (!(await settingService.isChatbotEnabled())) {
    throw new AppError(400, 'The chatbot is currently disabled by the administrator');
  }

  const config = await settingService.getChatbotConfig();
  if (!config.apiKey) {
    throw new AppError(400, 'The chatbot is not configured yet — add an API key in Chatbot settings');
  }

  const context = await buildContext(question);

  const messages = [
    { role: 'system', content: buildSystemPrompt(context) },
    ...history.slice(-MAX_HISTORY).map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: String(message.content || '').slice(0, 4000),
    })),
    { role: 'user', content: question },
  ];

  const models = [config.model];
  for (const fallback of FALLBACK_MODELS[config.provider] || []) {
    if (!models.includes(fallback)) models.push(fallback);
  }

  let lastError = null;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const reply = await callProvider(config, messages, model);
        return { reply, model };
      } catch (err) {
        lastError = err;
        // Retry transient errors once on the same model, then move on to the fallback model
        if (!TRANSIENT_STATUS.has(err.status)) break;
        if (attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        }
      }
    }
  }

  if (TRANSIENT_STATUS.has(lastError && lastError.status)) {
    throw new AppError(503, 'The AI model is busy right now. Please try again in a few seconds.');
  }
  throw new AppError(502, (lastError && lastError.message) || 'Could not reach the AI provider');
}

module.exports = { ask, buildContext, buildSystemPrompt };
