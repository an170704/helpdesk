const AppError = require('../../utils/AppError');
const pool = require('../../config/db');
const businessHours = require('../../utils/businessHours');
const settingService = require('./setting.service');

const { PROVIDERS, KEY_PROVIDER, KEY_BASE_URL, KEY_MODEL, KEY_API_KEY, KEY_CHATBOT_ENABLED, KEY_CHATBOT_USE_KB, KEY_DEFAULT_BUSINESS_HOURS, KEY_DEFAULT_MAX_OPEN_TICKETS } = settingService;

const DEFAULT_MAX_OPEN_TICKETS = 5;

function maskKey(key) {
  if (!key) return '';
  return key.length <= 4 ? '••••' : `••••${key.slice(-4)}`;
}

async function getChatbot(req, res) {
  const config = await settingService.getChatbotConfig();
  const enabled = await settingService.isChatbotEnabled();
  const useKb = await settingService.isKbEnabled();

  res.json({
    settings: {
      provider: config.provider,
      baseUrl: config.baseUrl,
      model: config.model,
      apiKeySet: !!config.apiKey,
      apiKeyMasked: maskKey(config.apiKey),
      enabled,
      useKb,
    },
  });
}

async function updateChatbot(req, res) {
  const { provider, base_url, model, api_key, enabled, use_kb } = req.body || {};

  if (enabled !== undefined) {
    if (typeof enabled !== 'boolean') {
      throw new AppError(400, 'enabled must be a boolean');
    }
    await settingService.setValue(KEY_CHATBOT_ENABLED, enabled ? 'true' : 'false');
  }

  if (use_kb !== undefined) {
    if (typeof use_kb !== 'boolean') {
      throw new AppError(400, 'use_kb must be a boolean');
    }
    await settingService.setValue(KEY_CHATBOT_USE_KB, use_kb ? 'true' : 'false');
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

async function readGeneralSettings() {
  const [businessHoursRaw, maxOpenTicketsRaw] = await Promise.all([
    settingService.getValue(KEY_DEFAULT_BUSINESS_HOURS),
    settingService.getValue(KEY_DEFAULT_MAX_OPEN_TICKETS),
  ]);

  let defaultBusinessHours = businessHours.DEFAULT_BUSINESS_HOURS;
  if (businessHoursRaw) {
    try {
      defaultBusinessHours = JSON.parse(businessHoursRaw);
    } catch {
      defaultBusinessHours = businessHours.DEFAULT_BUSINESS_HOURS;
    }
  }

  const defaultMaxOpenTickets =
    maxOpenTicketsRaw != null && /^\d+$/.test(maxOpenTicketsRaw)
      ? Number(maxOpenTicketsRaw)
      : DEFAULT_MAX_OPEN_TICKETS;

  return {
    default_business_hours: defaultBusinessHours,
    default_max_open_tickets: defaultMaxOpenTickets,
  };
}

async function getGeneral(req, res) {
  res.json(await readGeneralSettings());
}

async function updateGeneral(req, res) {
  const body = req.body || {};

  if (body.default_business_hours !== undefined) {
    const validated = businessHours.validateBusinessHours(body.default_business_hours);
    await settingService.setValue(KEY_DEFAULT_BUSINESS_HOURS, JSON.stringify(validated));
  }

  if (body.default_max_open_tickets !== undefined) {
    const value = Number(body.default_max_open_tickets);
    if (!Number.isInteger(value) || value < 0) {
      throw new AppError(400, 'default_max_open_tickets must be a non-negative integer');
    }
    await settingService.setValue(KEY_DEFAULT_MAX_OPEN_TICKETS, String(value));
  }

  res.json(await readGeneralSettings());
}

async function refreshExampleDue(req, res) {
  const { rows } = await pool.query(
    `UPDATE tickets
     SET due_at = now() + interval '2 days', updated_at = now()
     WHERE group_id IN (SELECT id FROM groups WHERE lower(name) = 'test')
       AND subject ILIKE 'Example %'
       AND status IN ('pending', 'in_progress')
     RETURNING id`
  );

  res.json({ updated: rows.length });
}

async function resetAgentLastAssigned(req, res) {
  const { rows } = await pool.query(
    `UPDATE users AS u
     SET last_assigned_at = v.last_assigned_at
     FROM (VALUES
       ('t1@company.com', timestamptz '2026-10-30 13:30:00+07'),
       ('t2@company.com', timestamptz '2026-10-30 14:00:00+07'),
       ('t3@company.com', timestamptz '2026-10-30 14:30:00+07'),
       ('t4@company.com', timestamptz '2026-10-30 15:00:00+07'),
       ('t5@company.com', timestamptz '2026-10-30 15:30:00+07'),
       ('t6@company.com', timestamptz '2026-10-30 16:00:00+07')
     ) AS v(email, last_assigned_at)
     WHERE u.email = v.email
     RETURNING u.id`
  );

  res.json({ updated: rows.length });
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

module.exports = {
  getChatbot,
  updateChatbot,
  testChatbot,
  getGeneral,
  updateGeneral,
  refreshExampleDue,
  resetAgentLastAssigned,
};
