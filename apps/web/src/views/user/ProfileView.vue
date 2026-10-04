<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { getMe, updateMe } from '../../api/users'
import { getTickets } from '../../api/tickets'
import { formatDate } from '../../utils/format'
import { initials, avatarColor } from '../../utils/avatar'
import { PRIORITY_LABEL } from '../../utils/status'
import StatusBadge from '../../components/StatusBadge.vue'
import CategoryBadge from '../../components/CategoryBadge.vue'

const auth = useAuthStore()

const loading = ref(true)
const error = ref('')
const notice = ref(null)
const user = ref(null)
const myGroups = ref([])
const tickets = ref([])
const activeTab = ref('details')

const saving = ref(false)
const formError = ref('')
const form = ref({ full_name: '', email: '', phone: '', address: '', role: 'user' })

let noticeTimer = null

const ROLE_BADGE = { admin: 'badge-admin', technician: 'badge-tech', user: 'badge-user' }

const createdTickets = computed(() => tickets.value.filter((t) => t.created_by === auth.user?.id))
const groupIds = computed(() => myGroups.value.map((group) => group.id))
const assignedTickets = computed(() =>
  tickets.value.filter(
    (t) => t.assigned_to === auth.user?.id || (!t.assigned_to && groupIds.value.includes(t.group_id))
  )
)
const showAssignedTab = computed(() => user.value?.role === 'technician')
const activeTickets = computed(() =>
  activeTab.value === 'assigned' ? assignedTickets.value : createdTickets.value
)

function showNotice(text, type = 'ok') {
  notice.value = { text, type }
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => (notice.value = null), 3500)
}

function syncForm() {
  if (!user.value) return
  form.value = {
    full_name: user.value.full_name,
    email: user.value.email,
    phone: user.value.phone || '',
    address: user.value.address || '',
    role: user.value.role,
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [me, list] = await Promise.all([getMe(), getTickets()])
    user.value = me.user
    myGroups.value = me.groups || []
    tickets.value = list
    syncForm()
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load your profile'
  } finally {
    loading.value = false
  }
}

async function save() {
  formError.value = ''
  if (!form.value.full_name.trim()) {
    formError.value = 'Full name is required'
    return
  }

  saving.value = true
  try {
    const updated = await updateMe({
      full_name: form.value.full_name.trim(),
      phone: form.value.phone.trim() || null,
      address: form.value.address.trim() || null,
    })
    user.value = updated
    auth.setUser({ ...auth.user, ...updated })
    syncForm()
    showNotice('Profile updated')
  } catch (err) {
    formError.value = err.response?.data?.message || 'Could not update your profile'
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="loading" class="muted">Loading...</p>

    <template v-else>
      <p v-if="notice" :class="notice.type === 'error' ? 'error' : 'notice-ok'">{{ notice.text }}</p>

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
      </div>

      <div class="card" style="margin-top: 14px">
        <div class="profile-tabs">
          <button :class="{ active: activeTab === 'details' }" @click="activeTab = 'details'">Details</button>
          <button :class="{ active: activeTab === 'created' }" @click="activeTab = 'created'">
            Tickets created ({{ createdTickets.length }})
          </button>
          <button
            v-if="showAssignedTab"
            :class="{ active: activeTab === 'assigned' }"
            @click="activeTab = 'assigned'"
          >
            Assigned tickets ({{ assignedTickets.length }})
          </button>
        </div>

        <template v-if="activeTab === 'details'">
          <form class="member-edit-form" @submit.prevent="save">
            <label for="p-fullName">Full name</label>
            <input id="p-fullName" v-model="form.full_name" type="text" placeholder="e.g. Nguyen Van A" />

            <label for="p-email">Email</label>
            <input id="p-email" v-model="form.email" type="text" disabled />

            <label for="p-phone">Phone (optional)</label>
            <input id="p-phone" v-model="form.phone" type="text" placeholder="e.g. 0901234567" />

            <label for="p-address">Address (optional)</label>
            <input id="p-address" v-model="form.address" type="text" placeholder="e.g. 123 Le Loi, District 1, HCMC" />

            <label for="p-role">Role</label>
            <select id="p-role" v-model="form.role" disabled>
              <option value="user">User</option>
              <option value="technician">Technician</option>
              <option value="admin">Admin</option>
            </select>

            <label class="checkbox-row">
              <input type="checkbox" checked disabled />
              Account active
            </label>

            <p v-if="formError" class="error">{{ formError }}</p>

            <div class="row form-actions">
              <button class="btn" type="submit" :disabled="saving">
                {{ saving ? 'Saving...' : 'Save changes' }}
              </button>
              <button class="btn btn-ghost" type="button" @click="syncForm">Cancel</button>
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
                <tr v-for="ticket in activeTickets" :key="ticket.id">
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
    </template>
  </div>
</template>
