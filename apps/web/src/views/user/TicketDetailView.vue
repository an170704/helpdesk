<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getTicket, getHistory } from '../../api/tickets'
import { PRIORITY_BADGE } from '../../utils/status'
import { formatDate } from '../../utils/format'
import StatusBadge from '../../components/StatusBadge.vue'
import CategoryBadge from '../../components/CategoryBadge.vue'

const route = useRoute()
const router = useRouter()

const ticket = ref(null)
const history = ref([])
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    ticket.value = await getTicket(route.params.id)
    history.value = await getHistory(route.params.id)
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load ticket'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="card">
    <button class="btn btn-ghost btn-small" @click="router.back()">Back</button>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="loading" class="muted">Loading...</p>

    <template v-else>
      <h2 class="detail-title">#{{ ticket.id }} — {{ ticket.subject }}</h2>

      <div class="meta-row">
        <StatusBadge :status="ticket.status" />
        <span class="badge" :class="PRIORITY_BADGE[ticket.priority]">{{ ticket.priority }}</span>
        <CategoryBadge :category="ticket.category_name" :confidence="ticket.confidence" />
      </div>

      <p class="description">{{ ticket.description }}</p>

      <div v-if="ticket.attachments && ticket.attachments.length" class="attachments">
        <h3>Attachments</h3>
        <ul>
          <li v-for="attachment in ticket.attachments" :key="attachment.id">
            <a :href="attachment.file_url" target="_blank" rel="noopener" class="link">
              {{ attachment.file_name }}
            </a>
            <span class="muted small"> · {{ formatDate(attachment.created_at) }}</span>
          </li>
        </ul>
      </div>

      <p class="muted small">
        Created by user #{{ ticket.created_by }} · {{ formatDate(ticket.created_at) }}
      </p>

      <h3>History</h3>
      <ul class="timeline">
        <li v-for="entry in history" :key="entry.id">
          <span class="time muted small mono">{{ formatDate(entry.created_at) }}</span>
          <template v-if="entry.action === 'created'">
            <b>{{ entry.actor_name }}</b> created the ticket ({{ entry.to_status }})
          </template>
          <template v-else>
            <b>{{ entry.actor_name }}</b>: {{ entry.from_status }} → <b>{{ entry.to_status }}</b>
            <span v-if="entry.note" class="muted">— "{{ entry.note }}"</span>
          </template>
        </li>
      </ul>
    </template>
  </section>
</template>
