<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuth } from '../../composables/useAuth'
import DocsSidebar from './DocsSidebar.vue'
import type { DocsResponse } from './types'

const { request } = useAuth()

const data = ref<DocsResponse | null>(null)
const loading = ref(true)
const err = ref('')
const sidebarOpen = ref(false)

onMounted(async () => {
  try {
    data.value = await request<DocsResponse>('/api/docs')
  } catch (e) {
    err.value = e instanceof Error ? e.message : 'Failed to load documentation'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="mx-auto w-full max-w-7xl px-6 pb-16 pt-10">
    <div class="flex items-end justify-between gap-4">
      <div>
        <p class="text-sm font-semibold uppercase tracking-widest text-blue-400">Documentation</p>
        <h2 class="mt-3 text-4xl font-bold tracking-tight text-white lg:text-5xl">
          Guides and product manuals
        </h2>
        <p class="mt-4 max-w-2xl text-lg leading-relaxed text-slate-300">
          Setup guides, configuration references and troubleshooting for every KGM Cloud product.
        </p>
      </div>
    </div>

    <p v-if="err" class="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
      {{ err }}
    </p>

    <div class="mt-8 flex gap-10 lg:gap-14 lg:items-start">
      <div class="order-2 w-full min-w-0 flex-1 lg:order-2 lg:w-auto">
        <div v-if="loading" class="space-y-4">
          <div v-for="i in 3" :key="i" class="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/5"></div>
        </div>

        <div v-else-if="data" class="space-y-12">
          <section v-for="cat in data.categories" :key="cat.name">
            <h3 class="text-xl font-bold tracking-tight text-white">{{ cat.name }}</h3>
            <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <RouterLink
                v-for="doc in cat.docs"
                :key="doc.slug"
                :to="`/docs/${doc.slug}`"
                class="group flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-6 transition-colors hover:border-blue-400/40 hover:bg-white/10"
              >
                <div class="flex items-center gap-2">
                  <span
                    class="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/30 to-cyan-500/30 text-sm text-blue-200"
                  >
                    <i class="fa-solid fa-file-lines" aria-hidden="true"></i>
                  </span>
                  <span v-if="doc.addon" class="text-[10px] font-bold uppercase tracking-widest text-blue-400/80">
                    Add-on guide
                  </span>
                </div>
                <h4 class="font-semibold leading-snug text-white group-hover:text-blue-200">
                  {{ doc.title }}
                </h4>
                <p class="mt-auto text-xs font-semibold text-slate-400 transition-colors group-hover:text-blue-300">
                  Open guide
                  <i class="fa-solid fa-arrow-right ml-1 text-[10px]" aria-hidden="true"></i>
                </p>
              </RouterLink>
            </div>
          </section>

          <p v-if="!data.categories.length" class="rounded-2xl border border-white/10 bg-white/5 px-6 py-10 text-center text-sm text-slate-500">
            No documentation published yet.
          </p>
        </div>
      </div>

      <div class="order-1 w-full shrink-0 lg:order-1 lg:w-56 xl:w-64" :class="sidebarOpen ? '' : 'hidden lg:block'">
        <div class="side-nav lg:sticky lg:top-6">
          <button
            type="button"
            class="mb-4 flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white/90 transition-colors hover:border-white/25 hover:bg-white/10 lg:hidden"
            @click="sidebarOpen = !sidebarOpen"
          >
            <i class="fa-solid fa-list-ul text-xs" aria-hidden="true"></i>
            {{ sidebarOpen ? 'Hide docs' : 'Show docs' }}
          </button>

          <DocsSidebar :categories="data?.categories || []" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.side-nav {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.side-nav::-webkit-scrollbar {
  display: none;
}
</style>