import api from './client'

export function getStats() {
  return api.get('/stats').then((res) => res.data.stats)
}
