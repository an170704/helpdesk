<script setup>
import { onMounted, ref, watch } from 'vue'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'
import api from '../api/client'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Write here...' },
})

const emit = defineEmits(['update:modelValue'])

const editorEl = ref(null)
let quill = null

const TOOLBAR = [
  ['bold', 'italic', 'underline', 'strike'],
  [{ header: [2, 3, false] }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  [{ color: [] }],
  ['link', 'image', 'blockquote', 'code-block'],
  ['clean'],
]

function uploadImage() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.png,.jpg,.jpeg,.gif,.webp'

  input.onchange = async () => {
    const file = input.files && input.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('image', file)

    try {
      const { data } = await api.post('/uploads/images', formData)
      const range = quill.getSelection(true) || { index: quill.getLength() }
      quill.insertEmbed(range.index, 'image', data.url)
      quill.setSelection(range.index + 1)
    } catch {
      /* upload errors are ignored; the user can retry */
    }
  }

  input.click()
}

onMounted(() => {
  quill = new Quill(editorEl.value, {
    theme: 'snow',
    placeholder: props.placeholder,
    modules: {
      toolbar: {
        container: TOOLBAR,
        handlers: { image: uploadImage },
      },
    },
  })

  if (props.modelValue) {
    quill.clipboard.dangerouslyPasteHTML(props.modelValue)
  }

  quill.on('text-change', () => {
    const html = quill.root.innerHTML
    emit('update:modelValue', html === '<p><br></p>' ? '' : html)
  })
})

watch(
  () => props.modelValue,
  (value) => {
    if (!quill || value) return
    if (quill.root.innerHTML !== '<p><br></p>') {
      quill.setContents([], 'silent')
    }
  }
)
</script>

<template>
  <div class="rich-editor">
    <div ref="editorEl"></div>
  </div>
</template>
