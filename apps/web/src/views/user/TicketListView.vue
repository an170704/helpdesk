<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getTickets } from '../../api/tickets'
import { PRIORITY_BADGE } from '../../utils/status'
import { formatDate } from '../../utils/format'
import StatusBadge from '../../components/StatusBadge.vue'
import CategoryBadge from '../../components/CategoryBadge.vue'

const route = useRoute()
const router = useRouter()

const tickets = ref([])
const loading = ref(true)
const error = ref('')
const statusFilter = ref('all')
const sortOrder = ref('newest')

const filteredTickets = computed(() => {
  let list = [...tickets.value]

  const status = statusFilter.value
  if (status === 'open') {
    list = list.filter((t) => t.status === 'pending' || t.status === 'in_progress')
  } else if (status !== 'all') {
    list = list.filter((t) => t.status === status)
  }

  list.sort((a, b) => {
    const diff = new Date(b.created_at) - new Date(a.created_at)
    return sortOrder.value === 'newest' ? diff : -diff
  })

  return list
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    tickets.value = await getTickets()
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load tickets'
  } finally {
    loading.value = false
  }
}

function openTicket(id) {
  router.push(`/tickets/${id}`)
}

watch(
  () => route.query.status,
  (value) => {
    statusFilter.value = value || 'all'
  }
)

onMounted(() => {
  statusFilter.value = route.query.status || 'all'
  load()
})
</script>

<template>
  <section class="card">
    <div class="card-head">
      <h2>My Tickets</h2>
      <div class="head-actions">
        <span class="muted small">{{ filteredTickets.length }} ticket(s)</span>
        <button class="btn btn-ghost btn-small" :disabled="loading" @click="load">Refresh</button>
      </div>
    </div>

    <div class="filters">
      <select v-model="statusFilter">
        <option value="all">All statuses</option>
        <option value="open">Open</option>
        <option value="pending">Pending</option>
        <option value="in_progress">In progress</option>
        <option value="resolved">Resolved</option>
        <option value="closed">Closed</option>
      </select>
      <select v-model="sortOrder">
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
      </select>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="loading" class="muted">Loading...</p>
    <p v-else-if="!tickets.length" class="muted">
      No tickets yet.
      <router-link to="/tickets/new" class="link">Create one</router-link>.
    </p>
    <p v-else-if="!filteredTickets.length" class="muted">No tickets match this filter.</p>

    <div v-else class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Subject</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Category (AI)</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="ticket in filteredTickets"
            :key="ticket.id"
            class="row-link"
            @click="openTicket(ticket.id)"
          >
            <td class="mono">#{{ ticket.id }}</td>
            <td>{{ ticket.subject }}</td>
            <td><StatusBadge :status="ticket.status" /></td>
            <td><span class="badge" :class="PRIORITY_BADGE[ticket.priority]">{{ ticket.priority }}</span></td>
            <td><CategoryBadge :category="ticket.category_name" :confidence="ticket.confidence" /></td>
            <td class="muted">{{ formatDate(ticket.created_at) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
