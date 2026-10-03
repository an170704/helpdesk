<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { getUsers, updateUser, resetPassword } from '../../api/users'
import { formatDate } from '../../utils/format'
import { initials, avatarColor } from '../../utils/avatar'
import Pagination from '../../components/Pagination.vue'

const auth = useAuthStore()
const router = useRouter()

const users = ref([])
const loading = ref(true)
const error = ref('')
const notice = ref(null)
const searchQuery = ref('')
const roleFilter = ref('all')
const page = ref(1)
const pageSize = ref(10)

const menuUser = ref(null)
const menuPosition = ref({ top: 0, left: 0 })

let noticeTimer = null

const ROLE_BADGE = { admin: 'badge-admin', technician: 'badge-tech', user: 'badge-user' }

const filteredUsers = computed(() => {
  let list = [...users.value]

  if (roleFilter.value !== 'all') {
    list = list.filter((u) => u.role === roleFilter.value)
  }

  const query = searchQuery.value.trim().toLowerCase()
  if (query) {
    list = list.filter(
      (u) =>
        u.full_name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
    )
  }

  return list
})

const pagedUsers = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredUsers.value.slice(start, start + pageSize.value)
})

watch([roleFilter, searchQuery], () => {
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
    error.value = err.response?.data?.message || 'Failed to load members'
  } finally {
    loading.value = false
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
    showNotice(err.response?.data?.message || 'Could not update the member', 'error')
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
  router.push(`/users/${user.id}/edit`)
}

onMounted(() => {
  load()
  window.addEventListener('click', onWindowClick)
})

onUnmounted(() => {
  window.removeEventListener('click', onWindowClick)
})
</script>

<template>
  <section class="card">
    <div class="card-head">
      <h2>Members</h2>
      <div class="head-actions">
        <span class="muted small">{{ filteredUsers.length }} member(s)</span>
        <router-link to="/users/new" class="btn btn-small">Add member</router-link>
      </div>
    </div>

    <div class="filters">
      <select v-model="roleFilter">
        <option value="all">All roles</option>
        <option value="user">User</option>
        <option value="technician">Technician</option>
        <option value="admin">Admin</option>
      </select>

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
    <p v-else-if="!filteredUsers.length" class="muted">No members match this filter.</p>

    <div v-else class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Member</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Role</th>
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
            <td><span class="badge" :class="ROLE_BADGE[user.role]">{{ user.role }}</span></td>
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
  </section>
</template>
