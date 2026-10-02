<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { getUsers, updateUser, resetPassword } from '../../api/users'
import { formatDate } from '../../utils/format'
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
    error.value = err.response?.data?.message || 'Failed to load users'
  } finally {
    loading.value = false
  }
}

async function toggleActive(user) {
  const action = user.is_active ? 'Lock' : 'Unlock'
  if (!window.confirm(`${action} ${user.full_name}?`)) return

  try {
    await updateUser(user.id, { is_active: !user.is_active })
    showNotice(`${user.full_name} has been ${user.is_active ? 'locked' : 'unlocked'}`)
    await load()
  } catch (err) {
    showNotice(err.response?.data?.message || 'Could not update the user', 'error')
  }
}

async function askResetPassword(user) {
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

onMounted(load)
</script>

<template>
  <section class="card">
    <div class="card-head">
      <h2>Users</h2>
      <div class="head-actions">
        <span class="muted small">{{ filteredUsers.length }} account(s)</span>
        <router-link to="/users/new" class="btn btn-small">Add user</router-link>
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
    <p v-else-if="!filteredUsers.length" class="muted">No users match this filter.</p>

    <div v-else class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Role</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in pagedUsers" :key="user.id">
            <td class="mono">#{{ user.id }}</td>
            <td>{{ user.full_name }}</td>
            <td>{{ user.email }}</td>
            <td class="muted">{{ user.phone || '—' }}</td>
            <td><span class="badge" :class="ROLE_BADGE[user.role]">{{ user.role }}</span></td>
            <td>
              <span class="badge" :class="user.is_active ? 'badge-green' : 'badge-red'">
                {{ user.is_active ? 'Active' : 'Locked' }}
              </span>
            </td>
            <td class="muted small">{{ formatDate(user.created_at) }}</td>
            <td>
              <div class="row-actions">
                <button class="btn btn-ghost btn-small" @click="router.push(`/users/${user.id}/edit`)">Edit</button>
                <button
                  class="btn btn-ghost btn-small"
                  :disabled="user.id === auth.user?.id"
                  @click="toggleActive(user)"
                >
                  {{ user.is_active ? 'Lock' : 'Unlock' }}
                </button>
                <button class="btn btn-ghost btn-small" @click="askResetPassword(user)">Reset password</button>
              </div>
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
  </section>
</template>
