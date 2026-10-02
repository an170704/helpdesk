<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getTickets, updateStatus, updatePriority, assignTicket, deleteTicket } from '../../api/tickets'
import { getTechnicians } from '../../api/users'
import { getGroups } from '../../api/groups'
import { STATUS_LABEL } from '../../utils/status'
import { formatDate } from '../../utils/format'
import StatusBadge from '../../components/StatusBadge.vue'
import CategoryBadge from '../../components/CategoryBadge.vue'
import Pagination from '../../components/Pagination.vue'

const router = useRouter()
const route = useRoute()

const tickets = ref([])
const technicians = ref([])
const groups = ref([])
const loading = ref(true)
const error = ref('')
const notice = ref(null)
const statusFilter = ref(route.query.status || 'all')
const priorityFilter = ref(route.query.priority || 'all')
const sortOrder = ref(route.query.sort || 'newest')
const searchQuery = ref(route.query.search || '')
const page = ref(Math.max(1, Number(route.query.page) || 1))
const pageSize = ref(Number(route.query.size) || 10)
const selected = ref([])

let noticeTimer = null

const ICONS = {
  ticket: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  play: '<circle cx="12" cy="12" r="10"/><path d="M10 8l6 4-6 4z"/>',
  check: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/>',
  archive: '<path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/>',
}

const tiles = computed(() => {
  const by = (status) => tickets.value.filter((t) => t.status === status).length

  return [
    { key: 'all', label: 'Tickets', value: tickets.value.length, color: 'tile-total', icon: 'ticket' },
    { key: 'pending', label: 'Pending', value: by('pending'), color: 'tile-pending', icon: 'clock' },
    { key: 'in_progress', label: 'In progress', value: by('in_progress'), color: 'tile-progress', icon: 'play' },
    { key: 'resolved', label: 'Resolved', value: by('resolved'), color: 'tile-resolved', icon: 'check' },
    { key: 'closed', label: 'Closed', value: by('closed'), color: 'tile-closed', icon: 'archive' },
  ]
})

