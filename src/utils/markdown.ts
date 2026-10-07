import { Marked } from 'marked'
import { sanitizeHtml } from './sanitizeHtml'

const usedIds = new Map<string, number>()

function slugifyId(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function uniqueId(slug: string): string {
  const n = (usedIds.get(slug) || 0) + 1
  usedIds.set(slug, n)
  return n === 1 ? slug : `${slug}-${n - 1}`
}

const marked = new Marked({
  gfm: true,
  renderer: {
    heading({ tokens, depth }) {
      const text = (tokens as Array<{ text?: string }>).map((t) => t.text ?? '').join('')
      const id = uniqueId(slugifyId(text))
      return `<h${depth} id="${id}">${text}</h${depth}>`
    },
  },
})

export function renderMarkdown(md: string): string {
  usedIds.clear()
  const html = marked.parse(md) as string
  return sanitizeHtml(html)
}