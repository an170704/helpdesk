<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { getUserOverview, updateUser, resetPassword } from '../../api/users'
import { getGroups } from '../../api/groups'
import { formatDate } from '../../utils/format'
import { initials, avatarColor } from '../../utils/avatar'
import { PRIORITY_LABEL } from '../../utils/status'
import { roleLabel } from '../../utils/roles'
import StatusBadge from '../../components/StatusBadge.vue'
import CategoryBadge from '../../components/CategoryBadge.vue'
import MultiSelect from '../../components/MultiSelect.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const loading = ref(true)
const error = ref('')
const notice = ref(null)
const user = ref(null)
const overviewGroups = ref([])
const groups = ref([])
const stats = ref(null)
const recentCreated = ref([])
const recentAssigned = ref([])
const activeTab = ref('details')

const savingDetails = ref(false)
const detailError = ref('')
const detailForm = ref({
  full_name: '',
  email: '',
  phone: '',
  address: '',
  role: 'user',
  title: '',
  is_active: true,
  group_ids: [],
})

let noticeTimer = null

const ROLE_BADGE = { admin: 'badge-admin', technician: 'badge-tech', user: 'badge-user' }

const isSelf = computed(() => user.value && auth.user?.id === user.value.id)

const groupOptions = computed(() => groups.value.map((group) => ({ id: group.id, label: group.name })))

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

function syncDetailForm() {
  if (!user.value) return
  detailForm.value = {
    full_name: user.value.full_name,
    email: user.value.email,
    phone: user.value.phone || '',
    address: user.value.address || '',
    role: user.value.role,
    title: user.value.title || '',
    is_active: user.value.is_active,
    group_ids: overviewGroups.value.map((g) => g.id),
  }
}

function openDetails() {
  detailError.value = ''
  syncDetailForm()
  activeTab.value = 'details'
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [data, allGroups] = await Promise.all([
      getUserOverview(route.params.id),
      getGroups(),
    ])
    user.value = data.user
    overviewGroups.value = data.groups
    groups.value = allGroups
    stats.value = data.stats
    recentCreated.value = data.recentCreated
    recentAssigned.value = data.recentAssigned
    syncDetailForm()

    if (route.query.tab === 'details') activeTab.value = 'details'
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load the member'
  } finally {
    loading.value = false
  }
}

async function saveDetails() {
  detailError.value = ''
  const form = detailForm.value

  if (!form.full_name.trim()) {
    detailError.value = 'Full name is required'
    return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    detailError.value = 'Invalid email'
    return
  }

  savingDetails.value = true
  try {
    await updateUser(user.value.id, {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      role: form.role,
      title: form.role === 'technician' ? form.title.trim() || null : null,
      is_active: form.is_active,
      group_ids: form.role === 'technician' ? form.group_ids : [],
    })
    showNotice('Member updated')
    if (route.query.tab) router.replace({ path: route.path })
    activeTab.value = 'created'
    await load()
  } catch (err) {
    detailError.value = err.response?.data?.message || 'Could not update the member'
  } finally {
    savingDetails.value = false
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
                <span class="badge" :class="ROLE_BADGE[user.role]">{{ roleLabel(user) }}</span>
              </h2>
              <p class="muted">{{ user.email }}</p>
              <p class="muted small">Member since {{ formatDate(user.created_at) }}</p>
            </div>

            <div class="profile-actions">
              <button class="icon-btn" title="Reset password" @click="askResetPassword">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                </svg>
              </button>

              <router-link
                :to="`/admin/tickets/new?contact=${user.id}`"
                class="icon-btn"
                title="New ticket for this member"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </router-link>
            </div>
          </div>

          <div class="card">
            <div class="profile-tabs">
              <button :class="{ active: activeTab === 'details' }" @click="openDetails">
                Details
              </button>
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

            <template v-if="activeTab === 'details'">
              <form class="member-edit-form" @submit.prevent="saveDetails">
                <label for="m-fullName">Full name</label>
                <input id="m-fullName" v-model="detailForm.full_name" type="text" placeholder="e.g. Nguyen Van A" />

                <label for="m-email">Email</label>
                <input id="m-email" v-model="detailForm.email" type="text" placeholder="name@company.com" />

                <label for="m-phone">Phone (optional)</label>
                <input id="m-phone" v-model="detailForm.phone" type="text" placeholder="e.g. 0901234567" />

                <label for="m-address">Address (optional)</label>
                <input id="m-address" v-model="detailForm.address" type="text" placeholder="e.g. 123 Le Loi, District 1, HCMC" />

                <label for="m-role">Role</label>
                <select id="m-role" v-model="detailForm.role" :disabled="isSelf || user.role === 'admin'">
                  <option v-if="user.role === 'admin'" value="admin">Admin</option>
                  <option value="user">User</option>
                  <option value="technician">Agent</option>
                </select>
                <p v-if="isSelf" class="field-hint muted small">You cannot change your own role.</p>
                <p v-else-if="user.role === 'admin'" class="field-hint muted small">Admin accounts cannot be edited here.</p>

                <template v-if="detailForm.role === 'technician'">
                  <label for="m-title">Label (optional)</label>
                  <input id="m-title" v-model="detailForm.title" type="text" placeholder="Agent (default)" />

                  <label>Groups</label>
                  <p v-if="!groups.length" class="muted small">No groups available.</p>
                  <MultiSelect
                    v-else
                    v-model="detailForm.group_ids"
                    :options="groupOptions"
                    placeholder="Select groups..."
                  />
                </template>

                <label class="checkbox-row">
                  <input v-model="detailForm.is_active" type="checkbox" :disabled="isSelf" />
                  Account active
                </label>
                <p v-if="isSelf" class="field-hint muted small">You cannot lock your own account.</p>

                <p v-if="detailError" class="error">{{ detailError }}</p>

                <div class="row form-actions">
                  <button class="btn" type="submit" :disabled="savingDetails">
                    {{ savingDetails ? 'Saving...' : 'Save changes' }}
                  </button>
                  <button class="btn btn-ghost" type="button" @click="activeTab = 'created'">Cancel</button>
                </div>
              </form>
            </template>

            <template v-else>
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
                      <td><span class="badge badge-gray">{{ PRIORITY_LABEL[ticket.priority] }}</span></td>
                      <td><CategoryBadge :category="ticket.category_name" :parent="ticket.category_parent_name" /></td>
                      <td class="muted small">{{ formatDate(ticket.created_at) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>
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
            <span class="badge" :class="ROLE_BADGE[user.role]">{{ roleLabel(user) }}</span>
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
