import { sanitizeHtml } from './sanitizeHtml'

const TAG_RE = /(<\/?[a-z][a-z0-9]*[^>]*>)/gi
const SINGLE_TAG_RE = /<\/?[a-z][a-z0-9]*[^>]*>/i
const BLOCK_TAGS = new Set([
  'h1','h2','h3','h4','h5','h6','p','div','ul','ol','li','blockquote','pre','table',
  'thead','tbody','tfoot','tr','td','th','section','article','aside','figure','figcaption',
  'hr','br','dl','dt','dd','header','footer','main','nav','address','fieldset','iframe',
])

function escText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function adjustDepth(html: string, depth: number): number {
  if (/^<\//.test(html)) return Math.max(0, depth - 1)
  if (/\/>$/.test(html)) return depth
  return depth + 1
}

function tagName(html: string): string {
  const m = html.match(/^<\/?([a-z][a-z0-9]*)/i)
  return m ? m[1].toLowerCase() : ''
}

/**
 * Render a product description. Existing HTML tags pass through untouched
 * (block tags end the current paragraph, inline tags splice into it); bare
 * top-level text gets newlines converted into real <p>/<br> structure so
 * line breaks always render, even in mixed plain-text/HTML content.
 */
export function descriptionHtml(raw: string | null | undefined): string {
  const src = String(raw ?? '').replace(/\r\n?/g, '\n').trim()
  if (!src) return ''
  let out = ''
  let paraOpen = false
  let depth = 0

  const flush = () => {
    if (paraOpen) {
      out += '</p>'
      paraOpen = false
    }
  }

  const appendText = (txt: string, top: boolean) => {
    if (!top) {
      const t = txt.trim()
      if (t) out += escText(t).replace(/\n/g, '<br>')
      return
    }
    const lines = txt
      .trim()
      .split(/\n{2,}/)
      .filter((s) => s.trim() !== '')
    for (let i = 0; i < lines.length; i++) {
      if (!paraOpen) {
        out += '<p>'
        paraOpen = true
      }
      out += escText(lines[i]).replace(/\n/g, '<br>')
      if (i < lines.length - 1) out += '</p><p>'
    }
  }

  for (const part of src.split(TAG_RE)) {
    if (!part) continue
    if (SINGLE_TAG_RE.test(part)) {
      const block = BLOCK_TAGS.has(tagName(part))
      if (depth === 0 && block) flush()
      out += part
      depth = adjustDepth(part, depth)
      continue
    }
    appendText(part, depth === 0)
  }
  flush()
  return sanitizeHtml(out)
}

/**
 * Same idea for short descriptions rendered inline: newlines become <br>,
 * existing HTML tags pass through untouched.
 */
export function shortDescriptionHtml(raw: string | null | undefined): string {
  const src = String(raw ?? '').replace(/\r\n?/g, '\n').trim()
  if (!src) return ''
  let depth = 0
  let html = ''
  for (const part of src.split(TAG_RE)) {
    if (!part) continue
    if (SINGLE_TAG_RE.test(part)) {
      html += part
      depth = adjustDepth(part, depth)
      continue
    }
    if (depth === 0) {
      html += part
        .split(/\n+/)
        .map((s) => s.trim())
        .filter((s) => s !== '')
        .map((s) => escText(s))
        .join('<br>')
    } else if (part.trim()) {
      html += escText(part.trim())
    }
  }
  return sanitizeHtml(html)
}