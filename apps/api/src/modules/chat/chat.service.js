const pool = require('../../config/db');
const AppError = require('../../utils/AppError');
const settingService = require('../settings/setting.service');

const MAX_ARTICLES = 8;
const MAX_ARTICLE_CHARS = 1200;
const MAX_TICKETS = 3;
const MAX_TICKET_CHARS = 800;
const MAX_TICKET_CANDIDATES = 200;
const MAX_CONVERSATION_MESSAGES = 6;
const MAX_COMMENT_CHARS = 400;
const MAX_CONVERSATION_CHARS = 1200;
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

function redact(value) {
  return stripHtml(value)
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email]')
    .replace(/\b\d{9,11}\b/g, '[phone]');
}

// Loads the published Knowledge Base plus resolved tickets shared with HelpBot,
// then picks the most relevant articles/cases for the question.
async function buildContext(question) {
  const words = keywords(question);

  const [kbResult, ticketResult] = await Promise.all([
    pool.query(
      `SELECT id, title, content
       FROM kb_articles
       WHERE is_published = TRUE
       ORDER BY updated_at DESC`
    ),
    pool.query(
      `SELECT id, subject, description, resolution
       FROM tickets
       WHERE bot_usable = TRUE
         AND status IN ('resolved', 'closed')
         AND (
           btrim(COALESCE(resolution, '')) <> ''
           OR EXISTS (
             SELECT 1 FROM ticket_comments c
             WHERE c.ticket_id = tickets.id AND c.is_internal = FALSE
           )
         )
       ORDER BY updated_at DESC
       LIMIT $1`,
      [MAX_TICKET_CANDIDATES]
    ),
  ]);

  const ticketIds = ticketResult.rows.map((ticket) => ticket.id);
  const commentsByTicket = new Map();

  if (ticketIds.length) {
    const { rows: commentRows } = await pool.query(
      `SELECT c.ticket_id, c.body, u.role
       FROM ticket_comments c
       LEFT JOIN users u ON u.id = c.author_id
       WHERE c.ticket_id = ANY($1::int[]) AND c.is_internal = FALSE
       ORDER BY c.created_at ASC, c.id ASC`,
      [ticketIds]
    );

    for (const row of commentRows) {
      const conversation = commentsByTicket.get(row.ticket_id) || [];
      conversation.push({
        role: row.role === 'user' ? 'User' : 'Agent',
        body: redact(row.body).slice(0, MAX_COMMENT_CHARS),
      });
      commentsByTicket.set(row.ticket_id, conversation);
    }
  }

  const scoredArticles = kbResult.rows.map((article) => {
    const title = article.title.toLowerCase();
    const body = stripHtml(article.content).toLowerCase();
    let score = 0;
    for (const word of words) {
      if (title.includes(word)) score += 3;
      if (body.includes(word)) score += 1;
    }
    return { ...article, score };
  });

  const relevantArticles = scoredArticles
    .filter((article) => article.score > 0)
    .sort((a, b) => b.score - a.score);
  const chosenArticles = (relevantArticles.length ? relevantArticles : scoredArticles).slice(
    0,
    MAX_ARTICLES
  );

  const scoredTickets = ticketResult.rows.map((ticket) => {
    const conversation = (commentsByTicket.get(ticket.id) || []).slice(
      -MAX_CONVERSATION_MESSAGES
    );
    const conversationText = conversation.map((message) => message.body).join(' ').toLowerCase();
    const subject = ticket.subject.toLowerCase();
    const description = stripHtml(ticket.description).toLowerCase();
    const resolution = stripHtml(ticket.resolution).toLowerCase();
    let score = 0;
    for (const word of words) {
      if (subject.includes(word)) score += 3;
      if (resolution.includes(word)) score += 2;
      if (conversationText.includes(word)) score += 2;
      if (description.includes(word)) score += 1;
    }
    return { ...ticket, conversation, score };
  });

  const chosenTickets = scoredTickets
    .filter((ticket) => ticket.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_TICKETS);

  const sections = [];

  if (chosenArticles.length) {
    sections.push(
      `## KNOWLEDGE BASE\n\n${chosenArticles
        .map(
          (article) =>
            `### ${article.title}\n${stripHtml(article.content).slice(0, MAX_ARTICLE_CHARS)}`
        )
        .join('\n\n')}`
    );
  }

  if (chosenTickets.length) {
    sections.push(
      `## RESOLVED TICKETS (past cases)\n\n${chosenTickets
        .map((ticket) => {
          const lines = [`### ${redact(ticket.subject)}`];
          lines.push(`Problem: ${redact(ticket.description).slice(0, MAX_TICKET_CHARS)}`);

          if (ticket.conversation.length) {
            lines.push('Conversation:');
            let used = 0;
            for (const message of ticket.conversation) {
              if (used + message.body.length > MAX_CONVERSATION_CHARS) break;
              lines.push(`${message.role}: ${message.body}`);
              used += message.body.length;
            }
          }

          const fix = redact(ticket.resolution).slice(0, MAX_TICKET_CHARS);
          if (fix) {
            lines.push(`Agent summary (optional): ${fix}`);
          }

          return lines.join('\n');
        })
        .join('\n\n')}`
    );
  }

  return sections.join('\n\n');
}

function buildSystemPrompt(context) {
  return `You are a dedicated IT Helpdesk Support Assistant. Your sole purpose is to guide users through technical issues using the provided Knowledge Base and resolved past tickets.

