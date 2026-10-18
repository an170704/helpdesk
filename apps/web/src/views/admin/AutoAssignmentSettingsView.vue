<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getGeneralSettings, saveGeneralSettings } from '../../api/settings'

const router = useRouter()

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const notice = ref(null)
const defaultCapacity = ref(5)

let noticeTimer = null

function showNotice(text, type = 'ok') {
  notice.value = { text, type }
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => (notice.value = null), 4000)
}

onMounted(async () => {
  try {
    const data = await getGeneralSettings()
    defaultCapacity.value = data.default_max_open_tickets ?? 5
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load the default capacity'
  } finally {
    loading.value = false
  }
})

async function save() {
  error.value = ''

  const value = Number(defaultCapacity.value)
  if (!Number.isInteger(value) || value < 0) {
    error.value = 'Default capacity must be a non-negative integer'
    return
  }

  saving.value = true
  try {
    const data = await saveGeneralSettings({ default_max_open_tickets: value })
    defaultCapacity.value = data.default_max_open_tickets
    showNotice('Default capacity saved')
  } catch (err) {
    error.value = err.response?.data?.message || 'Could not save the default capacity'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <button class="btn btn-ghost btn-small" @click="router.push('/settings')">Back to Settings</button>

    <p v-if="error" class="error" style="margin-top: 14px">{{ error }}</p>
    <p v-if="notice" :class="notice.type === 'error' ? 'error' : 'notice-ok'" style="margin-top: 12px">
      {{ notice.text }}
    </p>

    <section class="card" style="margin-top: 14px; max-width: 560px">
      <h2>Auto-assignment</h2>
      <p class="muted small">
        Agents at their open-ticket limit are skipped by automatic routing. Each agent can have a
        personal override in their profile; leave it empty to use this default.
      </p>

      <p v-if="loading" class="muted">Loading...</p>

      <template v-else>
        <label for="default-capacity">Default max open tickets per agent</label>
        <input id="default-capacity" v-model="defaultCapacity" type="number" min="0" step="1" />
        <p class="field-hint muted small">
          0 means agents are not auto-assigned until a personal limit is set. Only open tickets
          (pending + in progress) count.
        </p>

        <p class="muted small" style="margin-top: 14px">
          Routing mode (manual / round-robin / load-based) is configured per group on the group's
          <b>Assignment</b> tab. Business hours are stored separately for SLA/reporting.
        </p>

        <div class="row form-actions">
          <button class="btn" type="button" :disabled="saving" @click="save">
            {{ saving ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </template>
    </section>
  </div>
</template>
