import api from './client'

export function getNotifications() {
  return api.get('/notifications').then((res) => res.data)
}

export function markRead(id) {
  return api.patch(`/notifications/${id}/read`)
}

export function markAllRead() {
  return api.patch('/notifications/read-all')
}

export function deleteNotification(id) {
  return api.delete(`/notifications/${id}`)
}

export function clearNotifications() {
  return api.delete('/notifications')
}
