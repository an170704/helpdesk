<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { getTicket, getHistory, getComments, createComment, createFeedback, saveResolution } from '../../api/tickets'
import { getArticles } from '../../api/kb'
import { PRIORITY_BADGE, PRIORITY_LABEL } from '../../utils/status'
import { formatDate, timeAgo } from '../../utils/format'
import { sanitizeHtml } from '../../utils/sanitize'
import StatusBadge from '../../components/StatusBadge.vue'
import CategoryBadge from '../../components/CategoryBadge.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const ticket = ref(null)
const history = ref([])
const comments = ref([])
const loading = ref(true)
const error = ref('')

const newComment = ref('')
const isInternal = ref(false)
const files = ref([])
const fileInput = ref(null)
const kbArticles = ref([])
const kbPick = ref('')
const sending = ref(false)
const commentError = ref('')

const isStaff = computed(() => auth.isAdmin || auth.isTechnician)

const canRate = computed(
  () =>
    ticket.value &&
    ticket.value.created_by === auth.user?.id &&
    ['resolved', 'closed'].includes(ticket.value.status) &&
    !ticket.value.feedback
)

const ratingChoice = ref('')
const ratingComment = ref('')
const ratingSending = ref(false)
const ratingError = ref('')

const resolutionText = ref('')
const resolutionBot = ref(false)
const savingResolution = ref(false)
const resolutionError = ref('')
const resolutionNotice = ref('')

const canEditResolution = computed(
  () => isStaff.value && ['resolved', 'closed'].includes(ticket.value?.status)
)

function syncResolution() {
  resolutionText.value = ticket.value?.resolution || ''
  resolutionBot.value = !!ticket.value?.bot_usable
  resolutionError.value = ''
  resolutionNotice.value = ''
}

async function submitResolution() {
  resolutionError.value = ''
  resolutionNotice.value = ''

  const hasPublicComments = comments.value.some((comment) => !comment.is_internal)
  if (resolutionBot.value && !resolutionText.value.trim() && !hasPublicComments) {
    resolutionError.value = 'Add a public reply on this ticket or write a short summary first'
    return
  }

  savingResolution.value = true
  try {
    const updated = await saveResolution(ticket.value.id, {
      resolution: resolutionText.value.trim() || null,
      bot_usable: resolutionBot.value,
    })
    ticket.value = { ...ticket.value, ...updated }
    syncResolution()
    resolutionNotice.value = 'HelpBot setting saved'
    history.value = await getHistory(ticket.value.id)
  } catch (err) {
    resolutionError.value = err.response?.data?.message || 'Could not save the HelpBot setting'
  } finally {
    savingResolution.value = false
  }
}

function feedbackBadge(rating) {
  if (rating === 'positive') return 'badge-green'
  if (rating === 'negative') return 'badge-red'
  return 'badge-gray'
}

async function submitFeedback() {
  if (!ratingChoice.value) return

  ratingError.value = ''
  ratingSending.value = true

  try {
    const feedback = await createFeedback(ticket.value.id, {
      rating: ratingChoice.value,
      comment: ratingComment.value.trim() || null,
    })
    ticket.value = { ...ticket.value, feedback }
  } catch (err) {
    ratingError.value = err.response?.data?.message || 'Could not submit the rating'
  } finally {
    ratingSending.value = false
  }
}

function initials(name) {
  return (name || '')
    .split(' ')
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function roleBadge(role) {
  if (role === 'admin') return 'badge-admin'
  if (role === 'technician') return 'badge-tech'
  return 'badge-user'
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

// Comment text is escaped first, then only KB links are turned into anchors
function formatBody(body) {
  return escapeHtml(body).replace(
    /\[([^\]]+)\]\((\/faq\/\d+)\)/g,
    '<a href="$2" class="link">$1</a>'
  )
}

function onFilesChange(event) {
  files.value = Array.from(event.target.files)
}

function insertKb() {
  const id = kbPick.value
  if (!id) return

  const article = kbArticles.value.find((a) => String(a.id) === String(id))
  if (article) {
    const link = `[${article.title}](/faq/${article.id})`
    newComment.value = newComment.value ? `${newComment.value.trimEnd()}\n${link}` : link
  }
  kbPick.value = ''
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    ticket.value = await getTicket(route.params.id)
    syncResolution()
    history.value = await getHistory(route.params.id)
    comments.value = await getComments(route.params.id)
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load ticket'
  } finally {
    loading.value = false
  }
}

async function loadKb() {
  try {
    kbArticles.value = await getArticles()
  } catch {
    kbArticles.value = []
  }
}

