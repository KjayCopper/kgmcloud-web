<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { shortDescriptionHtml } from '../utils/descriptionHtml'

interface Category {
  id: number
  name: string
  slug: string
}

interface ProductCard {
  id: number
  name: string
  slug: string
  category_id: number | null
  category_name?: string | null
  short_description: string | null
  price: string
  compare_at: string | null
  disclaimer: boolean
  requires_license: boolean
  pinned: boolean
  image_url: string | null
}

const products = ref<ProductCard[]>([])
const categories = ref<Category[]>([])
const loading = ref(true)
const error = ref('')

const search = ref('')
const activeCategory = ref<string>('all')
const filtersOpen = ref(false)

const categoryCounts = computed(() => {
  const counts: Record<number, number> = {}
  let uncounted = 0
  for (const p of products.value) {
    if (p.category_id === null) uncounted++
    else counts[p.category_id] = (counts[p.category_id] ?? 0) + 1
  }
  return { counts, uncounted }
})

const filteredProducts = computed(() => {
  const term = search.value.trim().toLowerCase()
  return products.value.filter((p) => {
    const matchesCategory =
      activeCategory.value === 'all' ||
      (activeCategory.value === 'none' && p.category_id === null) ||
      String(p.category_id) === activeCategory.value
    const matchesSearch = !term || p.name.toLowerCase().includes(term)
    return matchesCategory && matchesSearch
  })
})

function shortDescHtml(p: ProductCard): string {
  return shortDescriptionHtml(p.short_description)
}

function categoryName(catId: number | null): string | null {
  if (catId === null) return null
  return categories.value.find((c) => c.id === catId)?.name ?? null
}

function setCategory(value: string) {
  activeCategory.value = value
  filtersOpen.value = false
}

function clearFilters() {
  activeCategory.value = 'all'
  search.value = ''
}

