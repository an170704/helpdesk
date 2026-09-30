<script setup>
defineProps({
  category: { type: String, default: '' },
  confidence: { type: Number, default: null },
})
</script>

<template>
  <span v-if="category" class="badge badge-amber">
    {{ category }}<template v-if="confidence != null"> · {{ Math.round(confidence * 100) }}%</template>
  </span>
  <span v-else class="muted">none</span>
</template>
