import api from './client'

export function getChatStatus() {
  return api.get('/chat/status').then((res) => res.data)
}

export function sendChat({ question, history }) {
  return api.post('/chat', { question, history }).then((res) => res.data)
}
