<script setup>
import { ref } from 'vue'
import { createTicket, uploadAttachments } from '../../api/tickets'
import { PRIORITY_BADGE } from '../../utils/status'
import CategoryBadge from '../../components/CategoryBadge.vue'

const subject = ref('')
const description = ref('')
const priority = ref('medium')
const files = ref([])
const fileInput = ref(null)
const error = ref('')
const loading = ref(false)
const result = ref(null)

function onFilesChange(event) {
  files.value = Array.from(event.target.files)
}

async function handleSubmit() {
  if (!subject.value.trim() || !description.value.trim()) {
    error.value = 'Subject and description are required'
    return
  }

  error.value = ''
  result.value = null
  loading.value = true

  try {
    const ticket = await createTicket({
      subject: subject.value.trim(),
      description: description.value.trim(),
      priority: priority.value,
    })

    let attachments = []
    if (files.value.length) {
      attachments = await uploadAttachments(ticket.id, files.value)
    }

    result.value = { ticket, attachments }
    subject.value = ''
    description.value = ''
    priority.value = 'medium'
    files.value = []
    fileInput.value.value = ''
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to create ticket'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="card form-card">
    <h2>New Ticket</h2>

    <form @submit.prevent="handleSubmit">
      <label for="subject">Subject</label>
      <input id="subject" v-model="subject" type="text" placeholder="e.g. internet not working" />

      <label for="description">Description</label>
      <textarea id="description" v-model="description" rows="4" placeholder="Describe the issue..."></textarea>

      <label for="priority">Priority</label>
      <select id="priority" v-model="priority">
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>

      <label for="attachments">Attachments</label>
      <input
        id="attachments"
        ref="fileInput"
        type="file"
        accept=".png,.jpg,.jpeg,.gif,.webp"
        multiple
        @change="onFilesChange"
      />
      <p class="field-hint muted small">Optional — screenshots. Up to 5 files, 5MB each.</p>

      <p v-if="error" class="error">{{ error }}</p>

      <button class="btn" type="submit" :disabled="loading">
        {{ loading ? 'Submitting...' : 'Submit ticket' }}
      </button>
    </form>

    <div v-if="result" class="result-box">
      <p>
        Ticket <b class="mono">#{{ result.ticket.id }}</b> created
        (<span class="badge" :class="PRIORITY_BADGE[result.ticket.priority]">{{ result.ticket.priority }}</span>)
        — AI classified it as
        <CategoryBadge :category="result.ticket.category_name" :parent="result.ticket.category_parent_name" />
      </p>
      <p v-if="result.attachments.length" class="muted small">
        {{ result.attachments.length }} attachment(s) uploaded.
      </p>
      <router-link to="/tickets" class="link">View my tickets</router-link>
    </div>
  </section>
</template>
