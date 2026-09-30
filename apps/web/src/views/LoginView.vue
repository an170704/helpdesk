<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleSubmit() {
  if (!email.value || !password.value) {
    error.value = 'Please enter email and password'
    return
  }

  error.value = ''
  loading.value = true

  try {
    await auth.login(email.value.trim(), password.value)
    router.push(auth.homePath)
  } catch (err) {
    error.value = err.response?.data?.message || 'Login failed. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <form class="login-card" @submit.prevent="handleSubmit">
      <h1>Helpdesk</h1>
      <p class="muted">Sign in to continue</p>

      <label for="email">Email</label>
      <input id="email" v-model="email" type="text" placeholder="admin@company.com" />

      <label for="password">Password</label>
      <input id="password" v-model="password" type="password" placeholder="Password" />

      <p v-if="error" class="error">{{ error }}</p>

      <button class="btn" type="submit" :disabled="loading">
        {{ loading ? 'Signing in...' : 'Sign in' }}
      </button>

      <p class="muted small">
        Demo accounts: admin@company.com / user@company.com (password 123456)
      </p>
    </form>
  </div>
</template>