const filteredTickets = computed(() => {
  let list = [...tickets.value]

  const status = statusFilter.value
  if (status === 'open') {
    list = list.filter((t) => t.status === 'pending' || t.status === 'in_progress')
  } else if (status !== 'all') {
    list = list.filter((t) => t.status === status)
  }

  if (priorityFilter.value !== 'all') {
    list = list.filter((t) => t.priority === priorityFilter.value)
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

const allPageSelected = computed(
  () => pagedTickets.value.length > 0 && pagedTickets.value.every((t) => selected.value.includes(t.id))
)

function isSelected(id) {
  return selected.value.includes(id)
}

function toggleOne(id, checked) {
  if (checked) {
    selected.value = [...selected.value, id]
  } else {
    selected.value = selected.value.filter((x) => x !== id)
  }
}

function toggleAll(checked) {
  const ids = pagedTickets.value.map((t) => t.id)
  if (checked) {
    selected.value = [...new Set([...selected.value, ...ids])]
  } else {
    selected.value = selected.value.filter((x) => !ids.includes(x))
  }
}

async function deleteSelected() {
  if (!selected.value.length) return
  if (!window.confirm(`Delete ${selected.value.length} selected ticket(s)? This cannot be undone.`)) return

  try {
    await Promise.all(selected.value.map((id) => deleteTicket(id)))
    showNotice(`Deleted ${selected.value.length} ticket(s)`)
    selected.value = []
    await load()
  } catch (err) {
    showNotice(err.response?.data?.message || 'Could not delete tickets', 'error')
    await load()
  }
}

watch([statusFilter, priorityFilter, sortOrder, searchQuery], () => {
  page.value = 1
  selected.value = []
})

watch(page, () => {
  selected.value = []
})

// Keep the URL in sync so going back from a ticket restores the same page and filters
watch([statusFilter, priorityFilter, sortOrder, searchQuery, page, pageSize], () => {
  router.replace({
    query: {
      ...(statusFilter.value !== 'all' && { status: statusFilter.value }),
      ...(priorityFilter.value !== 'all' && { priority: priorityFilter.value }),
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
    priorityFilter.value = query.priority || 'all'
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

function resetFilters() {
  statusFilter.value = 'all'
  priorityFilter.value = 'all'
  sortOrder.value = 'newest'
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

async function loadOptions() {
  try {
    technicians.value = await getTechnicians()
    groups.value = await getGroups()
  } catch {
    technicians.value = []
    groups.value = []
  }
}

const STATUSES = ['pending', 'in_progress', 'resolved', 'closed']

async function changeStatus(ticket, status) {
  try {
    await updateStatus(ticket.id, status, 'Updated from the admin queue')
    showNotice(`Ticket #${ticket.id} moved to ${STATUS_LABEL[status]}`)
    await load()
  } catch (err) {
    showNotice(err.response?.data?.message || 'Could not change status', 'error')
    await load()
  }
}

async function changePriority(ticket, priority) {
  try {
    await updatePriority(ticket.id, priority)
    showNotice(`Ticket #${ticket.id} priority set to ${priority}`)
    await load()
  } catch (err) {
    showNotice(err.response?.data?.message || 'Could not change priority', 'error')
    await load()
  }
}

async function assign(ticket, field, value) {
  try {
    await assignTicket(ticket.id, { [field]: value === '' ? null : Number(value) })
    showNotice(`Ticket #${ticket.id} updated`)
    await load()
  } catch (err) {
    showNotice(err.response?.data?.message || 'Could not assign', 'error')
    await load()
  }
}

function openTicket(id) {
  router.push(`/tickets/${id}`)
}

onMounted(() => {
  load()
  loadOptions()
})
</script>

<template>
  <div>
    <div class="tiles">
      <button
        v-for="tile in tiles"
        :key="tile.key"
        class="tile"
        :class="[tile.color, { active: statusFilter === tile.key }]"
        @click="statusFilter = tile.key"
      >
        <span class="tile-count">{{ tile.value }}</span>
        <span class="tile-label">{{ tile.label }}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS[tile.icon]"></svg>
      </button>
    </div>

    <section class="card">
      <div class="card-head">
        <h2>Tickets</h2>
        <div class="head-actions">
          <span class="muted small">{{ filteredTickets.length }} / {{ tickets.length }} ticket(s)</span>
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
        <select v-model="priorityFilter">
          <option value="all">All priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
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

        <button
          v-if="statusFilter !== 'all' || priorityFilter !== 'all'"
          class="btn btn-ghost btn-small"
          @click="resetFilters"
        >
          Clear filters
        </button>

        <button
          class="btn btn-ghost btn-small btn-danger btn-icon pager-right"
          :disabled="!selected.length"
          @click="deleteSelected"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
          </svg>
          Delete ({{ selected.length }})
        </button>
      </div>

      <p v-if="notice" :class="notice.type === 'error' ? 'error' : 'notice-ok'">{{ notice.text }}</p>
      <p v-if="error" class="error">{{ error }}</p>
      <p v-else-if="loading" class="muted">Loading...</p>
      <p v-else-if="!tickets.length" class="muted">No tickets yet.</p>
      <p v-else-if="!filteredTickets.length" class="muted">No tickets match this filter.</p>

      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="check-col">
                <input
                  type="checkbox"
                  :checked="allPageSelected"
                  @change="toggleAll($event.target.checked)"
                />
              </th>
              <th>ID</th>
              <th>Subject</th>
              <th>Requester</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Category</th>
              <th>Assigned to</th>
              <th>Group</th>
              <th>Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="ticket in pagedTickets"
              :key="ticket.id"
              class="row-link"
              :class="{ 'row-selected': isSelected(ticket.id) }"
              @click="openTicket(ticket.id)"
            >
              <td class="check-col" @click.stop>
                <input
                  type="checkbox"
                  :checked="isSelected(ticket.id)"
                  @change="toggleOne(ticket.id, $event.target.checked)"
                />
              </td>
              <td class="mono">#{{ ticket.id }}</td>
              <td>{{ ticket.subject }}</td>
              <td>{{ ticket.created_by_name || '#' + ticket.created_by }}</td>
              <td><StatusBadge :status="ticket.status" /></td>
              <td @click.stop>
                <select
                  class="inline-select priority-select"
                  :class="'priority-' + ticket.priority"
                  :value="ticket.priority"
                  @change="changePriority(ticket, $event.target.value)"
                >
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                </select>
              </td>
              <td><CategoryBadge :category="ticket.category_name" :parent="ticket.category_parent_name" /></td>
              <td @click.stop>
                <select
                  class="inline-select"
                  :value="ticket.assigned_to || ''"
                  @change="assign(ticket, 'assigned_to', $event.target.value)"
                >
                  <option value="">Unassigned</option>
                  <option v-for="tech in technicians" :key="tech.id" :value="tech.id">
                    {{ tech.full_name }}
                  </option>
                </select>
              </td>
              <td @click.stop>
                <select
                  class="inline-select"
                  :value="ticket.group_id || ''"
                  @change="assign(ticket, 'group_id', $event.target.value)"
                >
                  <option value="">No group</option>
                  <option v-for="group in groups" :key="group.id" :value="group.id">
                    {{ group.name }}
                  </option>
                </select>
              </td>
              <td class="muted small">{{ formatDate(ticket.created_at) }}</td>
              <td @click.stop>
                <select
                  class="inline-select"
                  :value="ticket.status"
                  @change="changeStatus(ticket, $event.target.value)"
                >
                  <option v-for="status in STATUSES" :key="status" :value="status">
                    {{ STATUS_LABEL[status] }}
                  </option>
                </select>
              </td>
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
  </div>
</template>
