import DOMPurify from 'dompurify'

export function sanitizeHtml(html) {
  return DOMPurify.sanitize(String(html || ''), { ADD_ATTR: ['target'] })
}
