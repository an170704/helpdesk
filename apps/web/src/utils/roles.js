export const ROLE_LABEL = {
  user: 'User',
  technician: 'Agent',
  admin: 'Admin',
}

export function roleLabel(user) {
  if (!user) return ''
  return (user.title && user.title.trim()) || ROLE_LABEL[user.role] || user.role
}
