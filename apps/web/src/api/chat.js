import api from './client'

export function getChatStatus() {
  return api.get('/chat/status').then((res) => res.data)
}

export function sendChat({ question, history, sessionId }) {
  return api
    .post('/chat', { question, history, session_id: sessionId || undefined })
    .then((res) => res.data)
}

export function getChatTranscripts(limit = 100) {
  return api.get('/chat/transcripts', { params: { limit } }).then((res) => res.data.sessions)
}

export function getChatTranscript(sessionId) {
  return api
    .get(`/chat/transcripts/${encodeURIComponent(sessionId)}`)
    .then((res) => res.data)
}
