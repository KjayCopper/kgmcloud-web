import DOMPurify from 'dompurify'

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(String(html ?? ''), {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target'],
  })
}