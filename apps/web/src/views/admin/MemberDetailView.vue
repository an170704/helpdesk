<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getUserOverview, resetPassword } from '../../api/users'
import { formatDate } from '../../utils/format'
import { initials, avatarColor } from '../../utils/avatar'
import StatusBadge from '../../components/StatusBadge.vue'
import CategoryBadge from '../../components/CategoryBadge.vue'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref('')
const notice = ref(null)
const user = ref(null)
const stats = ref(null)
const recentCreated = ref([])
const recentAssigned = ref([])
const activeTab = ref('created')

let noticeTimer = null

const ROLE_BADGE = { admin: 'badge-admin', technician: 'badge-tech', user: 'badge-user' }

function isLink(value) {
  return value && value.startsWith('http')
}

const showAssignedTab = computed(
  () => user.value && (user.value.role === 'technician' || stats.value?.assignedTotal > 0)
)

const activeTickets = computed(() =>
  activeTab.value === 'created' ? recentCreated.value : recentAssigned.value
)

function showNotice(text, type = 'ok') {
  notice.value = { text, type }
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => (notice.value = null), 3500)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await getUserOverview(route.params.id)
    user.value = data.user
    stats.value = data.stats
    recentCreated.value = data.recentCreated
    recentAssigned.value = data.recentAssigned
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load the member'
  } finally {
    loading.value = false
  }
}

async function askResetPassword() {
  const password = window.prompt(`New password for ${user.value.full_name} (at least 6 characters):`)
  if (password === null) return
  if (password.length < 6) {
    showNotice('Password must be at least 6 characters', 'error')
    return
  }

  try {
    await resetPassword(user.value.id, password)
    showNotice(`Password reset for ${user.value.full_name}`)
  } catch (err) {
    showNotice(err.response?.data?.message || 'Could not reset the password', 'error')
  }
}

onMounted(load)
</script>

<template>
  <div>
    <button class="btn btn-ghost btn-small" @click="router.push('/users')">Back to Members</button>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="loading" class="muted" style="margin-top: 14px">Loading...</p>

    <template v-else>
      <p v-if="notice" :class="notice.type === 'error' ? 'error' : 'notice-ok'" style="margin-top: 12px">
        {{ notice.text }}
      </p>

      <div class="profile">
        <div class="profile-main">
          <div class="card profile-head">
            <img v-if="user.avatar_url" :src="user.avatar_url" class="avatar-lg-img" alt="" />
            <span v-else class="avatar-lg" :class="avatarColor(user.full_name || user.email)">{{ initials(user.full_name) }}</span>

            <div class="profile-info">
              <h2>
                {{ user.full_name }}
                <span class="badge" :class="ROLE_BADGE[user.role]">{{ user.role }}</span>
              </h2>
              <p class="muted">{{ user.email }}</p>
              <p class="muted small">Member since {{ formatDate(user.created_at) }}</p>
            </div>

            <div class="profile-actions">
              <button class="btn btn-small" @click="router.push(`/users/${user.id}/edit`)">Edit member</button>
              <button class="btn btn-ghost btn-small" @click="askResetPassword">Reset password</button>
            </div>
          </div>

          <div class="card">
            <div class="profile-tabs">
              <button :class="{ active: activeTab === 'created' }" @click="activeTab = 'created'">
                Tickets created ({{ recentCreated.length }})
              </button>
              <button
                v-if="showAssignedTab"
                :class="{ active: activeTab === 'assigned' }"
                @click="activeTab = 'assigned'"
              >
                Assigned tickets ({{ recentAssigned.length }})
              </button>
            </div>

            <p v-if="!activeTickets.length" class="muted">No tickets yet.</p>

            <div v-else class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Category</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="ticket in activeTickets"
                    :key="ticket.id"
                    class="row-link"
                    @click="router.push(`/tickets/${ticket.id}`)"
                  >
                    <td class="mono">{{ ticket.id }}</td>
                    <td>{{ ticket.subject }}</td>
                    <td><StatusBadge :status="ticket.status" /></td>
                    <td><span class="badge badge-gray">{{ ticket.priority }}</span></td>
                    <td><CategoryBadge :category="ticket.category_name" :parent="ticket.category_parent_name" /></td>
                    <td class="muted small">{{ formatDate(ticket.created_at) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <aside class="card profile-details">
          <h3>Details</h3>

          <div class="detail-block">
            <span class="detail-label">Email</span>
            <span>{{ user.email }}</span>
          </div>

          <div class="detail-block">
            <span class="detail-label">Phone</span>
            <span>{{ user.phone || '—' }}</span>
          </div>

          <div class="detail-block">
            <span class="detail-label">Address</span>
            <span>{{ user.address || '—' }}</span>
          </div>

          <div class="detail-block">
            <span class="detail-label">Facebook</span>
            <a v-if="isLink(user.facebook)" :href="user.facebook" target="_blank" rel="noopener" class="link">
              {{ user.facebook }}
            </a>
            <span v-else>{{ user.facebook || '—' }}</span>
          </div>

          <div class="detail-block">
            <span class="detail-label">Twitter</span>
            <a v-if="isLink(user.twitter)" :href="user.twitter" target="_blank" rel="noopener" class="link">
              {{ user.twitter }}
            </a>
            <span v-else>{{ user.twitter || '—' }}</span>
          </div>

          <div class="detail-block">
            <span class="detail-label">Tickets created</span>
            <span>{{ stats.created.total }}</span>
          </div>

          <div v-if="stats.assignedTotal > 0" class="detail-block">
            <span class="detail-label">Assigned tickets</span>
            <span>{{ stats.assignedTotal }}</span>
          </div>

          <div v-if="stats.csat.total" class="detail-block">
            <span class="detail-label">Satisfaction</span>
            <span>{{ stats.csat.positivePercent }}% positive ({{ stats.csat.total }} rating(s))</span>
          </div>

          <div class="detail-block">
            <span class="detail-label">Role</span>
            <span class="badge" :class="ROLE_BADGE[user.role]">{{ user.role }}</span>
          </div>

          <div class="detail-block">
            <span class="detail-label">Status</span>
            <span class="badge" :class="user.is_active ? 'badge-green' : 'badge-red'">
              {{ user.is_active ? 'Active' : 'Locked' }}
            </span>
          </div>

          <div class="detail-block">
            <span class="detail-label">Member since</span>
            <span>{{ formatDate(user.created_at) }}</span>
          </div>
        </aside>
      </div>
    </template>
  </div>
</template>
