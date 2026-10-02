<script setup>
import { computed, onMounted, ref } from 'vue'
import { Bar, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js'
import { getStats } from '../../api/stats'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const stats = ref(null)
const loading = ref(true)
const error = ref('')

const STATUS_COLORS = {
  pending: '#f59e0b',
  in_progress: '#3b82f6',
  resolved: '#22c55e',
  closed: '#6b7280',
}

const CATEGORY_COLORS = ['#3b5bdb', '#f59e0b', '#22c55e', '#8b5cf6', '#06b6d4', '#94a3b8']

const tiles = computed(() => {
  if (!stats.value) return []

  const { summary } = stats.value
  const avg = summary.avg_resolution_hours

  return [
    { label: 'Total tickets', value: summary.total, color: 'tile-total' },
    { label: 'Open', value: summary.open, color: 'tile-pending' },
    { label: 'Resolved', value: summary.resolved, color: 'tile-resolved' },
    { label: 'Closed', value: summary.closed, color: 'tile-closed' },
    {
      label: 'Avg resolution',
      value: avg == null ? '—' : avg >= 24 ? `${(avg / 24).toFixed(1)}d` : `${avg}h`,
      color: 'tile-progress',
    },
  ]
})

const categoryChart = computed(() => ({
  labels: stats.value.byCategory.map((c) => c.name),
  datasets: [
    {
      data: stats.value.byCategory.map((c) => c.count),
      backgroundColor: CATEGORY_COLORS,
      borderWidth: 2,
      borderColor: '#fff',
    },
  ],
}))

const monthChart = computed(() => ({
  labels: stats.value.byMonth.map((m) => m.month),
  datasets: [
    { label: 'Pending', data: stats.value.byMonth.map((m) => m.pending), backgroundColor: STATUS_COLORS.pending },
    { label: 'In progress', data: stats.value.byMonth.map((m) => m.in_progress), backgroundColor: STATUS_COLORS.in_progress },
    { label: 'Resolved', data: stats.value.byMonth.map((m) => m.resolved), backgroundColor: STATUS_COLORS.resolved },
    { label: 'Closed', data: stats.value.byMonth.map((m) => m.closed), backgroundColor: STATUS_COLORS.closed },
  ],
}))

const techChart = computed(() => ({
  labels: stats.value.byTechnician.map((t) => t.name),
  datasets: [
    {
      label: 'Assigned tickets',
      data: stats.value.byTechnician.map((t) => t.count),
      backgroundColor: '#3b5bdb',
      borderRadius: 6,
    },
  ],
}))

const baseOptions = { responsive: true, maintainAspectRatio: false }
const stackedOptions = {
  ...baseOptions,
  scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
}
const horizontalOptions = {
  ...baseOptions,
  indexAxis: 'y',
  plugins: { legend: { display: false } },
  scales: { x: { beginAtZero: true } },
}

onMounted(async () => {
  try {
    stats.value = await getStats()
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load statistics'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <h2>Dashboard</h2>
    <p class="muted">Support activity overview.</p>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="loading" class="muted">Loading...</p>

    <template v-else>
      <div class="tiles">
        <div v-for="tile in tiles" :key="tile.label" class="tile" :class="tile.color">
          <span class="tile-count">{{ tile.value }}</span>
          <span class="tile-label">{{ tile.label }}</span>
        </div>
      </div>

      <div class="dash-grid">
        <div class="card">
          <h3>Tickets by category</h3>
          <div class="chart-box">
            <Doughnut :data="categoryChart" :options="baseOptions" />
          </div>
        </div>

        <div class="card">
          <h3>Tickets by status per month</h3>
          <div class="chart-box">
            <Bar :data="monthChart" :options="stackedOptions" />
          </div>
        </div>

        <div class="card">
          <h3>Workload by technician</h3>
          <div class="chart-box">
            <Bar :data="techChart" :options="horizontalOptions" />
          </div>
        </div>

        <div class="card">
          <h3>Top requesters</h3>
          <ul class="rank-list">
            <li v-for="(requester, index) in stats.topRequesters" :key="requester.name">
              <span>
                <span class="rank-index">{{ index + 1 }}</span>
                {{ requester.name }}
              </span>
              <b>{{ requester.count }}</b>
            </li>
          </ul>
        </div>
      </div>
    </template>
  </div>
</template>
