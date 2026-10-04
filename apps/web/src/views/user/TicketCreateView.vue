<script setup>
import { computed, onMounted, ref } from 'vue'
import { createTicket, uploadAttachments, getTickets } from '../../api/tickets'
import { getGroupOptions } from '../../api/groups'
import { getCategories } from '../../api/categories'
import { getArticles } from '../../api/kb'
import StatusBadge from '../../components/StatusBadge.vue'
import RichTextEditor from '../../components/RichTextEditor.vue'
import CategorySelect from '../../components/CategorySelect.vue'

const subject = ref('')
const description = ref('')
const priority = ref('medium')
const categoryValue = ref('')
const groups = ref([])
const categories = ref([])
const articles = ref([])
const files = ref([])
const fileInput = ref(null)
const error = ref('')
const loading = ref(false)
const result = ref(null)
const recentTickets = ref([])

function onFilesChange(event) {
  files.value = Array.from(event.target.files)
}

async function loadRecent() {
  try {
    recentTickets.value = (await getTickets()).slice(0, 5)
  } catch {
    recentTickets.value = []
  }
}

async function loadOptions() {
  try {
    const [groupList, categoryList, articleList] = await Promise.all([
      getGroupOptions(),
      getCategories(),
      getArticles(),
    ])
    groups.value = groupList
    categories.value = categoryList
    articles.value = articleList
  } catch {
    groups.value = []
    categories.value = []
    articles.value = []
  }
}

const suggestedArticles = computed(() => {
  const value = categoryValue.value
  if (!value) return []

  if (value.startsWith('c:')) {
    const id = Number(value.slice(2))
    return articles.value.filter((article) => article.category_id === id)
  }

  const groupId = Number(value.slice(2))
  return articles.value.filter((article) => article.group_id === groupId)
})

async function handleSubmit() {
  const plainDescription = description.value.replace(/<[^>]*>/g, ' ').trim()

  if (!subject.value.trim() || !plainDescription) {
    error.value = 'Subject and description are required'
    return
  }

  error.value = ''
  result.value = null
  loading.value = true

  try {
    const payload = {
      subject: subject.value.trim(),
      description: description.value.trim(),
      priority: priority.value,
    }

    if (categoryValue.value.startsWith('c:')) {
      payload.category_id = Number(categoryValue.value.slice(2))
    } else if (categoryValue.value.startsWith('g:')) {
      payload.group_id = Number(categoryValue.value.slice(2))
    }

    const ticket = await createTicket(payload)

    let attachments = []
    if (files.value.length) {
      attachments = await uploadAttachments(ticket.id, files.value)
    }

    result.value = { ticket, attachments }
    subject.value = ''
    description.value = ''
    priority.value = 'medium'
    categoryValue.value = ''
    files.value = []
    fileInput.value.value = ''
    await loadRecent()
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to create ticket'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadRecent()
  loadOptions()
})
</script>

<template>
  <div class="create-grid">
    <section class="card">
      <h2>New ticket</h2>

      <form @submit.prevent="handleSubmit">
        <label for="subject">Subject *</label>
        <input id="subject" v-model="subject" type="text" placeholder="e.g. internet not working" />

        <label for="priority">Priority</label>
        <select id="priority" v-model="priority">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>

        <label>Group → Category</label>
        <CategorySelect
          v-model="categoryValue"
          :groups="groups"
          :categories="categories"
          placeholder="Select a group or category..."
          allow-group
        />

        <label>Description *</label>
        <RichTextEditor v-model="description" placeholder="Describe the issue..." />

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

        <div class="row form-actions">
          <button class="btn" type="submit" :disabled="loading">
            {{ loading ? 'Submitting...' : 'Submit ticket' }}
          </button>
        </div>
      </form>

      <div v-if="result" class="result-box">
        <p>
          Ticket <b class="mono">{{ result.ticket.id }}</b> created. An admin will review and route it.
        </p>
        <p v-if="result.attachments.length" class="muted small">
          {{ result.attachments.length }} attachment(s) uploaded.
        </p>
        <router-link to="/tickets" class="link">View my tickets</router-link>
      </div>
    </section>

    <aside class="contact-side">
      <div class="card">
        <h3>Your recent tickets</h3>

        <p v-if="!recentTickets.length" class="muted small">No tickets yet.</p>

        <ul v-else class="mini-tickets">
          <li v-for="ticket in recentTickets" :key="ticket.id">
            <router-link :to="`/tickets/${ticket.id}`">
              <span class="mini-subject">{{ ticket.subject }} · {{ ticket.id }}</span>
              <StatusBadge :status="ticket.status" />
            </router-link>
          </li>
        </ul>
      </div>

      <div class="card">
        <h3>Helpful tip</h3>
        <p class="muted small">
          Before creating a ticket, check the FAQ for self-service guides — you may solve the issue
          in a minute without waiting for support.
        </p>
        <router-link to="/faq" class="link">Open FAQ</router-link>
      </div>

      <div v-if="suggestedArticles.length" class="card suggest-card">
        <h3>Related articles</h3>
        <ul class="mini-tickets">
          <li v-for="article in suggestedArticles.slice(0, 6)" :key="article.id">
            <router-link :to="`/faq/${article.id}`" target="_blank" rel="noopener">
              <span class="mini-subject">{{ article.title }}</span>
            </router-link>
          </li>
        </ul>
      </div>
    </aside>
  </div>
</template>
