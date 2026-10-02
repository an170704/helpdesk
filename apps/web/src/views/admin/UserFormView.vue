<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { getUser, createUser, updateUser } from '../../api/users'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const isEdit = computed(() => !!route.params.id)
const isSelf = computed(() => isEdit.value && Number(route.params.id) === auth.user?.id)

const fullName = ref('')
const email = ref('')
const phone = ref('')
const role = ref('user')
const password = ref('')
const isActive = ref(true)

const loading = ref(false)
const saving = ref(false)
const error = ref('')

async function loadUser() {
  if (!isEdit.value) return

  loading.value = true
  try {
    const user = await getUser(route.params.id)
    fullName.value = user.full_name
    email.value = user.email
    phone.value = user.phone || ''
    role.value = user.role
    isActive.value = user.is_active
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load the user'
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  error.value = ''

  if (!fullName.value.trim()) {
    error.value = 'Full name is required'
    return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    error.value = 'Invalid email'
    return
  }
  if (!isEdit.value && password.value.length < 6) {
    error.value = 'Password must be at least 6 characters'
    return
  }

  saving.value = true

  try {
    if (isEdit.value) {
      await updateUser(route.params.id, {
        full_name: fullName.value.trim(),
        email: email.value.trim(),
        phone: phone.value.trim() || null,
        role: role.value,
        is_active: isActive.value,
      })
    } else {
      await createUser({
        full_name: fullName.value.trim(),
        email: email.value.trim(),
        phone: phone.value.trim() || null,
        role: role.value,
        password: password.value,
      })
    }
    router.push('/users')
  } catch (err) {
    error.value = err.response?.data?.message || 'Could not save the user'
  } finally {
    saving.value = false
  }
}

onMounted(loadUser)
</script>

<template>
  <section class="card form-card">
    <h2>{{ isEdit ? 'Edit user' : 'Create user' }}</h2>

    <p v-if="loading" class="muted">Loading...</p>

    <form v-else @submit.prevent="handleSubmit">
      <label for="fullName">Full name</label>
      <input id="fullName" v-model="fullName" type="text" placeholder="e.g. Nguyen Van A" />

      <label for="email">Email</label>
      <input id="email" v-model="email" type="text" placeholder="name@company.com" />

      <label for="phone">Phone (optional)</label>
      <input id="phone" v-model="phone" type="text" placeholder="e.g. 0901234567" />

      <label for="role">Role</label>
      <select id="role" v-model="role" :disabled="isSelf">
        <option value="user">User</option>
        <option value="technician">Technician</option>
        <option value="admin">Admin</option>
      </select>
      <p v-if="isSelf" class="field-hint muted small">You cannot change your own role.</p>

      <template v-if="!isEdit">
        <label for="password">Initial password</label>
        <input id="password" v-model="password" type="password" placeholder="At least 6 characters" />
      </template>

      <template v-else>
        <label class="checkbox-row">
          <input v-model="isActive" type="checkbox" :disabled="isSelf" />
          Account active
        </label>
        <p v-if="isSelf" class="field-hint muted small">You cannot lock your own account.</p>
      </template>

      <p v-if="error" class="error">{{ error }}</p>

      <div class="row form-actions">
        <button class="btn" type="submit" :disabled="saving">
          {{ saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create user' }}
        </button>
        <button class="btn btn-ghost" type="button" @click="router.back()">Cancel</button>
      </div>
    </form>
  </section>
</template>
