import api from './client'

export function getGroups() {
  return api.get('/groups').then((res) => res.data.groups)
}

export function getGroupOptions() {
  return api.get('/groups/options').then((res) => res.data.groups)
}

export function getGroup(id) {
  return api.get(`/groups/${id}`).then((res) => res.data.group)
}

export function createGroup(payload) {
  return api.post('/groups', payload).then((res) => res.data.group)
}

export function updateGroup(id, payload) {
  return api.patch(`/groups/${id}`, payload).then((res) => res.data.group)
}

export function deleteGroup(id) {
  return api.delete(`/groups/${id}`)
}

export function setGroupMembers(id, userIds) {
  return api.put(`/groups/${id}/members`, { user_ids: userIds })
}

export function addGroupMembers(id, emails) {
  return api.post(`/groups/${id}/members`, { emails }).then((res) => res.data)
}

export function removeGroupMember(id, userId) {
  return api.delete(`/groups/${id}/members/${userId}`)
}

export function updateGroupBusinessHours(id, businessHours) {
  return api
    .put(`/groups/${id}/business-hours`, { business_hours: businessHours })
    .then((res) => res.data.business_hours)
}

export function updateGroupAssignmentMode(id, mode) {
  return api
    .put(`/groups/${id}/assignment-mode`, { assignment_mode: mode })
    .then((res) => res.data.assignment_mode)
}
