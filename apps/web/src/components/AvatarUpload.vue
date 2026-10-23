<script setup>
import { ref } from 'vue'
import { uploadImage } from '../api/uploads'
import { initials, avatarColor } from '../utils/avatar'

const props = defineProps({
  src: { type: String, default: '' },
  name: { type: String, default: '' },
})

const emit = defineEmits(['uploaded', 'error'])

const input = ref(null)
const uploading = ref(false)

const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']

function pick() {
  if (!uploading.value) input.value?.click()
}

async function onChange(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  if (!ALLOWED_TYPES.includes(file.type)) {
    emit('error', 'Please choose a PNG, JPG, GIF or WEBP image')
    return
  }
  if (file.size > MAX_SIZE) {
    emit('error', 'Image must be 5 MB or smaller')
    return
  }

  uploading.value = true
  try {
    emit('uploaded', await uploadImage(file))
  } catch (err) {
    emit('error', err.response?.data?.message || 'Could not upload the image')
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div class="avatar-uploader">
    <button
      type="button"
      class="avatar-upload"
      :disabled="uploading"
      title="Change avatar"
      @click="pick"
    >
      <img v-if="props.src" :src="props.src" class="avatar-lg-img" alt="" />
      <span v-else class="avatar-lg" :class="avatarColor(props.name)">{{ initials(props.name) }}</span>

      <span class="avatar-overlay">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
          <circle cx="12" cy="13" r="3" />
        </svg>
        <span>{{ uploading ? 'Uploading...' : 'Change' }}</span>
      </span>
    </button>

    <input
      ref="input"
      type="file"
      accept="image/png,image/jpeg,image/gif,image/webp"
      class="avatar-file-input"
      @change="onChange"
    />
  </div>
</template>
