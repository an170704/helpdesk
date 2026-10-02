import api from './client'

export function getChatbotSettings() {
  return api.get('/settings/chatbot').then((res) => res.data.settings)
}

export function saveChatbotSettings(payload) {
  return api.put('/settings/chatbot', payload)
}

export function testChatbot(payload) {
  return api.post('/settings/chatbot/test', payload).then((res) => res.data)
}
