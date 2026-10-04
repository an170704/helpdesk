<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getAdminArticles, deleteArticle } from '../../api/kb'
import { formatDate } from '../../utils/format'
import Pagination from '../../components/Pagination.vue'

const router = useRouter()

const articles = ref([])
const loading = ref(true)
const error = ref('')
const notice = ref(null)
const searchQuery = ref('')
const statusFilter = ref('all')
const page = ref(1)
const pageSize = ref(10)
const selected = ref([])

let noticeTimer = null

const filteredArticles = computed(() => {
  let list = [...articles.value]

  if (statusFilter.value === 'published') {
    list = list.filter((a) => a.is_published)
  } else if (statusFilter.value === 'draft') {
    list = list.filter((a) => !a.is_published)
  }

  const query = searchQuery.value.trim().toLowerCase()
  if (query) {
    list = list.filter((a) => a.title.toLowerCase().includes(query))
  }

  return list
})

const pagedArticles = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredArticles.value.slice(start, start + pageSize.value)
})

const allPageSelected = computed(
  () => pagedArticles.value.length > 0 && pagedArticles.value.every((a) => selected.value.includes(a.id))
)

function isSelected(id) {
  return selected.value.includes(id)
}

function toggleOne(id, checked) {
  if (checked) {
    selected.value = [...selected.value, id]
  } else {
    selected.value = selected.value.filter((value) => value !== id)
  }
}

function toggleAll(checked) {
  const ids = pagedArticles.value.map((a) => a.id)
  if (checked) {
    selected.value = [...new Set([...selected.value, ...ids])]
  } else {
    selected.value = selected.value.filter((id) => !ids.includes(id))
  }
}

watch([statusFilter, searchQuery], () => {
  page.value = 1
  selected.value = []
})

watch(page, () => {
  selected.value = []
})

function showNotice(text, type = 'ok') {
  notice.value = { text, type }
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => (notice.value = null), 3500)
}

function classification(article) {
  if (article.category_name) {
    return article.group_name ? `${article.group_name} > ${article.category_name}` : article.category_name
  }
  return article.group_name || '—'
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    articles.value = await getAdminArticles()
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load articles'
  } finally {
    loading.value = false
  }
}

async function askDelete(article) {
  if (!window.confirm(`Delete "${article.title}"? This cannot be undone.`)) return

  try {
    await deleteArticle(article.id)
    showNotice(`Deleted "${article.title}"`)
    await load()
  } catch (err) {
    showNotice(err.response?.data?.message || 'Could not delete the article', 'error')
  }
}

async function deleteSelected() {
  if (!selected.value.length) return
  if (!window.confirm(`Delete ${selected.value.length} selected article(s)? This cannot be undone.`)) return

  try {
    await Promise.all(selected.value.map((id) => deleteArticle(id)))
    showNotice(`Deleted ${selected.value.length} article(s)`)
    selected.value = []
    await load()
  } catch (err) {
    showNotice(err.response?.data?.message || 'Could not delete articles', 'error')
    await load()
  }
}

onMounted(load)
</script>

<template>
  <section class="card">
    <div class="card-head">
      <h2>Knowledge Base</h2>
      <div class="head-actions">
        <span class="muted small">{{ filteredArticles.length }} article(s)</span>
        <button
          class="btn btn-ghost btn-small btn-danger btn-icon"
          :disabled="!selected.length"
          @click="deleteSelected"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
          </svg>
          Delete ({{ selected.length }})
        </button>
        <router-link to="/kb/new" class="btn btn-small">New article</router-link>
      </div>
    </div>

    <div class="filters">
      <select v-model="statusFilter">
        <option value="all">All statuses</option>
        <option value="published">Published</option>
        <option value="draft">Draft</option>
      </select>

      <div class="search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input v-model="searchQuery" type="text" placeholder="Search title..." />
      </div>
    </div>

    <p v-if="notice" :class="notice.type === 'error' ? 'error' : 'notice-ok'">{{ notice.text }}</p>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="loading" class="muted">Loading...</p>
    <p v-else-if="!filteredArticles.length" class="muted">No articles match this filter.</p>

    <div v-else class="table-wrap">
      <table>
        <thead>
          <tr>
            <th class="check-col">
              <input
                type="checkbox"
                :checked="allPageSelected"
                @change="toggleAll($event.target.checked)"
              />
            </th>
            <th>Title</th>
            <th>Category</th>
            <th>Status</th>
            <th>Updated</th>
            <th class="menu-col"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="article in pagedArticles"
            :key="article.id"
            class="row-link"
            :class="{ 'row-selected': isSelected(article.id) }"
            @click="router.push(`/kb/${article.id}/edit`)"
          >
            <td class="check-col" @click.stop>
              <input
                type="checkbox"
                :checked="isSelected(article.id)"
                @change="toggleOne(article.id, $event.target.checked)"
              />
            </td>
            <td>{{ article.title }}</td>
            <td class="muted">{{ classification(article) }}</td>
            <td>
              <span class="badge" :class="article.is_published ? 'badge-green' : 'badge-amber'">
                {{ article.is_published ? 'Published' : 'Draft' }}
              </span>
            </td>
            <td class="muted small">{{ formatDate(article.updated_at) }}</td>
            <td class="menu-col" @click.stop>
              <div class="row-actions">
                <button class="icon-btn" title="Edit" @click="router.push(`/kb/${article.id}/edit`)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                  </svg>
                </button>
                <button class="icon-btn icon-btn-danger" title="Delete" @click="askDelete(article)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18" />
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Pagination
      v-model:page="page"
      v-model:pageSize="pageSize"
      :total="filteredArticles.length"
    />
  </section>
</template>
