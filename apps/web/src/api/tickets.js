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

export function uploadAttachments(id, files) {
  const formData = new FormData()
  for (const file of files) {
    formData.append('files', file)
  }
  return api.post(`/tickets/${id}/attachments`, formData).then((res) => res.data.attachments)
}
