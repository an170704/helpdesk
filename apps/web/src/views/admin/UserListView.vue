<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { getUsers, updateUser, resetPassword, createUser } from '../../api/users'
import { getGroups } from '../../api/groups'
import { formatDate } from '../../utils/format'
import { initials, avatarColor } from '../../utils/avatar'
import Pagination from '../../components/Pagination.vue'
import SideDrawer from '../../components/SideDrawer.vue'
import MultiSelect from '../../components/MultiSelect.vue'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const isStaffMode = computed(() => route.meta.directory === 'staff')
const pageTitle = computed(() => (isStaffMode.value ? 'Staff' : 'Members'))
const addLabel = computed(() => (isStaffMode.value ? 'Add staff' : 'Add member'))

const users = ref([])
const groups = ref([])
const loading = ref(true)
const error = ref('')
const notice = ref(null)
const searchQuery = ref('')
const page = ref(1)
const pageSize = ref(10)

const menuUser = ref(null)
const menuPosition = ref({ top: 0, left: 0 })

const drawerOpen = ref(false)
const saving = ref(false)
const formError = ref('')
const form = ref({ full_name: '', email: '', phone: '', address: '', password: '', role: 'technician', groupIds: [] })

let noticeTimer = null

const ROLE_BADGE = { admin: 'badge-admin', technician: 'badge-tech', user: 'badge-user' }

const groupOptions = computed(() => groups.value.map((group) => ({ id: group.id, label: group.name })))

const directoryUsers = computed(() =>
  users.value.filter((u) =>
    isStaffMode.value ? u.role === 'technician' || u.role === 'admin' : u.role === 'user'
  )
)

const filteredUsers = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return directoryUsers.value

  return directoryUsers.value.filter(
    (u) =>
      u.full_name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query)
  )
})

const pagedUsers = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredUsers.value.slice(start, start + pageSize.value)
})

watch([searchQuery, () => route.path], () => {
  page.value = 1
})

function showNotice(text, type = 'ok') {
  notice.value = { text, type }
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => (notice.value = null), 3500)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    users.value = await getUsers()
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load the directory'
  } finally {
    loading.value = false
  }
}

async function loadGroups() {
  try {
    groups.value = await getGroups()
  } catch {
    groups.value = []
  }
}

function openDrawer() {
  form.value = { full_name: '', email: '', phone: '', address: '', password: '', role: 'technician', groupIds: [] }
  formError.value = ''
  drawerOpen.value = true
}

function closeDrawer() {
  drawerOpen.value = false
}

async function submitDrawer() {
  formError.value = ''

  if (!form.value.full_name.trim()) {
    formError.value = 'Full name is required'
    return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    formError.value = 'Invalid email'
    return
  }
  if (form.value.password.length < 6) {
    formError.value = 'Password must be at least 6 characters'
    return
  }

  const role = isStaffMode.value ? form.value.role : 'user'
  const groupIds = isStaffMode.value && role === 'technician' ? form.value.groupIds : undefined

  saving.value = true
  try {
    await createUser({
      full_name: form.value.full_name.trim(),
      email: form.value.email.trim(),
      phone: form.value.phone.trim() || null,
      address: form.value.address.trim() || null,
      role,
      password: form.value.password,
      ...(groupIds && { group_ids: groupIds }),
    })
    drawerOpen.value = false
    showNotice(`${isStaffMode.value ? 'Staff member' : 'Member'} "${form.value.full_name.trim()}" created`)
    await load()
  } catch (err) {
    formError.value = err.response?.data?.message || 'Could not create the account'
  } finally {
    saving.value = false
  }
}

function toggleMenu(user, event) {
  if (menuUser.value && menuUser.value.id === user.id) {
    closeMenu()
    return
  }

  const rect = event.currentTarget.getBoundingClientRect()
  menuPosition.value = {
    top: rect.bottom + 6,
    left: Math.max(8, rect.right - 180),
  }
  menuUser.value = user
}

function closeMenu() {
  menuUser.value = null
}

function onWindowClick() {
  closeMenu()
}

async function toggleActive(user) {
  const action = user.is_active ? 'Lock' : 'Unlock'
  closeMenu()
  if (!window.confirm(`${action} ${user.full_name}?`)) return

  try {
    await updateUser(user.id, { is_active: !user.is_active })
    showNotice(`${user.full_name} has been ${user.is_active ? 'locked' : 'unlocked'}`)
    await load()
  } catch (err) {
    showNotice(err.response?.data?.message || 'Could not update the account', 'error')
  }
}

async function askResetPassword(user) {
  closeMenu()
  const password = window.prompt(`New password for ${user.full_name} (at least 6 characters):`)
  if (password === null) return
  if (password.length < 6) {
    showNotice('Password must be at least 6 characters', 'error')
    return
  }

  try {
    await resetPassword(user.id, password)
    showNotice(`Password reset for ${user.full_name}`)
  } catch (err) {
    showNotice(err.response?.data?.message || 'Could not reset the password', 'error')
  }
}

