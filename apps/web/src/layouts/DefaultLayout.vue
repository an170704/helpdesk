<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()

const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
  ticket: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
  plus: '<circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>',
  queue: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  chart: '<path d="M12 20V10M18 20V4M6 20v-4"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  tag: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><path d="M7 7h.01"/>',
  assigned: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
}

const sections = computed(() => {
  if (auth.isAdmin) {
    return [
      {
        title: 'Main',
        items: [
          { label: 'Dashboard', to: '/dashboard', icon: 'chart', soon: true },
          { label: 'Ticket Queue', to: '/admin', icon: 'queue' },
        ],
      },
      {
        title: 'Manage',
        items: [
          { label: 'Knowledge Base', to: '/kb', icon: 'book', soon: true },
          { label: 'Users', to: '/users', icon: 'users', soon: true },
          { label: 'Categories', to: '/categories', icon: 'tag', soon: true },
        ],
      },
    ]
  }

  if (auth.isTechnician) {
    return [
      {
        title: 'Main',
        items: [
          { label: 'Assigned Tickets', to: '/assigned', icon: 'assigned', soon: true },
        ],
      },
      {
        title: 'Support',
        items: [
          { label: 'FAQ', to: '/faq', icon: 'book', soon: true },
        ],
      },
    ]
  }

  return [
    {
      title: 'Main',
      items: [
        { label: 'Home', to: '/home', icon: 'home' },
        { label: 'My Tickets', to: '/tickets', icon: 'ticket' },
        { label: 'New Ticket', to: '/tickets/new', icon: 'plus' },
      ],
    },
    {
      title: 'Support',
      items: [
        { label: 'FAQ', to: '/faq', icon: 'book', soon: true },
      ],
    },
  ]
})

const initials = computed(() => {
  const name = auth.user?.full_name || ''
  return name
    .split(' ')
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
})

function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="layout">
    <aside class="sidebar">
      <router-link to="/" class="brand">Helpdesk</router-link>

      <nav class="side-nav">
        <div v-for="section in sections" :key="section.title" class="nav-section">
          <p class="nav-title">{{ section.title }}</p>

          <template v-for="item in section.items" :key="item.label">
            <router-link v-if="!item.soon" :to="item.to" class="nav-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS[item.icon]"></svg>
              <span>{{ item.label }}</span>
            </router-link>

            <span v-else class="nav-item nav-item-soon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS[item.icon]"></svg>
              <span>{{ item.label }}</span>
              <span class="soon-tag">Soon</span>
            </span>
          </template>
        </div>
      </nav>

      <div class="sidebar-footer">
        <div class="user-info">
          <div class="avatar">{{ initials }}</div>
          <div>
            <div class="user-name">{{ auth.user?.full_name }}</div>
            <span class="badge" :class="auth.isAdmin ? 'badge-admin' : auth.isTechnician ? 'badge-tech' : 'badge-user'">
              {{ auth.user?.role }}
            </span>
          </div>
        </div>
        <button class="btn btn-ghost btn-small logout-btn" @click="handleLogout">Logout</button>
      </div>
    </aside>

    <main class="layout-main">
      <router-view />
    </main>
  </div>
</template>
