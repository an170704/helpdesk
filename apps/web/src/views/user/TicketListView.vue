<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getTickets } from '../../api/tickets'
import { PRIORITY_BADGE } from '../../utils/status'
import { formatDate } from '../../utils/format'
import StatusBadge from '../../components/StatusBadge.vue'
import CategoryBadge from '../../components/CategoryBadge.vue'
import Pagination from '../../components/Pagination.vue'

const route = useRoute()
const router = useRouter()

const tickets = ref([])
const loading = ref(true)
const error = ref('')
const statusFilter = ref(route.query.status || 'all')
const sortOrder = ref(route.query.sort || 'newest')
const searchQuery = ref(route.query.search || '')
const page = ref(Math.max(1, Number(route.query.page) || 1))
const pageSize = ref(Number(route.query.size) || 10)

const filteredTickets = computed(() => {
  let list = [...tickets.value]

  const status = statusFilter.value
  if (status === 'open') {
    list = list.filter((t) => t.status === 'pending' || t.status === 'in_progress')
  } else if (status !== 'all') {
    list = list.filter((t) => t.status === status)
  }

  const query = searchQuery.value.trim().toLowerCase()
  if (query) {
    list = list.filter((t) => t.subject.toLowerCase().includes(query))
  }

  list.sort((a, b) => {
    const diff = new Date(b.created_at) - new Date(a.created_at)
    return sortOrder.value === 'newest' ? diff : -diff
  })

  return list
})

const pagedTickets = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredTickets.value.slice(start, start + pageSize.value)
})

watch([statusFilter, sortOrder, searchQuery], () => {
  page.value = 1
})

// Keep the URL in sync so going back from a ticket restores the same page and filters
watch([statusFilter, sortOrder, searchQuery, page, pageSize], () => {
  router.replace({
    query: {
      ...(statusFilter.value !== 'all' && { status: statusFilter.value }),
      ...(sortOrder.value !== 'newest' && { sort: sortOrder.value }),
      ...(searchQuery.value.trim() && { search: searchQuery.value.trim() }),
      ...(page.value > 1 && { page: String(page.value) }),
      ...(pageSize.value !== 10 && { size: String(pageSize.value) }),
    },
  })
})

watch(
  () => route.query,
  (query) => {
    statusFilter.value = query.status || 'all'
    sortOrder.value = query.sort || 'newest'
    searchQuery.value = query.search || ''
    page.value = Math.max(1, Number(query.page) || 1)
    pageSize.value = Number(query.size) || 10
  }
)

watch(
  () => filteredTickets.value.length,
  (length) => {
    const maxPage = Math.max(1, Math.ceil(length / pageSize.value))
    if (page.value > maxPage) page.value = maxPage
  }
)

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

      <div class="search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input v-model="searchQuery" type="text" placeholder="Search subject..." />
      </div>
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
            v-for="ticket in pagedTickets"
            :key="ticket.id"
            class="row-link"
            @click="openTicket(ticket.id)"
          >
            <td class="mono">{{ ticket.id }}</td>
            <td>{{ ticket.subject }}</td>
            <td><StatusBadge :status="ticket.status" /></td>
            <td><span class="badge" :class="PRIORITY_BADGE[ticket.priority]">{{ ticket.priority }}</span></td>
            <td><CategoryBadge :category="ticket.category_name" :parent="ticket.category_parent_name" /></td>
            <td class="muted">{{ formatDate(ticket.created_at) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Pagination
      v-model:page="page"
      v-model:pageSize="pageSize"
      :total="filteredTickets.length"
    />
  </section>
</template>
