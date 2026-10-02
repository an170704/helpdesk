import api from './client'

export function getGroups() {
  return api.get('/groups').then((res) => res.data.groups)
}