onMounted(async () => {
  try {
    const [productsRes, categoriesRes] = await Promise.all([
      fetch('/api/products'),
      fetch('/api/categories'),
    ])
    if (!productsRes.ok) throw new Error(`Request failed (${productsRes.status})`)
    products.value = (await productsRes.json()) as ProductCard[]
    if (categoriesRes.ok) categories.value = (await categoriesRes.json()) as Category[]
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load products'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section class="mx-auto w-full max-w-7xl px-6 pb-16 pt-10 lg:pb-20 lg:pt-16">
    <div class="text-center">
      <p class="text-sm font-semibold uppercase tracking-widest text-blue-400">The store</p>
      <h2 class="mt-3 text-4xl font-bold tracking-tight text-white lg:text-5xl">
        Digital products for your server
      </h2>
      <p class="mx-auto mt-4 max-w-2xl text-lg text-slate-300">
        Pick a product, get instant access, and start building your roleplay experience.
      </p>
    </div>

    <p v-if="error" class="mt-10 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
      {{ error }}
    </p>

    <template v-else>
      <div
        v-if="!loading && products.length === 0"
        class="mt-14 flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-6 py-16 text-center"
      >
        <h3 class="text-2xl font-semibold tracking-tight text-white">No products to display</h3>
        <p class="max-w-md text-slate-300">
          We’re working on it — new products will appear here as soon as they’re live.
        </p>
      </div>

      <div v-else-if="!loading" class="mt-10 flex flex-col gap-6 lg:flex-row lg:items-start">
        <div class="lg:hidden">
          <button
            type="button"
            class="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            @click="filtersOpen = !filtersOpen"
          >
            {{ filtersOpen ? 'Hide filters' : 'Filters' }}
            <span class="text-xs font-bold text-slate-400">
              {{ activeCategory !== 'all' || search ? '·' : '' }}
            </span>
          </button>
        </div>

        <aside
          class="w-full shrink-0 lg:w-64"
          :class="filtersOpen ? 'block' : 'hidden lg:block'"
        >
          <div class="flex flex-col gap-6 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div class="flex flex-col gap-2">
              <label for="store-search" class="text-sm font-semibold uppercase tracking-wider text-slate-400">
                Search
              </label>
              <input
                id="store-search"
                v-model="search"
                type="search"
                placeholder="Search products…"
                class="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/60"
              />
            </div>

            <div class="flex flex-col gap-2">
              <h3 class="text-sm font-semibold uppercase tracking-wider text-slate-400">Categories</h3>
              <nav class="flex flex-col gap-1">
                <button
                  v-if="activeCategory !== 'all' || search"
                  type="button"
                  class="rounded-lg border border-white/10 px-3 py-1.5 text-left text-xs font-semibold text-slate-400 transition-colors hover:text-white"
                  @click="clearFilters"
                >
                  Clear filters
                </button>

                <button
                  type="button"
                  class="flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors"
                  :class="activeCategory === 'all'
                    ? 'bg-blue-500/20 text-blue-300'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'"
                  @click="setCategory('all')"
                >
                  All products
                  <span class="text-xs font-bold text-slate-500">{{ products.length }}</span>
                </button>

                <button
                  v-for="cat in categories"
                  :key="cat.id"
                  type="button"
                  class="flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors"
                  :class="String(cat.id) === activeCategory
                    ? 'bg-blue-500/20 text-blue-300'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'"
                  @click="setCategory(String(cat.id))"
                >
                  {{ cat.name }}
                  <span class="text-xs font-bold text-slate-500">
                    {{ categoryCounts.counts[cat.id] ?? 0 }}
                  </span>
                </button>

                <button
                  v-if="categoryCounts.uncounted > 0"
                  type="button"
                  class="flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors"
                  :class="activeCategory === 'none'
                    ? 'bg-blue-500/20 text-blue-300'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'"
                  @click="setCategory('none')"
                >
                  Uncategorised
                  <span class="text-xs font-bold text-slate-500">{{ categoryCounts.uncounted }}</span>
                </button>
              </nav>
            </div>
          </div>
        </aside>

        <div class="min-w-0 flex-1">
          <div v-if="loading" class="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            <div
              v-for="i in 3"
              :key="i"
              class="h-72 animate-pulse rounded-2xl border border-white/10 bg-white/5"
            ></div>
          </div>

          <div
            v-else-if="filteredProducts.length === 0 && products.length"
            class="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-6 py-16 text-center"
          >
            <h3 class="text-2xl font-semibold tracking-tight text-white">Nothing matches</h3>
            <p class="max-w-md text-slate-300">
              No products match that category or search. Try clearing the filters.
            </p>
            <button
              type="button"
              class="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
              @click="clearFilters"
            >
              Clear filters
            </button>
          </div>

          <div v-else class="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            <RouterLink
              v-for="product in filteredProducts"
              :key="product.slug"
              :to="`/products/${product.slug}`"
              class="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition-colors hover:border-white/20 hover:bg-white/10"
            >
              <div class="relative aspect-video overflow-hidden bg-black/20">
                <img
                  v-if="product.image_url"
                  :src="product.image_url"
                  :alt="`${product.name} preview`"
                  class="h-full w-full object-cover"
                  style="filter: drop-shadow(0 0 18px rgba(26, 92, 204, 0.4)) drop-shadow(0 0 60px rgba(17, 58, 132, 0.25));"
                />
                <div
                  v-else
                  class="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-500"
                >
                  No preview
                </div>
              </div>

              <div class="flex flex-1 flex-col gap-3 p-6">
                <div class="flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <span
                    v-if="product.category_id"
                    class="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-400"
                  >
                    {{ categoryName(product.category_id) ?? (product.category_name ?? 'Category') }}
                  </span>
                  <span
                    v-if="product.requires_license"
                    class="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-400"
                  >
                    License
                  </span>
                </div>

                <h3 class="text-xl font-semibold text-white">{{ product.name }}</h3>
                <p v-if="product.short_description" class="text-sm text-slate-400" v-html="shortDescHtml(product)"></p>

                <div class="mt-auto flex items-center justify-between pt-2">
                  <span class="flex items-baseline gap-2">
                    <span class="text-lg font-bold text-white">{{ product.price }}</span>
                    <span v-if="product.compare_at" class="text-sm font-medium text-slate-500 line-through">
                      {{ product.compare_at }}
                    </span>
                  </span>
                  <span class="text-sm font-semibold text-blue-400 transition-colors group-hover:text-blue-300">
                    View product →
                  </span>
                </div>
              </div>
            </RouterLink>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>