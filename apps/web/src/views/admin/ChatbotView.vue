<script setup>
import { onMounted, ref, watch } from 'vue'
import { getChatbotSettings, saveChatbotSettings, testChatbot } from '../../api/settings'

const PROVIDER_PRESETS = {
  gemini: {
    label: 'Google Gemini (free tier)',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-flash-latest',
  },
  groq: {
    label: 'Groq — Llama (free tier)',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
  },
  openrouter: {
    label: 'OpenRouter (free models available)',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'meta-llama/llama-3.3-70b-instruct:free',
  },
  deepseek: {
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-flash',
  },
  openai: {
    label: 'OpenAI (paid)',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
  },
  ollama: {
    label: 'Ollama — local, offline (no key needed)',
    baseUrl: 'http://localhost:11434/v1',
    model: 'llama3.1',
  },
  custom: {
    label: 'Custom (OpenAI-compatible)',
    baseUrl: '',
    model: '',
  },
}

const settings = ref(null)
const loading = ref(true)
const saving = ref(false)
const testing = ref(false)
const error = ref('')
const notice = ref(null)

const provider = ref('gemini')
const baseUrl = ref('')
const model = ref('')
const apiKey = ref('')
const enabled = ref(true)

let noticeTimer = null

function showNotice(text, type = 'ok') {
  notice.value = { text, type }
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => (notice.value = null), 5000)
}

watch(provider, (value) => {
  const preset = PROVIDER_PRESETS[value]
  if (!preset || value === 'custom') return

  baseUrl.value = preset.baseUrl
  model.value = preset.model
  showNotice(`Preset applied: ${preset.label}`, 'ok')
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    settings.value = await getChatbotSettings()
    provider.value = settings.value.provider
    baseUrl.value = settings.value.baseUrl
    model.value = settings.value.model
    enabled.value = settings.value.enabled !== false
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load settings'
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  try {
    await saveChatbotSettings({
      provider: provider.value,
      base_url: baseUrl.value.trim(),
      model: model.value.trim(),
      enabled: enabled.value,
      ...(apiKey.value.trim() && { api_key: apiKey.value.trim() }),
    })
    apiKey.value = ''
    showNotice('Saved')
    await load()
  } catch (err) {
    showNotice(err.response?.data?.message || 'Could not save', 'error')
  } finally {
    saving.value = false
  }
}

async function test() {
  testing.value = true
  try {
    const result = await testChatbot({
      base_url: baseUrl.value.trim() || undefined,
      api_key: apiKey.value.trim() || undefined,
    })
    showNotice(result.message, result.ok ? 'ok' : 'error')
  } catch (err) {
    showNotice(err.response?.data?.message || 'Could not run the test', 'error')
  } finally {
    testing.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="card chatbot-form">
    <h2>Chatbot settings</h2>
    <p class="muted">
      Connect the help assistant to any OpenAI-compatible LLM provider. The key is stored server-side and never sent back in full.
    </p>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="loading" class="muted">Loading...</p>

    <template v-else>
      <p class="muted small">
        Current key:
        <b v-if="settings.apiKeySet" class="mono">{{ settings.apiKeyMasked }}</b>
        <span v-else>not configured</span>
      </p>

      <label class="checkbox-row">
        <input v-model="enabled" type="checkbox" />
        Show the HelpBot chat bubble to users
      </label>

      <label for="provider">Provider</label>
      <select id="provider" v-model="provider">
        <option v-for="(preset, key) in PROVIDER_PRESETS" :key="key" :value="key">
          {{ preset.label }}
        </option>
      </select>

      <label for="baseUrl">API base URL</label>
      <input id="baseUrl" v-model="baseUrl" type="text" placeholder="https://..." />

      <label for="model">Model</label>
      <input id="model" v-model="model" type="text" placeholder="gemini-2.0-flash" />

      <label for="apiKey">API key</label>
      <input
        id="apiKey"
        v-model="apiKey"
        type="password"
        placeholder="Paste a new key to replace the current one"
      />
      <p class="field-hint muted small">
        Gemini: free key at aistudio.google.com. Groq: console.groq.com. Ollama: no key needed.
        Leave empty to keep the current key.
      </p>

      <p v-if="notice" :class="notice.type === 'error' ? 'error' : 'notice-ok'">{{ notice.text }}</p>

      <div class="row form-actions">
        <button class="btn" type="button" :disabled="saving" @click="save">
          {{ saving ? 'Saving...' : 'Save' }}
        </button>
        <button class="btn btn-ghost" type="button" :disabled="testing" @click="test">
          {{ testing ? 'Testing...' : 'Test connection' }}
        </button>
      </div>
    </template>
  </section>
</template>
