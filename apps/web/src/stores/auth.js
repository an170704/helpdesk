import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import api from '../api/client'

const TOKEN_KEY = 'token'
const USER_KEY = 'user'

// Session lives in localStorage: it survives F5 and browser restarts, but
// every normal tab shares it — use another browser profile or incognito to
// stay logged in with a different account at the same time.
function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem(TOKEN_KEY) || '')
  const user = ref(readStoredUser())

  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isTechnician = computed(() => user.value?.role === 'technician')

  const homePath = computed(() => {
    if (isAdmin.value) return '/dashboard'
    if (isTechnician.value) return '/assigned'
    return '/home'
  })

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password })
    token.value = data.token
    user.value = data.user
    localStorage.setItem(TOKEN_KEY, data.token)
    localStorage.setItem(USER_KEY, JSON.stringify(data.user))
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  function setUser(next) {
    user.value = next
    localStorage.setItem(USER_KEY, JSON.stringify(next))
  }

  return { token, user, isAuthenticated, isAdmin, isTechnician, homePath, login, logout, setUser }
})
