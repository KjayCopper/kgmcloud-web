<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { DocCategory } from './types'

const props = defineProps<{
  categories: DocCategory[]
  activeSlug?: string
  activeSection?: string
}>()

const router = useRouter()

const expanded = ref<Set<string>>(new Set())

function toggle(docSlug: string) {
  const next = new Set(expanded.value)
  if (next.has(docSlug)) next.delete(docSlug)
  else next.add(docSlug)
  expanded.value = next
}

function openDoc(docSlug: string) {
  if (!expanded.value.has(docSlug)) {
    const next = new Set(expanded.value)
    next.add(docSlug)
    expanded.value = next
  }
  router.push(`/docs/${docSlug}`)
}

function sectionTo(docSlug: string, section: string) {
  return { path: `/docs/${docSlug}`, hash: `#${section}` }
}

watch(
  () => props.activeSlug,
  (slug) => {
    if (slug && !expanded.value.has(slug)) {
      const next = new Set(expanded.value)
      next.add(slug)
      expanded.value = next
    }
  }
)
</script>

<template>
  <div class="flex flex-col gap-6">
    <RouterLink
      to="/docs"
      class="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/90 transition-colors hover:border-white/25 hover:bg-white/10"
      :class="{ 'border-blue-400/50 bg-blue-500/10 text-blue-200': !activeSlug }"
    >
      <i class="fa-solid fa-book-open text-xs" aria-hidden="true"></i>
      All documentation
    </RouterLink>

    <template v-for="cat in categories" :key="cat.name">
      <div>
        <p class="mb-2 px-3 text-xs font-bold uppercase tracking-widest text-slate-500">{{ cat.name }}</p>
        <nav class="flex flex-col gap-0.5">
          <div
            v-for="doc in cat.docs"
            :key="doc.slug"
            class="flex flex-col"
            :class="{ 'pl-5': doc.addon }"
          >
            <div class="flex items-center gap-1.5">
              <button
                type="button"
                class="flex h-7 w-6 shrink-0 items-center justify-center rounded text-slate-500 transition-colors hover:bg-white/10 hover:text-white"
                :aria-label="(expanded.has(doc.slug) ? 'Collapse' : 'Expand') + ' ' + doc.title"
                @click="toggle(doc.slug)"
              >
                <i
                  class="fa-solid fa-chevron-right text-[9px] transition-transform"
                  :class="{ 'rotate-90': expanded.has(doc.slug) }"
                  aria-hidden="true"
                ></i>
              </button>
              <button
                type="button"
                class="flex min-w-0 flex-1 items-center overflow-hidden rounded-lg px-2 py-1.5 text-left text-sm font-medium transition-colors"
                :class="
                  doc.addon
                    ? 'text-slate-400 hover:text-white'
                    : expanded.has(doc.slug)
                      ? 'bg-white/5 text-white'
                      : 'text-white/90 hover:bg-white/5 hover:text-white'
                "
                @click="openDoc(doc.slug)"
              >
                <span class="min-w-0 flex-1 truncate">{{ doc.title }}</span>
                <span v-if="doc.addon" class="ml-1.5 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-blue-400/80">add-on</span>
              </button>
            </div>

            <div v-if="expanded.has(doc.slug) && doc.sections.length" class="mb-1 mt-0.5 flex flex-col gap-0.5 border-l border-white/10 pl-5">
              <RouterLink
                v-for="sec in doc.sections"
                :key="sec.slug"
                :to="sectionTo(doc.slug, sec.slug)"
                class="flex rounded-md px-2 py-1 leading-snug transition-colors"
                :class="[
                  sec.level === 3 && 'pl-3 text-xs',
                  sec.slug === activeSection
                    ? 'bg-blue-500/10 font-semibold text-blue-300'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
                ]"
              >
                <span class="min-w-0 flex-1 truncate">{{ sec.title }}</span>
              </RouterLink>
            </div>
          </div>
        </nav>
      </div>
    </template>
  </div>
</template>