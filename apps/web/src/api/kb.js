import api from './client'

export function getArticles() {
  return api.get('/kb').then((res) => res.data.articles)
}

export function getArticle(id) {
  return api.get(`/kb/${id}`).then((res) => res.data.article)
}
