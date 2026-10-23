import api from './client'

export function uploadImage(file) {
  const form = new FormData()
  form.append('image', file)
  return api.post('/uploads/images', form).then((res) => res.data.url)
}
