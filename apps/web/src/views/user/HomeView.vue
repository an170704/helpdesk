<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { getTickets } from '../../api/tickets'
import { formatDate } from '../../utils/format'
import StatusBadge from '../../components/StatusBadge.vue'

const auth = useAuthStore()
const router = useRouter()

const tickets = ref([])
const loading = ref(true)
const error = ref('')

const today = new Date().toLocaleDateString('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const ICONS = {
  ticket: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  check: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/>',
  archive: '<path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/>',
  trend: '<path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/>',
}

const stats = computed(() => {
  const open = tickets.value.filter((t) => t.status === 'pending' || t.status === 'in_progress').length
  const resolved = tickets.value.filter((t) => t.status === 'resolved').length
  const closed = tickets.value.filter((t) => t.status === 'closed').length

  const done = tickets.value.filter((t) => t.resolved_at)
  const totalMs = done.reduce((sum, t) => sum + (new Date(t.resolved_at) - new Date(t.created_at)), 0)
  const avgHours = done.length ? totalMs / done.length / 3600000 : null

  return [
    { label: 'Total', value: tickets.value.length, color: 'stat-blue', icon: 'ticket', to: { path: '/tickets' } },
    { label: 'Open', value: open, color: 'stat-amber', icon: 'clock', to: { path: '/tickets', query: { status: 'open' } } },
    { label: 'Resolved', value: resolved, color: 'stat-green', icon: 'check', to: { path: '/tickets', query: { status: 'resolved' } } },
    { label: 'Closed', value: closed, color: 'stat-dark', icon: 'archive', to: { path: '/tickets', query: { status: 'closed' } } },
    {
      label: 'Avg resolution',
      value: avgHours === null ? '—' : avgHours >= 24 ? `${(avgHours / 24).toFixed(1)}d` : `${avgHours.toFixed(1)}h`,
      color: 'stat-purple',
      icon: 'trend',
      to: null,
    },
  ]
})

const byCategory = computed(() => {
  const map = new Map()
  for (const t of tickets.value) {
    // Roll subcategories up to their parent for the chart
    const name = t.category_parent_name || t.category_name || 'Unclassified'
    map.set(name, (map.get(name) || 0) + 1)
  }
  const total = tickets.value.length || 1
  return [...map.entries()]
    .map(([name, count]) => ({ name, count, percent: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count)
})

const recent = computed(() => tickets.value.slice(0, 5))

onMounted(async () => {
  try {
    tickets.value = await getTickets()
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load tickets'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="home">
    <div class="welcome">
      <h2>Welcome back, {{ auth.user?.full_name }}</h2>
      <p class="muted">{{ today }}</p>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="loading" class="muted">Loading...</p>

    <template v-else>
      <div class="stats">
        <div
          v-for="stat in stats"
          :key="stat.label"
          class="stat-card"
          :class="[stat.color, { 'stat-clickable': stat.to }]"
          @click="stat.to && router.push(stat.to)"
        >
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS[stat.icon]"></svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stat.value }}</span>
            <span class="stat-label">{{ stat.label }}</span>
          </div>
        </div>
      </div>

      <div class="home-grid">
        <div class="card">
          <h3>Tickets by category</h3>
          <p v-if="!byCategory.length" class="muted">No data yet.</p>
          <div v-for="item in byCategory" :key="item.name" class="bar-row">
            <div class="bar-head">
              <span>{{ item.name }}</span>
              <span class="muted">{{ item.count }}</span>
            </div>
            <div class="bar-track">
              <div class="bar-fill" :style="{ width: item.percent + '%' }"></div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-head">
            <h3>Recent tickets</h3>
            <div class="head-actions">
              <router-link to="/tickets/new" class="btn btn-small">New Ticket</router-link>
              <router-link to="/tickets" class="link">View all</router-link>
            </div>
          </div>

          <p v-if="!recent.length" class="muted">
            No tickets yet.
            <router-link to="/tickets/new" class="link">Create one</router-link>.
          </p>

          <div v-else class="table-wrap">
            <table>
              <thead>
                <tr><th>ID</th><th>Subject</th><th>Status</th><th>Created</th></tr>
              </thead>
              <tbody>
                <tr
                  v-for="ticket in recent"
                  :key="ticket.id"
                  class="row-link"
                  @click="router.push(`/tickets/${ticket.id}`)"
                >
                  <td class="mono">{{ ticket.id }}</td>
                  <td>{{ ticket.subject }}</td>
                  <td><StatusBadge :status="ticket.status" /></td>
                  <td class="muted">{{ formatDate(ticket.created_at) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
