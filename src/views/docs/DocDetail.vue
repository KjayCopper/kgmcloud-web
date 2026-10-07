<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '../../composables/useAuth'
import { renderMarkdown } from '../../utils/markdown'
import { setPageMeta } from '../../utils/seo'
import DocsSidebar from './DocsSidebar.vue'
import type { DocDetail, DocsResponse } from './types'

const route = useRoute()
const { request } = useAuth()

const index = ref<DocsResponse | null>(null)
const detail = ref<DocDetail | null>(null)
const loading = ref(true)
const err = ref('')
const html = ref('')
const contentEl = ref<HTMLDivElement | null>(null)
const activeSection = ref('')
const sidebarOpen = ref(false)

const slug = computed(() => String(route.params.slug || '').toLowerCase())

async function loadDetail() {
  loading.value = true
  err.value = ''
  try {
    const [idx, doc] = await Promise.all([
      request<DocsResponse>('/api/docs'),
      request<DocDetail>(`/api/docs/${encodeURIComponent(slug.value)}`),
    ])
    index.value = idx
    detail.value = doc
    html.value = renderMarkdown(doc.markdown)
    const meta = docIndex()
    setPageMeta({
      title: meta ? `${meta.title} | KGM Cloud` : 'Documentation | KGM Cloud',
      description: meta ? `Guide: ${meta.title} — KGM Cloud documentation.` : '',
      url: `/docs/${slug.value}`,
    })
  } catch (e) {
    err.value = e instanceof Error ? e.message : 'Failed to load guide'
  } finally {
    loading.value = false
  }
  await nextTick()
  updateActive()
}

function docCategory() {
  return index.value?.categories.find((c) => c.name === detail.value?.category)
}

function docIndex() {
  return docCategory()?.docs.find((d) => d.slug === detail.value?.slug)
}

function updateActive() {
  if (contentEl.value) {
    const ids = Array.from(contentEl.value.querySelectorAll<HTMLElement>('h2[id], h3[id]'))
    let active = ''
    for (const el of ids) {
      if (el.getBoundingClientRect().top - 140 <= 0) active = el.id
      else break
    }
    activeSection.value = active
  }
}

function onScroll() {
  updateActive()
}

watch(slug, () => {
  detail.value = null
  html.value = ''
  activeSection.value = ''
  loadDetail()
})

onMounted(() => {
  loadDetail()
  window.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <div class="mx-auto w-full max-w-7xl px-6 pb-16 pt-10">
    <p v-if="err" class="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
      {{ err }}
      <RouterLink to="/docs" class="ml-2 font-semibold text-blue-300 underline">Back to all docs</RouterLink>
    </p>

    <div class="flex gap-10 lg:items-start">
      <div class="order-2 w-full min-w-0 flex-1 max-w-4xl lg:order-2">
        <template v-if="loading && !detail">
          <div class="space-y-4">
            <div v-for="i in 6" :key="i" class="h-12 animate-pulse rounded-xl border border-white/10 bg-white/5"></div>
          </div>
        </template>

        <template v-else-if="detail">
          <div v-if="docCategory()" class="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-500">
            <RouterLink to="/docs" class="transition-colors hover:text-blue-300">Documentation</RouterLink>
            <span>/</span>
            <span>{{ detail.category }}</span>
          </div>

          <article
            ref="contentEl"
            class="doc-body rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8"
            v-html="html"
          ></article>

          <p v-if="docIndex()" class="mt-4 text-xs text-slate-600">
            Guide: {{ docIndex().title }}
            <template v-if="docIndex().addon"> · Add-on</template>
          </p>
        </template>
      </div>

      <div class="order-1 w-full shrink-0 lg:order-1 lg:w-56 xl:w-64" :class="sidebarOpen ? '' : 'hidden lg:block'">
        <div class="side-nav lg:sticky lg:top-6 lg:flex lg:max-h-[calc(100vh-3rem)] lg:flex-col lg:overflow-y-auto lg:pb-8">
          <button
            type="button"
            class="mb-4 flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white/90 transition-colors hover:border-white/25 hover:bg-white/10 lg:hidden"
            @click="sidebarOpen = !sidebarOpen"
          >
            <i class="fa-solid fa-list-ul text-xs" aria-hidden="true"></i>
            {{ sidebarOpen ? 'Hide sections' : 'Show sections' }}
          </button>

          <DocsSidebar :categories="index?.categories || []" :active-slug="slug" :active-section="activeSection" />
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
.doc-body {
  color: #cbd5e1;
  font-size: 0.95rem;
  line-height: 1.7;
}
.doc-body :deep(h1) {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #fff;
  margin: 0 0 1.25rem;
}
.doc-body :deep(h2) {
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
  margin-top: 2.5rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  scroll-margin-top: 100px;
}
.doc-body :deep(h3) {
  font-size: 1.15rem;
  font-weight: 600;
  color: #e2e8f0;
  margin-top: 1.75rem;
  margin-bottom: 0.5rem;
  scroll-margin-top: 100px;
}
.doc-body :deep(p) {
  margin: 0.75rem 0;
}
.doc-body :deep(ul),
.doc-body :deep(ol) {
  margin: 0.75rem 0;
  padding-left: 1.5rem;
}
.doc-body :deep(ul) {
  list-style: disc;
}
.doc-body :deep(ol) {
  list-style: decimal;
}
.doc-body :deep(li) {
  margin: 0.3rem 0;
}
.doc-body :deep(blockquote) {
  margin: 1rem 0;
  padding: 0.6rem 1rem;
  border-left: 3px solid #60a5fa;
  background: rgba(96, 165, 250, 0.08);
  border-radius: 0 0.5rem 0.5rem 0;
  color: #bfdbfe;
}
.doc-body :deep(blockquote p) {
  margin: 0.25rem 0;
}
.doc-body :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.85em;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 0.3rem;
  padding: 0.1rem 0.35rem;
  color: #93c5fd;
}
.doc-body :deep(pre) {
  margin: 1rem 0;
  padding: 1rem 1.25rem;
  background: #0b1220;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  overflow-x: auto;
}
.doc-body :deep(pre code) {
  background: none;
  padding: 0;
  color: #e2e8f0;
  font-size: 0.85rem;
  line-height: 1.6;
}
.doc-body :deep(a) {
  color: #60a5fa;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.doc-body :deep(a:hover) {
  color: #93c5fd;
}
.doc-body :deep(hr) {
  margin: 2rem 0;
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
.doc-body :deep(table) {
  width: 100%;
  margin: 1rem 0;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.doc-body :deep(th),
.doc-body :deep(td) {
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0.5rem 0.75rem;
  text-align: left;
  vertical-align: top;
}
.doc-body :deep(th) {
  background: rgba(255, 255, 255, 0.05);
  color: #e2e8f0;
  font-weight: 600;
}
.doc-body :deep(img) {
  max-width: 100%;
  border-radius: 0.5rem;
}
.doc-body :deep(strong) {
  color: #f1f5f9;
}
</style>