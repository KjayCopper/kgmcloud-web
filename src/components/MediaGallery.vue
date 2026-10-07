<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

interface GalleryItem {
  type: 'image' | 'video'
  src: string
  alt?: string
}

const props = defineProps<{ media: GalleryItem[]; alt?: string }>()

const activeIndex = ref(0)
const lightboxOpen = ref(false)

const active = () => props.media[activeIndex.value]

function select(index: number) {
  activeIndex.value = index
}

function openLightbox() {
  lightboxOpen.value = true
}

function closeLightbox() {
  lightboxOpen.value = false
}

function prev() {
  activeIndex.value = (activeIndex.value - 1 + props.media.length) % props.media.length
}

function next() {
  activeIndex.value = (activeIndex.value + 1) % props.media.length
}

function isImage(item: GalleryItem) {
  return item.type === 'image'
}

function onKeydown(e: KeyboardEvent) {
  if (!lightboxOpen.value) return
  if (e.key === 'Escape') closeLightbox()
  if (e.key === 'ArrowLeft') prev()
  if (e.key === 'ArrowRight') next()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div>
    <div class="relative overflow-hidden rounded-2xl border border-white/10 bg-black/20">
      <button
        v-if="media.length > 1"
        class="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white backdrop-blur transition-colors hover:bg-white/15"
        aria-label="Previous"
        @click.stop="prev"
      >
        <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6" /></svg>
      </button>
      <button
        v-if="media.length > 1"
        class="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white backdrop-blur transition-colors hover:bg-white/15"
        aria-label="Next"
        @click.stop="next"
      >
        <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6" /></svg>
      </button>
      <button
        class="block aspect-video w-full cursor-zoom-in"
        :aria-label="alt || 'Enlarge product media'"
        @click="openLightbox"
      >
        <img
          v-if="active() && isImage(active())"
          :src="active()!.src"
          :alt="active()!.alt || alt || ''"
          class="h-full w-full object-cover"
          style="filter: drop-shadow(0 0 24px rgba(26, 92, 204, 0.5)) drop-shadow(0 0 90px rgba(17, 58, 132, 0.3));"
        />
        <video
          v-else-if="active()"
          :src="active()!.src"
          controls
          playsinline
          class="h-full w-full object-cover"
        ></video>
      </button>
    </div>

    <div v-if="media.length > 1" class="mt-4 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.25)_transparent]">
      <button
        v-for="(item, index) in media"
        :key="`${item.src}-${index}`"
        class="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg border-2 bg-black/30 transition-colors"
        :class="index === activeIndex ? 'border-blue-400' : 'border-white/10 hover:border-white/30'"
        :aria-label="item.alt || `View media ${index + 1}`"
        @click="select(index)"
      >
        <img v-if="isImage(item)" :src="item.src" :alt="item.alt || ''" class="h-full w-full object-cover" />
        <video
          v-else
          :src="item.src"
          muted
          preload="metadata"
          class="h-full w-full object-cover"
        ></video>
        <span
          v-if="!isImage(item)"
          class="absolute inset-0 flex items-center justify-center text-lg font-bold text-white/80"
        >
          ▶
        </span>
      </button>
    </div>

    <div
      v-if="lightboxOpen && active()"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6"
      role="dialog"
      aria-modal="true"
      @click.self="closeLightbox"
    >
      <button
        class="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white transition-colors hover:bg-white/10"
        aria-label="Close"
        @click="closeLightbox"
      >
        ✕
      </button>

      <button
        v-if="media.length > 1"
        class="absolute left-6 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white transition-colors hover:bg-white/10"
        aria-label="Previous"
        @click="prev"
      >
        <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6" /></svg>
      </button>
      <button
        v-if="media.length > 1"
        class="absolute right-6 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white transition-colors hover:bg-white/10"
        aria-label="Next"
        @click="next"
      >
        <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6" /></svg>
      </button>

      <img
        v-if="isImage(active()!)"
        :src="active()!.src"
        :alt="active()!.alt || alt || ''"
        class="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl"
      />
      <video
        v-else
        :src="active()!.src"
        controls
        playsinline
        class="max-h-[85vh] max-w-full rounded-lg shadow-2xl"
      ></video>
    </div>
  </div>
</template>