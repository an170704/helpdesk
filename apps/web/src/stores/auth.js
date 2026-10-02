import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import api from '../api/client'

const TOKEN_KEY = 'token'
const USER_KEY = 'user'

function readStoredUser() {
  try {
    return JSON.parse(sessionStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  // sessionStorage keeps each browser tab on its own session, so logging in
  // with another account in a second tab never affects this one
  const token = ref(sessionStorage.getItem(TOKEN_KEY) || '')
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
    sessionStorage.setItem(TOKEN_KEY, data.token)
    sessionStorage.setItem(USER_KEY, JSON.stringify(data.user))
  }

  function logout() {
    token.value = ''
    user.value = null
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(USER_KEY)
  }

  return { token, user, isAuthenticated, isAdmin, isTechnician, homePath, login, logout }
})
