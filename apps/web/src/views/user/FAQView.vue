<script setup>
import { computed, onMounted, ref } from 'vue'
import { getArticles } from '../../api/kb'

const articles = ref([])
const loading = ref(true)
const error = ref('')
const searchQuery = ref('')

const filteredArticles = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return articles.value
  return articles.value.filter((a) => a.title.toLowerCase().includes(query))
})

onMounted(async () => {
  try {
    articles.value = await getArticles()
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load articles'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section class="card form-card">
    <div class="card-head">
      <h2>FAQ</h2>
      <span class="muted small">{{ filteredArticles.length }} article(s)</span>
    </div>
    <p class="muted">Self-service guides for common issues. Can't find an answer? Open a ticket.</p>

    <div class="search-box faq-search">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input v-model="searchQuery" type="text" placeholder="Search articles..." />
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="loading" class="muted">Loading...</p>
    <p v-else-if="!filteredArticles.length" class="muted">No articles found.</p>

    <ul v-else class="faq-list">
      <li v-for="article in filteredArticles" :key="article.id">
        <router-link :to="`/faq/${article.id}`" class="faq-link">
          <span>{{ article.title }}</span>
          <span v-if="article.category_name" class="badge badge-amber">{{ article.category_name }}</span>
        </router-link>
      </li>
    </ul>
  </section>
</template>
