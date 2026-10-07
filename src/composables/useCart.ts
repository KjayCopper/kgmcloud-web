import { reactive, computed, readonly } from 'vue'

export interface CartItem {
  id: number
  slug: string
  name: string
  price: number
  image_url: string | null
}

const CART_KEY = 'kgm_cart'

function load(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY)
    const items = raw ? JSON.parse(raw) : []
    return Array.isArray(items) ? items : []
  } catch {
    return []
  }
}

const state = reactive<{ items: CartItem[] }>({ items: load() })

function persist() {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(state.items))
  } catch {
    /* ignore */
  }
}

export function useCart() {
  const items = computed(() => state.items)
  const count = computed(() => state.items.length)
  const total = computed(() => state.items.reduce((sum, item) => sum + (Number(item.price) || 0), 0))

  function addItem(item: CartItem) {
    if (state.items.some((existing) => existing.id === item.id)) return
    state.items.push({ ...item })
    persist()
  }

  function removeItem(id: number) {
    state.items = state.items.filter((item) => item.id !== id)
    persist()
  }

  function clear() {
    state.items = []
    persist()
  }

  function formatPrice(value: number): string {
    return `£${(Number(value) || 0).toFixed(2)}`
  }

  return {
    state: readonly(state),
    items,
    count,
    total,
    addItem,
    removeItem,
    clear,
    formatPrice,
  }
}