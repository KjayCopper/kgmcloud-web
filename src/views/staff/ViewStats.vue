<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuth } from '../../composables/useAuth'

interface ViewRow {
  ref: string
  views: number
  product_name: string | null
}

const { request } = useAuth()

const rows = ref<ViewRow[]>([])
const error = ref('')
const loading = ref(true)

const pages = computed(() => rows.value.filter((r) => !r.ref.startsWith('product:')))
const products = computed(() => rows.value.filter((r) => r.ref.startsWith('product:')))
const totalViews = computed(() => rows.value.reduce((s, r) => s + r.views, 0))
const totalProductViews = computed(() => products.value.reduce((s, r) => s + r.views, 0))

function fmt(n: number): string {
  return Number(n || 0).toLocaleString()
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await request<ViewRow[]>('/api/staff/views')
    rows.value = Array.isArray(data) ? data : []
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load view stats'
    rows.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <section>
    <div class="mb-8">
      <p class="text-sm font-semibold uppercase tracking-widest text-blue-400">Administration</p>
      <h2 class="mt-2 text-3xl font-bold tracking-tight text-white lg:text-4xl">Site View Stats</h2>
      <p class="mt-4 text-sm text-slate-400">
        Cumulative page and product views recorded since tracking was enabled.
      </p>
    </div>

    <p v-if="error" class="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
      {{ error }}
    </p>

    <div v-if="loading" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div v-for="i in 4" :key="i" class="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/5"></div>
    </div>

    <template v-else>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p class="text-sm font-semibold text-slate-400">Total page views</p>
          <p class="mt-2 text-4xl font-bold text-white">{{ fmt(totalViews) }}</p>
        </div>
        <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p class="text-sm font-semibold text-slate-400">Total product views</p>
          <p class="mt-2 text-4xl font-bold text-white">{{ fmt(totalProductViews) }}</p>
        </div>
        <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p class="text-sm font-semibold text-slate-400">Pages tracked</p>
          <p class="mt-2 text-4xl font-bold text-white">{{ fmt(pages.length) }}</p>
        </div>
      </div>

      <div class="mt-8 grid gap-6 lg:grid-cols-2">
        <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 class="text-lg font-semibold tracking-tight text-white">Top pages</h3>
          <div v-if="pages.length" class="mt-4 flex flex-col gap-1.5">
            <div
              v-for="p in pages.slice(0, 25)"
              :key="p.ref"
              class="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-white/[0.06]"
            >
              <span class="truncate font-mono text-xs text-slate-300">{{ p.ref }}</span>
              <span class="shrink-0 font-semibold text-white">{{ fmt(p.views) }}</span>
            </div>
          </div>
          <p v-else class="mt-4 rounded-xl border border-dashed border-white/15 px-5 py-6 text-center text-sm text-slate-500">
            No page views recorded yet.
          </p>
        </div>

        <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 class="text-lg font-semibold tracking-tight text-white">Top products</h3>
          <div v-if="products.length" class="mt-4 flex flex-col gap-1.5">
            <div
              v-for="p in products.slice(0, 25)"
              :key="p.ref"
              class="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-white/[0.06]"
            >
              <span class="truncate text-slate-200">{{ p.product_name || p.ref }}</span>
              <span class="shrink-0 font-semibold text-white">{{ fmt(p.views) }}</span>
            </div>
          </div>
          <p v-else class="mt-4 rounded-xl border border-dashed border-white/15 px-5 py-6 text-center text-sm text-slate-500">
            No product views recorded yet.
          </p>
        </div>
      </div>
    </template>
  </section>
</template>