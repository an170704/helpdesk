<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getArticle, createArticle, updateArticle } from '../../api/kb'
import { getGroups } from '../../api/groups'
import { getCategories } from '../../api/categories'
import RichTextEditor from '../../components/RichTextEditor.vue'
import CategorySelect from '../../components/CategorySelect.vue'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => !!route.params.id)

const title = ref('')
const content = ref('')
const categoryValue = ref('')
const groups = ref([])
const categories = ref([])
const isPublished = ref(false)

const loading = ref(false)
const saving = ref(false)
const savingAction = ref('')
const error = ref('')

async function loadData() {
  loading.value = true
  try {
    const [allGroups, allCategories] = await Promise.all([getGroups(), getCategories()])
    groups.value = allGroups
    categories.value = allCategories

    if (isEdit.value) {
      const article = await getArticle(route.params.id)
      title.value = article.title
      content.value = article.content
      categoryValue.value = article.category_id
        ? `c:${article.category_id}`
        : article.group_id
          ? `g:${article.group_id}`
          : ''
      isPublished.value = article.is_published
    }
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to load the article'
  } finally {
    loading.value = false
  }
}

async function save(publish) {
  error.value = ''

  const plainContent = content.value.replace(/<[^>]*>/g, ' ').trim()
  if (!title.value.trim()) {
    error.value = 'Title is required'
    return
  }
  if (!plainContent) {
    error.value = 'Content is required'
    return
  }

  const willPublish = publish === undefined ? isPublished.value : publish
  isPublished.value = willPublish
  saving.value = true
  savingAction.value = publish === undefined ? 'save' : willPublish ? 'publish' : 'unpublish'

  try {
    const payload = {
      title: title.value.trim(),
      content: content.value,
      category_id: null,
      group_id: null,
      is_published: willPublish,
    }

    if (categoryValue.value.startsWith('c:')) {
      payload.category_id = Number(categoryValue.value.slice(2))
    } else if (categoryValue.value.startsWith('g:')) {
      payload.group_id = Number(categoryValue.value.slice(2))
    }

    if (isEdit.value) {
      await updateArticle(route.params.id, payload)
    } else {
      await createArticle(payload)
    }
    router.push('/kb')
  } catch (err) {
    error.value = err.response?.data?.message || 'Could not save the article'
  } finally {
    saving.value = false
    savingAction.value = ''
  }
}

onMounted(loadData)
</script>

<template>
  <div>
    <button class="btn btn-ghost btn-small" @click="router.push('/kb')">Back to Knowledge Base</button>

    <p v-if="error" class="error" style="margin-top: 14px">{{ error }}</p>

    <section class="card" style="margin-top: 14px">
      <p v-if="loading" class="muted">Loading...</p>

      <template v-else>
        <div class="kb-body">
          <input v-model="title" class="kb-title-input" type="text" placeholder="Title" />

          <div class="kb-category-field">
            <label>Group → Category</label>
            <CategorySelect
              v-model="categoryValue"
              :groups="groups"
              :categories="categories"
              placeholder="Select a group or category..."
              allow-group
            />
          </div>

          <RichTextEditor v-model="content" placeholder="Type something" />

          <div class="row form-actions">
            <button class="btn" type="button" :disabled="saving" @click="save(true)">
              {{ savingAction === 'publish' ? 'Publishing...' : 'Publish' }}
            </button>
            <button class="btn btn-ghost" type="button" :disabled="saving" @click="save()">
              {{ savingAction === 'save' ? 'Saving...' : 'Save' }}
            </button>
            <button
              v-if="isEdit && isPublished"
              class="btn btn-ghost"
              type="button"
              :disabled="saving"
              @click="save(false)"
            >
              {{ savingAction === 'unpublish' ? 'Saving...' : 'Unpublish' }}
            </button>
            <button class="btn btn-ghost" type="button" @click="router.push('/kb')">Cancel</button>
          </div>
        </div>
      </template>
    </section>
  </div>
</template>