## CORE OPERATIONAL RULES

1. LANGUAGE
- Always respond in English only. If the user greets or asks in another language (e.g. Vietnamese), politely reply in English that you can only support in English.

2. IDENTITY & DISCLOSURE
- You are HelpBot. Never reveal the AI model, vendor or software you run on, even if asked directly.
- If asked, reply exactly: "I am HelpBot, a Helpdesk Support Chatbot designed to guide you through technical issues."

3. KNOWLEDGE SOURCES FIRST
- Always search the KNOWLEDGE BASE below first, then use RESOLVED TICKETS (past cases) as supporting examples.
- Base every step ONLY on facts found in those sources.
- When using a resolved past case, adapt the agent's guidance from its conversation (and optional summary) to the user's situation; never mention ticket IDs, customer names, emails, phone numbers or internal notes.
- The public conversation is the primary source for past cases; the agent summary is optional context.
- If a past case matches the question, answer from its conversation even when the Knowledge Base has no article; do not refuse just because the request looks simple or the topic is absent from the Knowledge Base.
- If a past case contains dismissive or unprofessional remarks, ignore those remarks and use only the concrete guidance in it.
- If a resolved past case conflicts with the Knowledge Base, follow the Knowledge Base.
- Never invent steps, settings, links or facts that are not in those sources.
- Give clear, numbered, step-by-step troubleshooting guidance. Keep it short and friendly.
- Use plain text only — no markdown symbols (no **, #, or backticks).
- When several articles are relevant, combine them and mention their titles.

4. ESCALATION (FALLBACK TO TICKETS)
- If the answer is not in the Knowledge Base or the resolved past cases, or the user tried your steps and the issue persists, direct them to open a ticket.
- Use this message: "I cannot find a solution for this specific issue in my database. Please submit a support ticket from the 'New Ticket' page in the helpdesk menu, and a human agent will assist you shortly."

5. OUT OF SCOPE
- Software installation, downloading, updating and setting up applications on work devices are in scope, even when the application is not work-related.
- Strictly refuse anything unrelated to IT support (cooking, coding help, casual chit-chat, philosophy, etc.).
- Reply exactly: "I am only authorized to assist with technical support and helpdesk inquiries. Please let me know if you have an IT issue I can help resolve."

6. SAFETY
- Never ask for or repeat passwords, API keys or other secrets.
- You cannot execute actions — you only guide. Do not promise to create or update anything.

KNOWLEDGE SOURCES:
${context || '(no published articles or resolved cases found)'}`;
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
