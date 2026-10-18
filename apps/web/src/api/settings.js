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

export function getGeneralSettings() {
  return api.get('/settings/general').then((res) => res.data)
}

export function saveGeneralSettings(payload) {
  return api.put('/settings/general', payload).then((res) => res.data)
}
