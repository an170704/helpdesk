import api from './client'

export function getStats() {
  return api.get('/stats').then((res) => res.data.stats)
}

export function getMyStats() {
  return api.get('/stats/me').then((res) => res.data.stats)
}
