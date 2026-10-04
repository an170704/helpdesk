import api from './client'

export function getMe() {
  return api.get('/users/me').then((res) => res.data)
}

export function updateMe(payload) {
  return api.patch('/users/me', payload).then((res) => res.data.user)
}

export function getTechnicians() {
  return api.get('/users/technicians').then((res) => res.data.technicians)
}

export function getUsers() {
  return api.get('/users').then((res) => res.data.users)
}

export function getUser(id) {
  return api.get(`/users/${id}`).then((res) => res.data.user)
}

export function getUserOverview(id) {
  return api.get(`/users/${id}/overview`).then((res) => res.data)
}

export function createUser(payload) {
  return api.post('/users', payload).then((res) => res.data.user)
}

export function updateUser(id, payload) {
  return api.patch(`/users/${id}`, payload).then((res) => res.data.user)
}

export function resetPassword(id, password) {
  return api.post(`/users/${id}/reset-password`, { password })
}
