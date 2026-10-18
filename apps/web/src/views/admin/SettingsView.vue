<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const ICONS = {
  zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
}

const sections = [
  {
    title: 'Account',
    cards: [
      {
        icon: 'user',
        title: 'My profile',
        description: 'Update your name, phone, address and custom label.',
        to: '/profile',
      },
    ],
  },
  {
    title: 'Support automation',
    cards: [
      {
        icon: 'zap',
        title: 'Auto-assignment',
        description: 'Round-robin or load-based routing with a per-agent ticket capacity.',
        to: '/settings/auto-assignment',
      },
      {
        icon: 'clock',
        title: 'Business hours',
        description: 'Working days, hours and holidays used by automatic routing.',
        to: '/settings/business-hours',
      },
    ],
  },
]

function go(card) {
  if (card.to) router.push(card.to)
}
</script>

<template>
  <div>
    <h2>Settings</h2>

    <div class="settings-banner">
      <span class="settings-banner-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.settings"></svg>
      </span>
      <div>
        <b>HurtDesk workspace</b>
        <p class="muted small">Internal IT helpdesk · administrator settings</p>
      </div>
      <router-link to="/dashboard" class="btn btn-ghost btn-small">Go to dashboard</router-link>
    </div>

    <section v-for="section in sections" :key="section.title" class="settings-section">
      <h3>{{ section.title }}</h3>

      <div class="settings-grid">
        <div
          v-for="card in section.cards"
          :key="card.title"
          class="settings-card"
          :class="{ 'settings-card-soon': card.soon }"
          @click="go(card)"
        >
          <svg class="settings-card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS[card.icon]"></svg>

          <div>
            <div class="settings-card-title">
              {{ card.title }}
              <span v-if="card.soon" class="soon-tag">Soon</span>
            </div>
            <p class="settings-card-desc">{{ card.description }}</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
