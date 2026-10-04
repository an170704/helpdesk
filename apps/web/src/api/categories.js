import api from './client'

export function getCategories() {
  return api.get('/categories').then((res) => res.data.categories)
}

export function createCategory(payload) {
  return api.post('/categories', payload).then((res) => res.data.category)
}

export function deleteCategory(id) {
  return api.delete(`/categories/${id}`)
}
