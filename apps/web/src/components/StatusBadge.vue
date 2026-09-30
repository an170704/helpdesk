<script setup>
import { STATUS_LABEL, STATUS_BADGE } from '../utils/status'

defineProps({
  status: { type: String, required: true },
})
</script>

<template>
  <span class="badge" :class="STATUS_BADGE[status] || 'badge-gray'">
    {{ STATUS_LABEL[status] || status }}
  </span>
</template>
