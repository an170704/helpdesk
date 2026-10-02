<script setup>
defineProps({
  category: { type: String, default: '' },
  parent: { type: String, default: '' },
})
</script>

<template>
  <span v-if="category" class="badge badge-amber">
    {{ parent ? parent + ' > ' + category : category }}
  </span>
  <span v-else class="muted">none</span>
</template>
