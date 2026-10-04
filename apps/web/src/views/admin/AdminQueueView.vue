<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getTickets, updateStatus, updatePriority, updateCategory, assignTicket, deleteTicket } from '../../api/tickets'
import { getTechnicians } from '../../api/users'
import { getGroups } from '../../api/groups'
import { getCategories } from '../../api/categories'
import { categoryLabel, categoriesOfGroup } from '../../utils/categories'
import { STATUS_LABEL } from '../../utils/status'
import { formatDate, timeAgo } from '../../utils/format'
import { initials, avatarColor } from '../../utils/avatar'
import { membersOfGroup, groupsOfTechnician, byFullName } from '../../utils/groups'
import CategoryBadge from '../../components/CategoryBadge.vue'
import Pagination from '../../components/Pagination.vue'

const router = useRouter()
const route = useRoute()

const tickets = ref([])
const technicians = ref([])
const groups = ref([])
const categories = ref([])
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
  pending.value = {}
})

watch(page, () => {
  selected.value = []
  pending.value = {}
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
    const [techs, grps, cats] = await Promise.all([
      getTechnicians(),
      getGroups(),
      getCategories(),
    ])
    technicians.value = techs
    groups.value = grps
    categories.value = cats
  } catch {
    technicians.value = []
    groups.value = []
    categories.value = []
  }
}

const STATUSES = ['pending', 'in_progress', 'resolved', 'closed']

// Pending inline edits: { [ticketId]: { status?, priority?, assigned_to?, group_id? } }
const pending = ref({})
const applying = ref(false)

const pendingCount = computed(() =>
  Object.values(pending.value).reduce((sum, changes) => sum + Object.keys(changes).length, 0)
)

function fieldValue(ticket, field, fallback) {
  const changes = pending.value[ticket.id]
  if (changes && Object.prototype.hasOwnProperty.call(changes, field)) {
    return changes[field]
  }
  return fallback
}

function setPending(ticket, field, value) {
  const changes = { ...(pending.value[ticket.id] || {}) }
  const original = {
    status: ticket.status,
    priority: ticket.priority,
    assigned_to: ticket.assigned_to == null ? '' : String(ticket.assigned_to),
    group_id: ticket.group_id == null ? '' : String(ticket.group_id),
    category_id: ticket.category_id == null ? '' : String(ticket.category_id),
  }

  if (String(original[field]) === String(value)) {
    delete changes[field]
  } else {
    changes[field] = value
  }

  const next = { ...pending.value }
  if (Object.keys(changes).length) {
    next[ticket.id] = changes
  } else {
    delete next[ticket.id]
  }
  pending.value = next
}

function discardPending() {
  pending.value = {}
  showNotice('Changes discarded')
}

function technicianOptions(ticket) {
  const groupId = fieldValue(ticket, 'group_id', ticket.group_id || '')
  if (!groupId) return byFullName(technicians.value)

  const members = byFullName(membersOfGroup(groups.value, groupId))
  const assigned = fieldValue(ticket, 'assigned_to', ticket.assigned_to || '')
  if (assigned && !members.some((m) => m.id === Number(assigned))) {
    const current = technicians.value.find((t) => t.id === Number(assigned))
    if (current) return [current, ...members]
  }
  return members
}

function groupOptions(ticket) {
  const assigned = fieldValue(ticket, 'assigned_to', ticket.assigned_to || '')
  if (!assigned) return groups.value

  const options = groupsOfTechnician(groups.value, assigned)
  const groupId = fieldValue(ticket, 'group_id', ticket.group_id || '')
  if (groupId && !options.some((g) => g.id === Number(groupId))) {
    const current = groups.value.find((g) => g.id === Number(groupId))
    if (current) return [current, ...options]
  }
  return options
}

function onAssigneeChange(ticket, value) {
  setPending(ticket, 'assigned_to', value)
  const groupId = fieldValue(ticket, 'group_id', ticket.group_id || '')
  if (value && groupId && !groupsOfTechnician(groups.value, value).some((g) => g.id === Number(groupId))) {
    setPending(ticket, 'group_id', '')
  }
}

function assignmentValue(ticket) {
  const groupId = fieldValue(ticket, 'group_id', ticket.group_id || '')
  const categoryId = fieldValue(ticket, 'category_id', ticket.category_id || '')
  if (!groupId && !categoryId) return ''
  return `${groupId}:${categoryId}`
}

function assignmentOptions(ticket) {
  const options = []

  for (const group of groupOptions(ticket)) {
    options.push({ value: `${group.id}:`, label: group.name })
    for (const category of categoriesOfGroup(categories.value, group)) {
      options.push({ value: `${group.id}:${category.id}`, label: `» ${categoryLabel(category, group)}` })
    }
  }

  const current = assignmentValue(ticket)
  if (current && !options.some((opt) => opt.value === current)) {
    const [groupId, categoryId] = current.split(':')
    const category = categories.value.find((c) => c.id === Number(categoryId))
    const group = groups.value.find((g) => g.id === Number(groupId))
    if (category) {
      options.unshift({ value: current, label: `» ${categoryLabel(category, group)}` })
    } else if (group) {
      options.unshift({ value: current, label: group.name })
    }
  }

  return options
}

