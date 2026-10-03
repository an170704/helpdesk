const AVATAR_COLORS = [
  'avatar-1', 'avatar-2', 'avatar-3', 'avatar-4',
  'avatar-5', 'avatar-6', 'avatar-7', 'avatar-8',
]

export function initials(name) {
  return (name || '')
    .split(' ')
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function avatarColor(key) {
  const text = String(key || '')
  let sum = 0
  for (const char of text) sum += char.charCodeAt(0)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}
