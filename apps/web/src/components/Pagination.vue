<script setup>
import { computed } from 'vue'

const props = defineProps({
  total: { type: Number, required: true },
  page: { type: Number, required: true },
  pageSize: { type: Number, required: true },
})

const emit = defineEmits(['update:page', 'update:pageSize'])

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const from = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1))
const to = computed(() => Math.min(props.total, props.page * props.pageSize))

function go(page) {
  if (page < 1 || page > totalPages.value) return
  emit('update:page', page)
}

function changeSize(event) {
  emit('update:pageSize', Number(event.target.value))
  emit('update:page', 1)
}
</script>

<template>
  <div class="pager">
    <div class="pager-size">
      <select :value="pageSize" @change="changeSize">
        <option :value="10">10</option>
        <option :value="20">20</option>
        <option :value="50">50</option>
      </select>
      <span class="muted small">rows / page</span>
    </div>

    <span class="muted small">Showing {{ from }} to {{ to }} of {{ total }} rows</span>

    <div class="pager-nav">
      <button class="btn btn-ghost btn-small" :disabled="page <= 1" @click="go(page - 1)">Prev</button>
      <span class="muted small">Page {{ page }} / {{ totalPages }}</span>
      <button class="btn btn-ghost btn-small" :disabled="page >= totalPages" @click="go(page + 1)">Next</button>
    </div>
  </div>
</template>
