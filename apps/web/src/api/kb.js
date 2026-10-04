import api from './client'

export function getArticles() {
  return api.get('/kb').then((res) => res.data.articles)
}

export function getAdminArticles() {
  return api.get('/kb/all').then((res) => res.data.articles)
}

export function getArticle(id) {
  return api.get(`/kb/${id}`).then((res) => res.data.article)
}

export function createArticle(payload) {
  return api.post('/kb', payload).then((res) => res.data.article)
}

export function updateArticle(id, payload) {
  return api.patch(`/kb/${id}`, payload).then((res) => res.data.article)
}

export function deleteArticle(id) {
  return api.delete(`/kb/${id}`)
}

