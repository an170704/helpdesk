export function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('en-GB', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}
