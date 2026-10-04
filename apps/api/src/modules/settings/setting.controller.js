const AppError = require('../../utils/AppError');
const settingService = require('./setting.service');

const { PROVIDERS, KEY_PROVIDER, KEY_BASE_URL, KEY_MODEL, KEY_API_KEY, KEY_CHATBOT_ENABLED } = settingService;

function maskKey(key) {
  if (!key) return '';
  return key.length <= 4 ? '••••' : `••••${key.slice(-4)}`;
}

async function getChatbot(req, res) {
  const config = await settingService.getChatbotConfig();
  const enabled = await settingService.isChatbotEnabled();

  res.json({
    settings: {
      provider: config.provider,
      baseUrl: config.baseUrl,
      model: config.model,
      apiKeySet: !!config.apiKey,
      apiKeyMasked: maskKey(config.apiKey),
      enabled,
    },
  });
}

async function updateChatbot(req, res) {
  const { provider, base_url, model, api_key, enabled } = req.body || {};

  if (enabled !== undefined) {
    if (typeof enabled !== 'boolean') {
      throw new AppError(400, 'enabled must be a boolean');
    }
    await settingService.setValue(KEY_CHATBOT_ENABLED, enabled ? 'true' : 'false');
  }

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
  const config = await settingService.getChatbotConfig();

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