function editUser(user) {
  closeMenu()
  router.push(`/users/${user.id}?tab=details`)
}

onMounted(() => {
  load()
  if (isStaffMode.value) loadGroups()
  window.addEventListener('click', onWindowClick)
})

onUnmounted(() => {
  window.removeEventListener('click', onWindowClick)
})
</script>

<template>
  <section class="card">
    <div class="card-head">
      <h2>{{ pageTitle }}</h2>
      <div class="head-actions">
        <span class="muted small">{{ filteredUsers.length }} account(s)</span>
        <button class="btn btn-small" @click="openDrawer">{{ addLabel }}</button>
      </div>
    </div>

    <div class="filters">
      <div class="search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input v-model="searchQuery" type="text" placeholder="Search name or email..." />
      </div>
    </div>

    <p v-if="notice" :class="notice.type === 'error' ? 'error' : 'notice-ok'">{{ notice.text }}</p>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="loading" class="muted">Loading...</p>
    <p v-else-if="!filteredUsers.length" class="muted">No accounts match this filter.</p>

    <div v-else class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th v-if="isStaffMode">Role</th>
            <th>Status</th>
            <th>Created</th>
            <th class="menu-col"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in pagedUsers" :key="user.id" class="row-link" @click="router.push(`/users/${user.id}`)">
            <td>
              <div class="member-cell">
                <img v-if="user.avatar_url" :src="user.avatar_url" class="avatar-img" alt="" />
                <span v-else class="avatar-sm" :class="avatarColor(user.full_name || user.email)">{{ initials(user.full_name) }}</span>
                <span>{{ user.full_name }}</span>
              </div>
            </td>
            <td>{{ user.email }}</td>
            <td class="muted">{{ user.phone || '—' }}</td>
            <td v-if="isStaffMode">
              <span class="badge" :class="ROLE_BADGE[user.role]">{{ user.role }}</span>
            </td>
            <td>
              <span class="badge" :class="user.is_active ? 'badge-green' : 'badge-red'">
                {{ user.is_active ? 'Active' : 'Locked' }}
              </span>
            </td>
            <td class="muted small">{{ formatDate(user.created_at) }}</td>
            <td class="menu-col" @click.stop>
              <button class="icon-btn" title="Actions" @click.stop="toggleMenu(user, $event)">
                <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <circle cx="12" cy="5" r="1.6" />
                  <circle cx="12" cy="12" r="1.6" />
                  <circle cx="12" cy="19" r="1.6" />
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Pagination
      v-model:page="page"
      v-model:pageSize="pageSize"
      :total="filteredUsers.length"
    />

    <Teleport to="body">
      <div
        v-if="menuUser"
        class="row-menu"
        :style="{ top: menuPosition.top + 'px', left: menuPosition.left + 'px' }"
        @click.stop
      >
        <button class="row-menu-item" @click="editUser(menuUser)">Edit</button>
        <button
          class="row-menu-item"
          :disabled="menuUser.id === auth.user?.id"
          @click="toggleActive(menuUser)"
        >
          {{ menuUser.is_active ? 'Lock account' : 'Unlock account' }}
        </button>
        <button class="row-menu-item" @click="askResetPassword(menuUser)">Reset password</button>
      </div>
    </Teleport>

    <SideDrawer :open="drawerOpen" :title="addLabel" @close="closeDrawer">
      <p class="muted small drawer-hint">Full name and email are mandatory.</p>

      <label for="d-name">Full name *</label>
      <input id="d-name" v-model="form.full_name" type="text" placeholder="e.g. Nguyen Van B" />

      <label for="d-email">Email *</label>
      <input id="d-email" v-model="form.email" type="text" placeholder="name@company.com" />

      <label for="d-phone">Phone</label>
      <input id="d-phone" v-model="form.phone" type="text" placeholder="e.g. 0901234567" />

      <label for="d-address">Address</label>
      <input id="d-address" v-model="form.address" type="text" placeholder="e.g. 123 Le Loi, District 1" />

      <template v-if="isStaffMode">
        <label for="d-role">Role *</label>
        <select id="d-role" v-model="form.role">
          <option value="technician">Technician</option>
          <option value="admin">Admin</option>
        </select>
      </template>

      <template v-if="isStaffMode && form.role === 'technician'">
        <label>Groups</label>
        <p v-if="!groups.length" class="muted small">No groups available.</p>
        <MultiSelect
          v-else
          v-model="form.groupIds"
          :options="groupOptions"
          placeholder="Select groups..."
        />
      </template>

      <label for="d-password">Initial password *</label>
      <input id="d-password" v-model="form.password" type="password" placeholder="At least 6 characters" />

      <p v-if="formError" class="error">{{ formError }}</p>

      <template #footer>
        <button class="btn btn-ghost" type="button" @click="closeDrawer">Cancel</button>
        <button class="btn" type="button" :disabled="saving" @click="submitDrawer">
          {{ saving ? 'Creating...' : addLabel }}
        </button>
      </template>
    </SideDrawer>
  </section>
</template>
