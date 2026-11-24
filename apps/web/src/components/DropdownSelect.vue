<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Select...' },
  disabled: { type: Boolean, default: false },
  ariaLabel: { type: String, default: '' },
  id: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])

const root = ref(null)
const trigger = ref(null)
const list = ref(null)
const open = ref(false)
const activeIndex = ref(-1)

const currentValue = computed(() => String(props.modelValue ?? ''))
const selectedIndex = computed(() =>
  props.options.findIndex((option) => String(option.value) === currentValue.value)
)
const selectedOption = computed(() =>
  selectedIndex.value >= 0 ? props.options[selectedIndex.value] : null
)

function openMenu() {
  if (props.disabled) return
  open.value = true
  activeIndex.value = selectedIndex.value >= 0 ? selectedIndex.value : 0
  nextTick(scrollActiveIntoView)
}

function closeMenu() {
  open.value = false
  activeIndex.value = -1
}

function toggle() {
  if (open.value) closeMenu()
  else openMenu()
}

function choose(option) {
  emit('update:modelValue', option.value)
  closeMenu()
  trigger.value?.focus()
}

function moveActive(step) {
  const count = props.options.length
  if (!count) return
  activeIndex.value = (activeIndex.value + step + count) % count
  nextTick(scrollActiveIntoView)
}

function scrollActiveIntoView() {
  if (activeIndex.value < 0 || !list.value) return
  const item = list.value.children[activeIndex.value]
  if (item && item.scrollIntoView) item.scrollIntoView({ block: 'nearest' })
}

function onKeydown(event) {
  if (props.disabled) return

  if (!open.value) {
    if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault()
      openMenu()
    }
    return
  }

  switch (event.key) {
    case 'Escape':
      event.preventDefault()
      closeMenu()
      trigger.value?.focus()
      break
    case 'ArrowDown':
      event.preventDefault()
      moveActive(1)
      break
    case 'ArrowUp':
      event.preventDefault()
      moveActive(-1)
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      if (activeIndex.value >= 0 && props.options[activeIndex.value]) {
        choose(props.options[activeIndex.value])
      }
      break
    case 'Tab':
      closeMenu()
      break
  }
}

function onDocumentPointerDown(event) {
  if (!open.value) return
  if (root.value && !root.value.contains(event.target)) closeMenu()
}

watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) closeMenu()
  }
)

watch(
  () => props.options,
  () => {
    if (open.value && activeIndex.value >= props.options.length) {
      activeIndex.value = Math.max(0, props.options.length - 1)
    }
  },
  { deep: true }
)

onMounted(() => document.addEventListener('pointerdown', onDocumentPointerDown))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocumentPointerDown))
</script>

<template>
  <div
    ref="root"
    class="ui-select"
    :class="{ 'is-open': open, 'is-disabled': disabled }"
    @keydown="onKeydown"
  >
    <button
      ref="trigger"
      type="button"
      class="ui-select-trigger"
      :id="id || undefined"
      :disabled="disabled"
      :aria-label="ariaLabel || placeholder"
      aria-haspopup="listbox"
      :aria-expanded="open"
      @click="toggle"
    >
      <span class="ui-select-value" :class="{ placeholder: !selectedOption }">
        {{ selectedOption ? selectedOption.label : placeholder }}
      </span>
      <svg class="ui-select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>

    <div v-if="open" ref="list" class="ui-select-panel" role="listbox">
      <button
        v-for="(option, index) in options"
        :key="String(option.value)"
        type="button"
        class="ui-select-option"
        :class="{ selected: index === selectedIndex, active: index === activeIndex }"
        role="option"
        :aria-selected="index === selectedIndex"
        @mouseenter="activeIndex = index"
        @click="choose(option)"
      >
        {{ option.label }}
      </button>
      <p v-if="!options.length" class="ui-select-empty">No options</p>
    </div>
  </div>
</template>
