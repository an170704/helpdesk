<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getTickets, updateStatus } from '../../api/tickets'
import { getMyStats } from '../../api/stats'
import { PRIORITY_BADGE, PRIORITY_LABEL, NEXT_STATUS, NEXT_LABEL } from '../../utils/status'
import { formatDate, timeAgo } from '../../utils/format'
import { initials, avatarColor } from '../../utils/avatar'
import StatusBadge from '../../components/StatusBadge.vue'
import CategoryBadge from '../../components/CategoryBadge.vue'
import Pagination from '../../components/Pagination.vue'

const router = useRouter()
const route = useRoute()

const tickets = ref([])
const myStats = ref(null)
const loading = ref(true)
const error = ref('')
const notice = ref(null)
const statusFilter = ref(route.query.status || 'all')
const sortOrder = ref(route.query.sort || 'newest')
const searchQuery = ref(route.query.search || '')
const page = ref(Math.max(1, Number(route.query.page) || 1))
const pageSize = ref(Number(route.query.size) || 10)

let noticeTimer = null

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

function showNotice(text, type = 'ok') {
  notice.value = { text, type }
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => (notice.value = null), 3500)
}

const tiles = computed(() => {
  if (!myStats.value) return []

  const { tickets: counts, csat } = myStats.value

  return [
    { key: 'open', label: 'Assigned', value: counts.open, color: 'tile-total' },
    { key: 'in_progress', label: 'In progress', value: counts.in_progress, color: 'tile-progress' },
    { key: 'resolved', label: 'Resolved', value: counts.resolved, color: 'tile-resolved' },
    { key: 'closed', label: 'Closed', value: counts.closed, color: 'tile-closed' },
    {
      key: null,
      label: 'My satisfaction',
      value: csat.positivePercent == null ? '—' : `${csat.positivePercent}%`,
      color: 'tile-sat',
    },
  ]
})

async function loadStats() {
  try {
    myStats.value = await getMyStats()
  } catch {
    myStats.value = null
  }
}

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

async function advance(ticket) {
  try {
    await updateStatus(ticket.id, NEXT_STATUS[ticket.status], 'Updated by the technician')
    showNotice(`Ticket #${ticket.id} moved to ${NEXT_STATUS[ticket.status]}`)
    await load()
    await loadStats()
  } catch (err) {
    showNotice(err.response?.data?.message || 'Could not change status', 'error')
  }
}

function openTicket(id) {
  router.push(`/tickets/${id}`)
}

function isOverdue(ticket) {
  return (
    ticket.due_at &&
    !['resolved', 'closed'].includes(ticket.status) &&
    new Date(ticket.due_at) < new Date()
  )
}

onMounted(() => {
  load()
  loadStats()
})
</script>

<template>
  <div>
    <div v-if="tiles.length" class="tiles">
      <button
        v-for="tile in tiles"
        :key="tile.label"
        class="tile"
        :class="[tile.color, { active: tile.key && statusFilter === tile.key, 'tile-static': !tile.key }]"
        @click="tile.key && (statusFilter = tile.key)"
      >
        <span class="tile-count">{{ tile.value }}</span>
        <span class="tile-label">{{ tile.label }}</span>
      </button>
    </div>

    <section class="card">
      <div class="card-head">
        <h2>Assigned Tickets</h2>
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

      <p v-if="notice" :class="notice.type === 'error' ? 'error' : 'notice-ok'">{{ notice.text }}</p>
      <p v-if="error" class="error">{{ error }}</p>
      <p v-else-if="loading" class="muted">Loading...</p>
      <p v-else-if="!tickets.length" class="muted">No tickets assigned to you yet.</p>
      <p v-else-if="!filteredTickets.length" class="muted">No tickets match this filter.</p>

      <div v-else class="ticket-cards">
        <div
          v-for="ticket in pagedTickets"
          :key="ticket.id"
          class="ticket-card"
        >
          <div class="ticket-avatar">
            <img v-if="ticket.created_by_avatar" :src="ticket.created_by_avatar" class="avatar-img" alt="" />
            <span
              v-else
              class="avatar-sm"
              :class="avatarColor(ticket.created_by_name || String(ticket.created_by))"
            >
              {{ initials(ticket.created_by_name) }}
            </span>
          </div>

          <div class="ticket-main" @click="openTicket(ticket.id)">
            <div class="ticket-subject">
              {{ ticket.subject }}
              <span class="muted mono small">· {{ ticket.id }}</span>
            </div>
            <div class="ticket-meta muted small">
              <b>{{ ticket.created_by_name || '#' + ticket.created_by }}</b>
              <span>· Created {{ timeAgo(ticket.created_at) }}</span>
              <span :class="{ 'due-overdue': isOverdue(ticket) }">· Due {{ formatDate(ticket.due_at) }}</span>
              <span v-if="ticket.group_name" class="badge badge-blue">{{ ticket.group_name }}</span>
              <span v-if="ticket.assigned_name" class="muted">→ {{ ticket.assigned_name }}</span>
              <span class="badge" :class="PRIORITY_BADGE[ticket.priority]">{{ PRIORITY_LABEL[ticket.priority] }}</span>
              <CategoryBadge :category="ticket.category_name" :parent="ticket.category_parent_name" />
            </div>
          </div>

          <div class="ticket-actions" @click.stop>
            <StatusBadge :status="ticket.status" />

            <button
              v-if="NEXT_STATUS[ticket.status] && NEXT_STATUS[ticket.status] !== 'closed'"
              class="btn btn-small"
              @click="advance(ticket)"
            >
              {{ NEXT_LABEL[ticket.status] }}
            </button>
            <span v-else-if="ticket.status === 'resolved'" class="muted small">Awaiting admin close</span>
          </div>
        </div>
      </div>

      <Pagination
        v-model:page="page"
        v-model:pageSize="pageSize"
        :total="filteredTickets.length"
      />
    </section>
  </div>
</template>
