<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getNotifications, markRead, markAllRead, deleteNotification, clearNotifications } from '../api/notifications'
import { timeAgo } from '../utils/format'

const router = useRouter()

const open = ref(false)
const notifications = ref([])
const unread = ref(0)

async function load() {
  try {
    const data = await getNotifications()
    notifications.value = data.notifications
    unread.value = data.unread
  } catch {
    /* handled by the global 401 interceptor */
  }
}

function toggle() {
  open.value = !open.value
  if (open.value) load()
}

async function openNotification(notification) {
  open.value = false

  if (!notification.is_read) {
    try {
      await markRead(notification.id)
    } catch { /* ignore */ }
    await load()
  }

  if (notification.ticket_id) {
    router.push(`/tickets/${notification.ticket_id}`)
  }
}

async function markAll() {
  try {
    await markAllRead()
  } catch { /* ignore */ }
  await load()
}

async function removeOne(notification) {
  try {
    await deleteNotification(notification.id)
  } catch { /* ignore */ }
  await load()
}

async function clearAll() {
  if (!window.confirm('Clear all notifications?')) return
  try {
    await clearNotifications()
  } catch { /* ignore */ }
  await load()
}

let timer = null

onMounted(() => {
  load()
  timer = setInterval(load, 30000)
})

onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div class="notif">
    <button class="nav-item notif-btn" @click="toggle">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      <span>Notifications</span>
      <span v-if="unread" class="notif-badge">{{ unread }}</span>
    </button>

    <Teleport to="body">
      <div v-if="open" class="notif-panel">
        <div class="notif-head">
          <b>Notifications</b>
          <div class="notif-head-actions">
            <button v-if="unread" class="link-btn" @click="markAll">Mark all read</button>
            <button v-if="notifications.length" class="link-btn" @click="clearAll">Clear all</button>
          </div>
        </div>

        <p v-if="!notifications.length" class="muted small notif-empty">No notifications yet.</p>

        <ul v-else>
          <li
            v-for="notification in notifications"
            :key="notification.id"
            :class="{ unread: !notification.is_read }"
            @click="openNotification(notification)"
          >
            <span class="notif-dot"></span>
            <div class="notif-main">
              <p>{{ notification.message }}</p>
              <span class="muted small">{{ timeAgo(notification.created_at) }}</span>
            </div>
            <button class="notif-close" title="Remove" @click.stop="removeOne(notification)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </li>
        </ul>
      </div>
    </Teleport>
  </div>
</template>
