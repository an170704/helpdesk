const pool = require('../../config/db');

const KEY_PROVIDER = 'llm_provider';
const KEY_BASE_URL = 'llm_base_url';
const KEY_MODEL = 'llm_model';
const KEY_API_KEY = 'llm_api_key';
const KEY_CHATBOT_ENABLED = 'chatbot_enabled';
const KEY_CHATBOT_USE_KB = 'chatbot_use_kb';
const KEY_DEFAULT_BUSINESS_HOURS = 'default_business_hours';
const KEY_DEFAULT_MAX_OPEN_TICKETS = 'default_max_open_tickets';

const DEFAULT_PROVIDER = 'gemini';

// All presets speak the OpenAI-compatible chat completions format
const PROVIDERS = {
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-flash-latest',
  },
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'meta-llama/llama-3.3-70b-instruct:free',
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-flash',
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
  },
  ollama: {
    baseUrl: 'http://localhost:11434/v1',
    model: 'llama3.1',
  },
};

async function getValue(key) {
  const { rows } = await pool.query('SELECT value FROM settings WHERE key = $1', [key]);
  return rows[0] ? rows[0].value : null;
}

async function setValue(key, value) {
  await pool.query(
    `INSERT INTO settings (key, value, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, value]
  );
}

async function remove(key) {
  await pool.query('DELETE FROM settings WHERE key = $1', [key]);
}

async function getChatbotConfig() {
  const [provider, baseUrl, model, apiKey] = await Promise.all([
    getValue(KEY_PROVIDER),
    getValue(KEY_BASE_URL),
    getValue(KEY_MODEL),
    getValue(KEY_API_KEY),
  ]);

  const active = provider && (provider === 'custom' || PROVIDERS[provider]) ? provider : DEFAULT_PROVIDER;
  const preset = PROVIDERS[active] || PROVIDERS[DEFAULT_PROVIDER];

  return {
    provider: active,
    baseUrl: baseUrl || preset.baseUrl,
    model: model || preset.model,
    apiKey: apiKey || '',
  };
}

// Chat widget is shown unless the admin explicitly turned it off
async function isChatbotEnabled() {
  const value = await getValue(KEY_CHATBOT_ENABLED);
  return value !== 'false';
}

// The Knowledge Base is used unless the admin turns it off for ticket-only answers
async function isKbEnabled() {
  const value = await getValue(KEY_CHATBOT_USE_KB);
  return value !== 'false';
}

// Returns the stored default schedule, or null when it was never customized
async function getDefaultBusinessHours() {
  const raw = await getValue(KEY_DEFAULT_BUSINESS_HOURS);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

module.exports = {
  KEY_PROVIDER,
  KEY_BASE_URL,
  KEY_MODEL,
  KEY_API_KEY,
  KEY_CHATBOT_ENABLED,
  KEY_CHATBOT_USE_KB,
  KEY_DEFAULT_BUSINESS_HOURS,
  KEY_DEFAULT_MAX_OPEN_TICKETS,
  DEFAULT_PROVIDER,
  PROVIDERS,
  getValue,
  setValue,
  remove,
  getChatbotConfig,
  isChatbotEnabled,
  isKbEnabled,
  getDefaultBusinessHours,
};
