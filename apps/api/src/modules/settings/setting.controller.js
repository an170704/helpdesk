const AppError = require('../../utils/AppError');
const settingService = require('./setting.service');

const KEY_PROVIDER = 'llm_provider';
const KEY_BASE_URL = 'llm_base_url';
const KEY_MODEL = 'llm_model';
const KEY_API_KEY = 'llm_api_key';

const DEFAULT_PROVIDER = 'gemini';

// All presets speak the OpenAI-compatible chat completions format
const PROVIDERS = {
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-2.0-flash',
  },
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'meta-llama/llama-3.3-70b-instruct:free',
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

function maskKey(key) {
  if (!key) return '';
  return key.length <= 4 ? '••••' : `••••${key.slice(-4)}`;
}

async function readConfig() {
  const [provider, baseUrl, model, apiKey] = await Promise.all([
    settingService.getValue(KEY_PROVIDER),
    settingService.getValue(KEY_BASE_URL),
    settingService.getValue(KEY_MODEL),
    settingService.getValue(KEY_API_KEY),
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

async function getChatbot(req, res) {
  const config = await readConfig();

  res.json({
    settings: {
      provider: config.provider,
      baseUrl: config.baseUrl,
      model: config.model,
      apiKeySet: !!config.apiKey,
      apiKeyMasked: maskKey(config.apiKey),
    },
  });
}

async function updateChatbot(req, res) {
  const { provider, base_url, model, api_key } = req.body || {};

  if (provider !== undefined) {
    if (provider !== 'custom' && !PROVIDERS[provider]) {
      throw new AppError(400, 'Invalid provider');
    }
    await settingService.setValue(KEY_PROVIDER, provider);
  }

  if (base_url !== undefined) {
    const value = String(base_url).trim().replace(/\/+$/, '');
    if (!/^https?:\/\//.test(value)) {
      throw new AppError(400, 'base_url must start with http:// or https://');
    }
    await settingService.setValue(KEY_BASE_URL, value);
  }

  if (model !== undefined) {
    const value = String(model).trim();
    if (!value) {
      throw new AppError(400, 'model cannot be empty');
    }
    await settingService.setValue(KEY_MODEL, value);
  }

  if (api_key !== undefined) {
    const value = String(api_key).trim();
    if (value === '') {
      await settingService.remove(KEY_API_KEY);
    } else if (value.length < 10) {
      throw new AppError(400, 'API key looks too short');
    } else {
      await settingService.setValue(KEY_API_KEY, value);
    }
  }

  res.json({ message: 'Saved' });
}

async function testChatbot(req, res) {
  const body = req.body || {};
  const config = await readConfig();

  const baseUrl = (body.base_url || config.baseUrl).replace(/\/+$/, '');
  const apiKey = body.api_key ? String(body.api_key).trim() : config.apiKey;

  const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};

  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers,
      signal: AbortSignal.timeout(8000),
    });

    if (response.ok) {
      const data = await response.json().catch(() => null);
      const count = data && Array.isArray(data.data) ? data.data.length : 0;
      return res.json({
        ok: true,
        message: `Connection OK${count ? ` — ${count} model(s) available` : ''}`,
      });
    }

    const data = await response.json().catch(() => null);
    res.json({
      ok: false,
      message:
        (data && data.error && data.error.message) || `Provider returned HTTP ${response.status}`,
    });
  } catch (err) {
    res.json({ ok: false, message: `Could not reach the provider: ${err.message}` });
  }
}

module.exports = { getChatbot, updateChatbot, testChatbot };
