<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getGeneralSettings, saveGeneralSettings } from '../../api/settings'
import { DEFAULT_BUSINESS_HOURS, normalizeSchedule } from '../../utils/businessHours'
import BusinessHoursEditor from '../../components/BusinessHoursEditor.vue'

const router = useRouter()

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const notice = ref(null)
const schedule = ref(normalizeSchedule(DEFAULT_BUSINESS_HOURS))

let noticeTimer = null

function showNotice(text, type = 'ok') {
  notice.value = { text, type }
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => (notice.value = null), 4000)
}

onMounted(async () => {
  try {
    const data = await getGeneralSettings()
    schedule.value = normalizeSchedule(data.default_business_hours || DEFAULT_BUSINESS_HOURS)
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load the default business hours'
  } finally {
    loading.value = false
  }
})

async function save() {
  error.value = ''
  saving.value = true
  try {
    const data = await saveGeneralSettings({
      default_business_hours: {
        ...schedule.value,
        holidays: schedule.value.holidays.filter(Boolean),
      },
    })
    schedule.value = normalizeSchedule(data.default_business_hours)
    showNotice('Default business hours saved')
  } catch (err) {
    error.value = err.response?.data?.message || 'Could not save the default business hours'
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

    <section class="card" style="margin-top: 14px">
      <h2>Default business hours</h2>
      <p class="muted small">
        Used by groups that do not define their own schedule and by automatic assignment.
      </p>

      <p v-if="loading" class="muted">Loading...</p>

      <template v-else>
        <BusinessHoursEditor :schedule="schedule" :disabled="saving" />

        <div class="row form-actions">
          <button class="btn" type="button" :disabled="saving" @click="save">
            {{ saving ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </template>
    </section>
  </div>
</template>
