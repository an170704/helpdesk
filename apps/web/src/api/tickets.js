import api from './client'

export function getTickets() {
  return api.get('/tickets').then((res) => res.data.tickets)
}

export function getTicket(id) {
  return api.get(`/tickets/${id}`).then((res) => res.data.ticket)
}

export function createTicket(payload) {
  return api.post('/tickets', payload).then((res) => res.data.ticket)
}

export function getHistory(id) {
  return api.get(`/tickets/${id}/history`).then((res) => res.data.history)
}

export function updateStatus(id, status, note) {
  return api.patch(`/tickets/${id}/status`, { status, note }).then((res) => res.data.ticket)
}

export function updatePriority(id, priority) {
  return api.patch(`/tickets/${id}/priority`, { priority }).then((res) => res.data.ticket)
}

export function updateCategory(id, categoryId) {
  return api
    .patch(`/tickets/${id}/category`, { category_id: categoryId })
    .then((res) => res.data.ticket)
}

export function assignTicket(id, payload) {
  return api.patch(`/tickets/${id}/assign`, payload).then((res) => res.data.ticket)
}

export function deleteTicket(id) {
  return api.delete(`/tickets/${id}`)
}

export function uploadAttachments(id, files) {
  const formData = new FormData()
  for (const file of files) {
    formData.append('files', file)
  }
  return api.post(`/tickets/${id}/attachments`, formData).then((res) => res.data.attachments)
}

export function getComments(id) {
  return api.get(`/tickets/${id}/comments`).then((res) => res.data.comments)
}

export function createComment(id, { body, is_internal = false, files = [] }) {
  const formData = new FormData()
  formData.append('body', body)
  formData.append('is_internal', is_internal ? 'true' : 'false')
  for (const file of files) {
    formData.append('files', file)
  }
  return api.post(`/tickets/${id}/comments`, formData).then((res) => res.data.comment)
}

export function createFeedback(id, payload) {
  return api.post(`/tickets/${id}/feedback`, payload).then((res) => res.data.feedback)
}
