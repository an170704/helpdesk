<script setup>
import { nextTick, onMounted, ref } from 'vue'
import { getChatStatus, sendChat } from '../api/chat'

const enabled = ref(false)
const open = ref(false)
const input = ref('')
const sending = ref(false)
const listEl = ref(null)

const messages = ref([
  {
    role: 'assistant',
    content:
      'Hi! I am HelpBot. Describe your IT issue and I will try to help using our knowledge base.',
  },
])

async function scrollDown() {
  await nextTick()
  if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
}

function toggle() {
  open.value = !open.value
  if (open.value) scrollDown()
}

onMounted(async () => {
  try {
    const status = await getChatStatus()
    enabled.value = !!status.enabled
  } catch {
    enabled.value = false
  }
})

async function send() {
  const question = input.value.trim()
  if (!question || sending.value) return

  messages.value.push({ role: 'user', content: question })
  input.value = ''
  sending.value = true
  await scrollDown()

  try {
    const history = messages.value.slice(0, -1)
    const { reply } = await sendChat({ question, history })
    messages.value.push({ role: 'assistant', content: reply })
  } catch (err) {
    messages.value.push({
      role: 'assistant',
      content: err.response?.data?.message || 'Sorry, something went wrong. Please try again.',
    })
  } finally {
    sending.value = false
    await scrollDown()
  }
}
</script>

<template>
  <div v-if="enabled" class="chat-widget">
    <div v-if="open" class="chat-panel">
      <div class="chat-head">
        <div class="chat-title">
          <span class="chat-avatar">HB</span>
          <div>
            <b>HelpBot</b>
            <span class="chat-status">IT support assistant</span>
          </div>
        </div>
        <button class="chat-close" type="button" title="Close" @click="open = false">×</button>
      </div>

      <div ref="listEl" class="chat-body">
        <div v-for="(message, index) in messages" :key="index" class="chat-msg" :class="message.role">
          {{ message.content }}
        </div>
        <div v-if="sending" class="chat-msg assistant chat-typing">HelpBot is typing…</div>
      </div>

      <form class="chat-input" @submit.prevent="send">
        <input
          v-model="input"
          type="text"
          placeholder="Describe your issue..."
          :disabled="sending"
        />
        <button class="btn btn-small" type="submit" :disabled="sending || !input.trim()">Send</button>
      </form>
    </div>

    <button v-else class="chat-launcher" type="button" title="Chat with HelpBot" @click="toggle">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    </button>
  </div>
</template>
