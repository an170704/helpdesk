<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { categoriesOfGroup } from '../utils/categories'

const props = defineProps({
  modelValue: { type: String, default: '' },
  groups: { type: Array, default: () => [] },
  categories: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Select...' },
  allowGroup: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const query = ref('')
const rootEl = ref(null)
const searchEl = ref(null)

const selectedLabel = computed(() => {
  const value = String(props.modelValue || '')
  if (!value) return ''

  const [type, rawId] = value.split(':')
  const id = Number(rawId)

  if (type === 'g') {
    const group = props.groups.find((g) => g.id === id)
    return group ? group.name : ''
  }

  for (const group of props.groups) {
    for (const category of categoriesOfGroup(props.categories, group)) {
      if (category.id === id) return `${group.name} > ${category.name}`
    }
  }
  return ''
})

const filteredGroups = computed(() => {
  const q = query.value.trim().toLowerCase()

  return props.groups
    .map((group) => {
      const nameMatch = !q || group.name.toLowerCase().includes(q)
      const categories = categoriesOfGroup(props.categories, group).filter(
        (category) =>
          !q || nameMatch || `${group.name} > ${category.name}`.toLowerCase().includes(q)
      )
      return { id: group.id, name: group.name, nameMatch, categories }
    })
    .filter((group) => group.categories.length || (props.allowGroup && group.nameMatch))
})

function choose(value) {
  emit('update:modelValue', value)
  open.value = false
  query.value = ''
}

function toggleOpen() {
  open.value = !open.value
  if (open.value) {
    query.value = ''
    setTimeout(() => searchEl.value && searchEl.value.focus(), 0)
  }
}

function onDocClick(event) {
  if (rootEl.value && !rootEl.value.contains(event.target)) open.value = false
}

onMounted(() => document.addEventListener('mousedown', onDocClick))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocClick))
</script>

<template>
  <div ref="rootEl" class="cat-select">
    <button type="button" class="cat-select-trigger" @click="toggleOpen">
      <span :class="{ 'cat-select-placeholder': !selectedLabel }">
        {{ selectedLabel || placeholder }}
      </span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>

    <div v-if="open" class="cat-select-panel">
      <div class="cat-select-search">
        <input ref="searchEl" v-model="query" type="text" placeholder="Search..." />
      </div>

      <div class="cat-select-list">
        <button type="button" class="cat-select-item cat-select-none" @click="choose('')">
          None
        </button>

        <template v-for="group in filteredGroups" :key="group.id">
          <button
            v-if="allowGroup"
            type="button"
            class="cat-select-item cat-select-group-option"
            :class="{ selected: modelValue === `g:${group.id}` }"
            @click="choose(`g:${group.id}`)"
          >
            {{ group.name }}
          </button>
          <div v-else class="cat-select-group">{{ group.name }}</div>

          <button
            v-for="category in group.categories"
            :key="category.id"
            type="button"
            class="cat-select-item"
            :class="{ selected: modelValue === `c:${category.id}` }"
            @click="choose(`c:${category.id}`)"
          >
            » {{ group.name }} > {{ category.name }}
          </button>
        </template>

        <p v-if="!filteredGroups.length" class="muted small cat-select-empty">No results found.</p>
      </div>
    </div>
  </div>
</template>
