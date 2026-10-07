import { reactive } from 'vue'

export interface RoleMeta {
  key: string
  defaultTitle: string
  rank: number
}

export const ROLES: RoleMeta[] = [
  { key: 'managing_director', defaultTitle: 'Managing Director', rank: 4 },
  { key: 'operations_director', defaultTitle: 'Operations Director', rank: 3 },
  { key: 'people_manager', defaultTitle: 'People Manager', rank: 2 },
  { key: 'cx_manager', defaultTitle: 'Customer Experience Team Manager', rank: 2 },
  { key: 'product_manager', defaultTitle: 'Product Development Team Manager', rank: 2 },
  { key: 'media_manager', defaultTitle: 'Digital Media Team Manager', rank: 2 },
  { key: 'people_specialist', defaultTitle: 'People Specialist', rank: 1 },
  { key: 'cx_member', defaultTitle: 'Customer Experience Team Member', rank: 1 },
  { key: 'product_developer', defaultTitle: 'Product Developer', rank: 1 },
  { key: 'media_member', defaultTitle: 'Digital Media Team Member', rank: 1 },
  { key: 'customer', defaultTitle: 'Customer', rank: 0 },
]

const DEFAULT_TITLES: Record<string, string> = ROLES.reduce(
  (acc, r) => {
    acc[r.key] = r.defaultTitle
    return acc
  },
  {} as Record<string, string>
)

const RANK: Record<string, number> = ROLES.reduce(
  (acc, r) => {
    acc[r.key] = r.rank
    return acc
  },
  {} as Record<string, number>
)

const titles = reactive<Record<string, string>>({ ...DEFAULT_TITLES })
const titleById = new Map<number, string>()

export async function loadRoleTitles(request: (url: string, init?: RequestInit) => Promise<unknown>) {
  try {
    const list = (await request('/api/staff/role-titles')) as { id?: number; role?: string; title: string }[]
    for (const entry of list) {
      if (entry.id != null) titleById.set(Number(entry.id), entry.title)
      else if (entry.role) titles[entry.role] = entry.title
    }
  } catch {
    // fall back to default titles
  }
}

export function roleTitle(role: number | string | null | undefined): string {
  if (role == null) return ''
  if (typeof role === 'number') return titleById.get(role) || ''
  return titles[role] || DEFAULT_TITLES[role] || role
}

export function roleRank(role: string): number {
  return RANK[role] ?? 0
}

export const ROLE_KEYS = ROLES.map((r) => r.key)
export const STAFF_ROLE_KEYS = ROLES.filter((r) => r.key !== 'customer').map((r) => r.key)