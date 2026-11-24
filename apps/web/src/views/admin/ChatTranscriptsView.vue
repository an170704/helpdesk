<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getChatTranscript, getChatTranscripts } from '../../api/chat'
import { formatDate, timeAgo } from '../../utils/format'

const router = useRouter()

const sessions = ref([])
const selected = ref(null)
const messages = ref([])
const loading = ref(true)
const loadingMessages = ref(false)
const error = ref('')

async function selectSession(session) {
  selected.value = session
  loadingMessages.value = true
  messages.value = []
  try {
    const data = await getChatTranscript(session.session_id)
    messages.value = data.messages || []
  } catch (err) {
    error.value = err.response?.data?.message || 'Could not load the transcript'
  } finally {
    loadingMessages.value = false
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    sessions.value = await getChatTranscripts(100)
    if (sessions.value.length) await selectSession(sessions.value[0])
    else selected.value = null
  } catch (err) {
    error.value = err.response?.data?.message || 'Could not load chat transcripts'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <button class="btn btn-ghost btn-small" @click="router.push('/chatbot')">Back to chatbot settings</button>

    <div class="card-head" style="margin-top: 14px">
      <h2>Chat transcripts</h2>
      <button class="btn btn-ghost btn-small" :disabled="loading" @click="load">Refresh</button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="loading" class="muted">Loading...</p>

    <div v-else-if="!sessions.length" class="card">
      <p class="muted">No chat sessions yet. Conversations will appear here after users talk to HelpBot.</p>
    </div>

    <div v-else class="transcripts-layout">
      <aside class="card transcript-list">
        <button
          v-for="session in sessions"
          :key="session.session_id + ':' + session.user_id"
          class="transcript-item"
          :class="{ active: selected && selected.session_id === session.session_id }"
          type="button"
          @click="selectSession(session)"
        >
          <div class="transcript-user">{{ session.user_name }}</div>
          <div class="transcript-meta">
            <span>{{ session.message_count }} message(s)</span>
            <span>· {{ timeAgo(session.last_at) }}</span>
          </div>
          <div class="transcript-preview">{{ session.last_message || 'No messages' }}</div>
        </button>
      </aside>

      <section class="card transcript-detail">
        <template v-if="selected">
          <div class="transcript-detail-head">
            <div>
              <h3>{{ selected.user_name }}</h3>
              <p class="muted small">
                {{ selected.user_email }} · {{ selected.message_count }} message(s) ·
                started {{ formatDate(selected.started_at) }}
              </p>
            </div>
            <span class="badge badge-gray mono">{{ selected.session_id.slice(0, 8) }}</span>
          </div>

          <p v-if="loadingMessages" class="muted">Loading messages...</p>
          <p v-else-if="!messages.length" class="muted">No messages in this session.</p>

          <div v-else class="transcript-messages">
            <article
              v-for="message in messages"
              :key="message.id"
              class="transcript-message"
              :class="message.role"
            >
              <div class="transcript-message-head">
                <span class="badge" :class="message.role === 'assistant' ? 'badge-blue' : 'badge-gray'">
                  {{ message.role === 'assistant' ? 'HelpBot' : 'User' }}
                </span>
                <span class="muted small">{{ formatDate(message.created_at) }}</span>
                <span v-if="message.model" class="muted small mono">· {{ message.model }}</span>
              </div>
              <p>{{ message.content }}</p>
            </article>
          </div>
        </template>
      </section>
    </div>
  </div>
</template>
