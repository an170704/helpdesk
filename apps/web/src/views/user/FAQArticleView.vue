<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getArticle } from '../../api/kb'
import { formatDate } from '../../utils/format'

const route = useRoute()
const router = useRouter()

const article = ref(null)
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    article.value = await getArticle(route.params.id)
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load the article'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section class="card form-card">
    <button class="btn btn-ghost btn-small" @click="router.push('/faq')">Back to FAQ</button>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="loading" class="muted">Loading...</p>

    <template v-else>
      <h2 class="detail-title">{{ article.title }}</h2>

      <div class="meta-row">
        <span v-if="article.category_name" class="badge badge-amber">{{ article.category_name }}</span>
        <span class="muted small">Updated {{ formatDate(article.created_at) }}</span>
      </div>

      <p class="faq-content">{{ article.content }}</p>
    </template>
  </section>
</template>
