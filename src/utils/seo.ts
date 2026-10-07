export const SITE_URL = 'https://kgmcloud.co.uk'

export const DEFAULT_OG_IMAGE = '/og-image.png'

export const DEFAULT_TITLE = 'KGM Cloud | Digital Roblox products'

export const DEFAULT_DESCRIPTION =
  'Shop digital Roblox products for roleplay servers: tools, scripts and services with documentation, configs and support. Explore the KGM range today.'

const DEFAULT_ROBOTS = 'index, follow'

const META_DESC_MAX = 158

export interface SeoMeta {
  title?: string
  description?: string
  image?: string
  ogType?: string
  url?: string
  robots?: string
  noindex?: boolean
}

export function absUrl(path: string): string {
  if (!path) return SITE_URL
  if (/^https?:\/\//i.test(path)) return path
  return SITE_URL + (path.startsWith('/') ? path : '/' + path)
}

function trimDescription(value: string | undefined, fallback: string): string {
  const text = (value || fallback).replace(/\s+/g, ' ').trim()
  return text.length > META_DESC_MAX ? text.slice(0, META_DESC_MAX - 1).trimEnd() + '…' : text
}

function ensureMeta(attr: 'name' | 'property', key: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function ensureLink(rel: string, href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

export function setPageMeta(opts: SeoMeta): void {
  const title = opts.title || DEFAULT_TITLE
  const description = trimDescription(opts.description, DEFAULT_DESCRIPTION)
  const image = opts.image ? absUrl(opts.image) : absUrl(DEFAULT_OG_IMAGE)
  const url = opts.url ? absUrl(opts.url) : SITE_URL
  const robots = opts.noindex ? 'noindex, nofollow' : opts.robots || DEFAULT_ROBOTS

  document.title = title

  ensureMeta('name', 'description', description)
  ensureMeta('name', 'robots', robots)

  ensureMeta('property', 'og:title', title)
  ensureMeta('property', 'og:description', description)
  ensureMeta('property', 'og:type', opts.ogType || 'website')
  ensureMeta('property', 'og:image', image)
  ensureMeta('property', 'og:url', url)

  ensureMeta('name', 'twitter:card', 'summary_large_image')
  ensureMeta('name', 'twitter:title', title)
  ensureMeta('name', 'twitter:description', description)
  ensureMeta('name', 'twitter:image', image)

  ensureLink('canonical', url)
}

export function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim()
}

export function injectJSONLD(id: string, data: unknown): void {
  removeJSONLD(id)
  const script = document.createElement('script')
  script.type = 'application/ld+json'
  script.id = id
  script.textContent = JSON.stringify(data)
  document.head.appendChild(script)
}

export function removeJSONLD(id: string): void {
  document.head.querySelector(`script#${id}`)?.remove()
}