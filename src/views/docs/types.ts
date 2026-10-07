export interface DocSection {
  level: number
  title: string
  slug: string
}

export interface DocIndexEntry {
  slug: string
  title: string
  category: string
  addon: boolean
  sections: DocSection[]
}

export interface DocCategory {
  name: string
  docs: DocIndexEntry[]
}

export interface DocsResponse {
  categories: DocCategory[]
  docs: DocIndexEntry[]
}

export interface DocDetail {
  slug: string
  title: string
  category: string
  markdown: string
}