function onAssignmentChange(ticket, value) {
  if (!value) {
    setPending(ticket, 'group_id', '')
    setPending(ticket, 'category_id', '')
    return
  }

  const [groupId, categoryId] = value.split(':')
  setPending(ticket, 'group_id', groupId)
  setPending(ticket, 'category_id', categoryId || '')

  const assigned = fieldValue(ticket, 'assigned_to', ticket.assigned_to || '')
  if (value && assigned && !membersOfGroup(groups.value, groupId).some((m) => m.id === Number(assigned))) {
    setPending(ticket, 'assigned_to', '')
  }
}

async function applyPending() {
  const entries = Object.entries(pending.value)
  if (!entries.length) return

  applying.value = true
  let saved = 0
  const failures = []

  for (const [id, changes] of entries) {
    try {
      if (changes.status) {
        await updateStatus(id, changes.status, 'Updated from the admin queue')
        saved += 1
      }
      if (changes.priority) {
        await updatePriority(id, changes.priority)
        saved += 1
      }
      if (changes.assigned_to !== undefined || changes.group_id !== undefined) {
        const payload = {}
        if (changes.assigned_to !== undefined) {
          payload.assigned_to = changes.assigned_to === '' ? null : Number(changes.assigned_to)
        }
        if (changes.group_id !== undefined) {
          payload.group_id = changes.group_id === '' ? null : Number(changes.group_id)
        }
        await assignTicket(id, payload)
        saved += 1
      }
      if (changes.category_id !== undefined) {
        await updateCategory(id, changes.category_id === '' ? null : Number(changes.category_id))
        saved += 1
      }
    } catch (err) {
      failures.push(`#${id}: ${err.response?.data?.message || 'failed'}`)
    }
  }

  pending.value = {}
  applying.value = false

  if (failures.length) {
    showNotice(`Saved ${saved} change(s), ${failures.length} failed — ${failures[0]}`, 'error')
  } else {
    showNotice(`Saved ${saved} change(s)`)
  }

  await load()
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
          <router-link to="/admin/tickets/new" class="btn btn-small">New ticket</router-link>
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

        <div class="filters-right">
          <button
            v-if="pendingCount"
            class="btn btn-ghost btn-small"
            type="button"
            @click="discardPending"
          >
            Discard
          </button>
          <button
            class="btn btn-small"
            type="button"
            :disabled="!pendingCount || applying"
            @click="applyPending"
          >
            {{ applying ? 'Saving...' : `Apply changes (${pendingCount})` }}
          </button>

          <button
            class="btn btn-ghost btn-small btn-danger btn-icon"
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
      </div>

      <p v-if="notice" :class="notice.type === 'error' ? 'error' : 'notice-ok'">{{ notice.text }}</p>
      <p v-if="error" class="error">{{ error }}</p>
      <p v-else-if="loading" class="muted">Loading...</p>
      <p v-else-if="!tickets.length" class="muted">No tickets yet.</p>
      <p v-else-if="!filteredTickets.length" class="muted">No tickets match this filter.</p>

      <template v-else>
        <div class="list-head">
          <label class="checkbox-row list-check">
            <input
              type="checkbox"
              :checked="allPageSelected"
              @change="toggleAll($event.target.checked)"
            />
            Select all
          </label>
        </div>

        <div class="ticket-cards">
          <div
            v-for="ticket in pagedTickets"
            :key="ticket.id"
            class="ticket-card"
            :class="{ 'row-selected': isSelected(ticket.id), 'row-dirty': !!pending[ticket.id] }"
          >
            <div class="ticket-check" @click.stop>
              <input
                type="checkbox"
                :checked="isSelected(ticket.id)"
                @change="toggleOne(ticket.id, $event.target.checked)"
              />
            </div>

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
                <CategoryBadge :category="ticket.category_name" :parent="ticket.category_parent_name" />
              </div>
            </div>

            <div class="ticket-controls" @click.stop>
              <select
                class="inline-select priority-select"
                :class="'priority-' + fieldValue(ticket, 'priority', ticket.priority)"
                :value="fieldValue(ticket, 'priority', ticket.priority)"
                @change="setPending(ticket, 'priority', $event.target.value)"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>

              <select
                class="inline-select tech-select"
                :value="fieldValue(ticket, 'assigned_to', ticket.assigned_to || '')"
                @change="onAssigneeChange(ticket, $event.target.value)"
              >
                <option value="">Unassigned</option>
                <option v-for="tech in technicianOptions(ticket)" :key="tech.id" :value="tech.id">
                  {{ tech.full_name }}
                </option>
              </select>

              <select
                class="inline-select assignment-select"
                :value="assignmentValue(ticket)"
                @change="onAssignmentChange(ticket, $event.target.value)"
              >
                <option value="">No group</option>
                <option v-for="opt in assignmentOptions(ticket)" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>

              <select
                class="inline-select status-select"
                :value="fieldValue(ticket, 'status', ticket.status)"
                @change="setPending(ticket, 'status', $event.target.value)"
              >
                <option v-for="status in STATUSES" :key="status" :value="status">
                  {{ STATUS_LABEL[status] }}
                </option>
              </select>
            </div>
          </div>
        </div>
      </template>

      <Pagination
        v-model:page="page"
        v-model:pageSize="pageSize"
        :total="filteredTickets.length"
      />
    </section>
  </div>
</template>