async function submitComment() {
  if (!newComment.value.trim()) return

  commentError.value = ''
  sending.value = true

  try {
    await createComment(ticket.value.id, {
      body: newComment.value.trim(),
      is_internal: isInternal.value,
      files: files.value,
    })
    newComment.value = ''
    isInternal.value = false
    files.value = []
    fileInput.value.value = ''
    comments.value = await getComments(ticket.value.id)
  } catch (err) {
    commentError.value = err.response?.data?.message || 'Could not send the reply'
  } finally {
    sending.value = false
  }
}

async function refreshComments() {
  if (!ticket.value || sending.value) return
  try {
    comments.value = await getComments(ticket.value.id)
  } catch {
    /* keep the current comments on failure */
  }
}

let commentsTimer = null

onMounted(() => {
  load()
  if (isStaff.value) loadKb()
  commentsTimer = setInterval(() => {
    if (!document.hidden && ticket.value) refreshComments()
  }, 20000)
})

onUnmounted(() => clearInterval(commentsTimer))
</script>

<template>
  <section class="card">
    <button class="btn btn-ghost btn-small" @click="router.back()">Back</button>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="loading" class="muted">Loading...</p>

    <template v-else>
      <h2 class="detail-title">Ticket {{ ticket.id }} — {{ ticket.subject }}</h2>

      <div class="meta-row">
        <StatusBadge :status="ticket.status" />
        <span class="badge" :class="PRIORITY_BADGE[ticket.priority]">{{ PRIORITY_LABEL[ticket.priority] }}</span>
        <CategoryBadge :category="ticket.category_name" :parent="ticket.category_parent_name" />
      </div>

      <p v-if="ticket.assigned_name || ticket.group_name" class="muted small">
        <template v-if="ticket.assigned_name">Assigned to <b>{{ ticket.assigned_name }}</b></template>
        <template v-if="ticket.assigned_name && ticket.group_name"> · </template>
        <template v-if="ticket.group_name">Group: <b>{{ ticket.group_name }}</b></template>
      </p>

      <div class="description" v-html="sanitizeHtml(ticket.description)"></div>

      <div v-if="ticket.attachments && ticket.attachments.length" class="attachments">
        <h3>Attachments</h3>
        <ul>
          <li v-for="attachment in ticket.attachments" :key="attachment.id">
            <a :href="attachment.file_url" target="_blank" rel="noopener" class="link">
              {{ attachment.file_name }}
            </a>
            <span class="muted small"> · {{ formatDate(attachment.created_at) }}</span>
          </li>
        </ul>
      </div>

      <p class="muted small">
        Created by {{ ticket.created_by_name || 'user #' + ticket.created_by }} · {{ formatDate(ticket.created_at) }}
      </p>

      <div v-if="canRate" class="rating-card">
        <h3>Rate your support</h3>
        <p class="muted small">How was the support for this ticket?</p>

        <div class="rating-buttons">
          <button
            class="rating-btn rating-positive"
            :class="{ active: ratingChoice === 'positive' }"
            type="button"
            @click="ratingChoice = 'positive'"
          >
            Positive
          </button>
          <button
            class="rating-btn rating-neutral"
            :class="{ active: ratingChoice === 'neutral' }"
            type="button"
            @click="ratingChoice = 'neutral'"
          >
            Neutral
          </button>
          <button
            class="rating-btn rating-negative"
            :class="{ active: ratingChoice === 'negative' }"
            type="button"
            @click="ratingChoice = 'negative'"
          >
            Negative
          </button>
        </div>

        <textarea v-model="ratingComment" rows="2" placeholder="Optional comment..."></textarea>

        <p v-if="ratingError" class="error">{{ ratingError }}</p>

        <button class="btn btn-small" type="button" :disabled="!ratingChoice || ratingSending" @click="submitFeedback">
          {{ ratingSending ? 'Sending...' : 'Submit rating' }}
        </button>
      </div>

      <div v-else-if="ticket.feedback" class="rating-card">
        <h3>Your rating</h3>
        <p>
          <span class="badge" :class="feedbackBadge(ticket.feedback.rating)">{{ ticket.feedback.rating }}</span>
          <span v-if="ticket.feedback.comment" class="muted"> — "{{ ticket.feedback.comment }}"</span>
        </p>
      </div>

      <div v-if="canEditResolution" class="resolution-card">
        <h3>HelpBot learning</h3>
        <p class="muted small">
          HelpBot reads the public conversation on this ticket. Add an optional summary if you want extra context.
        </p>

        <textarea
          v-model="resolutionText"
          rows="4"
          placeholder="Optional summary, e.g. which fix worked..."
        ></textarea>

        <label class="checkbox-row">
          <input v-model="resolutionBot" type="checkbox" />
          Allow HelpBot to use this conversation
        </label>

        <p v-if="resolutionError" class="error">{{ resolutionError }}</p>
        <p v-if="resolutionNotice" class="notice-ok">{{ resolutionNotice }}</p>

        <button class="btn btn-small" type="button" :disabled="savingResolution" @click="submitResolution">
          {{ savingResolution ? 'Saving...' : 'Save for HelpBot' }}
        </button>
      </div>

      <div class="card-head">
        <h3>Conversation</h3>
        <button class="btn btn-ghost btn-small" type="button" @click="refreshComments">Refresh</button>
      </div>
      <p v-if="!comments.length" class="muted">No messages yet. Start the conversation below.</p>

      <div v-else class="comments">
        <div
          v-for="comment in comments"
          :key="comment.id"
          class="comment"
          :class="{ internal: comment.is_internal }"
        >
          <div class="comment-avatar">{{ initials(comment.author_name) }}</div>
          <div class="comment-main">
            <div class="comment-head">
              <b>{{ comment.author_name }}</b>
              <span class="badge" :class="roleBadge(comment.author_role)">{{ comment.author_role }}</span>
              <span class="muted small">{{ timeAgo(comment.created_at) }}</span>
              <span v-if="comment.is_internal" class="badge badge-amber">Internal note</span>
            </div>
            <p class="comment-text" v-html="formatBody(comment.body)"></p>
            <div v-if="comment.attachments && comment.attachments.length" class="comment-attachments">
              <a
                v-for="attachment in comment.attachments"
                :key="attachment.id"
                :href="attachment.file_url"
                target="_blank"
                rel="noopener"
                class="link"
              >
                {{ attachment.file_name }}
              </a>
            </div>
          </div>
        </div>
      </div>

      <form class="reply-box" :class="{ 'reply-internal-mode': isInternal }" @submit.prevent="submitComment">
        <textarea
          v-model="newComment"
          rows="2"
          :placeholder="isInternal ? 'Write an internal note (staff only, the requester will not see it)...' : 'Type your reply...'"
        ></textarea>

        <div v-if="files.length" class="reply-files">
          <span v-for="file in files" :key="file.name" class="reply-file">{{ file.name }}</span>
        </div>

        <div class="reply-actions">
          <div class="reply-tools">
            <label class="icon-btn" title="Attach images">
              <input
                ref="fileInput"
                type="file"
                accept=".png,.jpg,.jpeg,.gif,.webp"
                multiple
                hidden
                @change="onFilesChange"
              />
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </label>

            <select v-if="isStaff" v-model="kbPick" class="kb-picker" @change="insertKb">
              <option value="">Insert KB article...</option>
              <option v-for="article in kbArticles" :key="article.id" :value="article.id">
                {{ article.title }}
              </option>
            </select>

            <label v-if="isStaff" class="checkbox-row reply-internal">
              <input v-model="isInternal" type="checkbox" />
              Internal note (hidden from the requester)
            </label>
          </div>

          <button
            class="btn btn-small"
            :class="{ 'btn-warning': isInternal }"
            type="submit"
            :disabled="sending || !newComment.trim()"
          >
            {{ sending ? 'Sending...' : isInternal ? 'Send internal note' : 'Send' }}
          </button>
        </div>
        <p v-if="commentError" class="error">{{ commentError }}</p>
      </form>

      <h3>History</h3>
      <ul class="timeline">
        <li v-for="entry in history" :key="entry.id">
          <span class="time muted small mono">{{ formatDate(entry.created_at) }}</span>
          <template v-if="entry.action === 'created'">
            <b>{{ entry.actor_name }}</b> created the ticket ({{ entry.to_status }})
          </template>
          <template v-else-if="entry.action === 'status_changed'">
            <b>{{ entry.actor_name }}</b>: {{ entry.from_status }} → <b>{{ entry.to_status }}</b>
            <span v-if="entry.note" class="muted">— "{{ entry.note }}"</span>
          </template>
          <template v-else-if="entry.action === 'resolution_saved'">
            <b>{{ entry.actor_name }}</b> saved the resolution
            <span v-if="entry.note" class="muted">— {{ entry.note }}</span>
          </template>
          <template v-else>
            <b>{{ entry.actor_name }}</b>
            {{ entry.action === 'assigned' ? 'updated the assignment' : entry.action === 'priority_changed' ? 'changed the priority' : entry.action }}
            <span v-if="entry.note" class="muted">— {{ entry.note }}</span>
          </template>
        </li>
      </ul>
    </template>
  </section>
</template>
