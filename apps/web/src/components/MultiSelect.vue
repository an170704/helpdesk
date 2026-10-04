<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Select...' },
})

const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const rootEl = ref(null)

const selected = computed(() => props.options.filter((opt) => props.modelValue.includes(opt.id)))

function toggle(id) {
  if (props.modelValue.includes(id)) {
    emit('update:modelValue', props.modelValue.filter((value) => value !== id))
  } else {
    emit('update:modelValue', [...props.modelValue, id])
  }
}

function onDocClick(event) {
  if (rootEl.value && !rootEl.value.contains(event.target)) open.value = false
}

onMounted(() => document.addEventListener('mousedown', onDocClick))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocClick))
</script>

<template>
  <div ref="rootEl" class="multi-select">
    <div class="multi-box" @click="open = !open">
      <span v-for="opt in selected" :key="opt.id" class="chip">
        {{ opt.label }}
        <button type="button" title="Remove" @click.stop="toggle(opt.id)">×</button>
      </span>

      <span v-if="!selected.length" class="multi-placeholder">{{ placeholder }}</span>

      <svg class="multi-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>

    <div v-if="open" class="multi-panel">
      <label v-for="opt in options" :key="opt.id" class="checkbox-row">
        <input type="checkbox" :checked="modelValue.includes(opt.id)" @change="toggle(opt.id)" />
        {{ opt.label }}
      </label>
      <p v-if="!options.length" class="muted small">No options available.</p>
    </div>
  </div>
</template>
