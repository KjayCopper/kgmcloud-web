<script setup lang="ts">
import { ref } from 'vue'

const CONSENT_COOKIE = 'kgm_consent'

function hasConsent(): boolean {
  return document.cookie
    .split('; ')
    .some((c) => c.split('=')[0] === CONSENT_COOKIE && c.split('=')[1] === '1')
}

const accepted = ref(hasConsent())

function accept() {
  document.cookie = `${CONSENT_COOKIE}=1; path=/; max-age=31536000; samesite=lax`
  accepted.value = true
}
</script>

<template>
  <div
    v-if="!accepted"
    class="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0d1629]/95 px-6 py-4 shadow-2xl shadow-black/60 backdrop-blur"
    role="region"
    aria-label="Cookie consent"
  >
    <div class="mx-auto flex w-full max-w-7xl flex-col gap-4 sm:flex-row sm:items-center">
      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold text-white">
          <i class="fa-solid fa-cookie-bite mr-2 text-amber-300" aria-hidden="true"></i>We use cookies to make this store work
        </p>
        <p class="mt-0.5 text-sm text-slate-400">
          Our cookies are strictly necessary (checkout and your preferences) — no advertising or tracking. If you do not
          accept cookies, please do not use the site.
        </p>
      </div>
      <div class="flex shrink-0 items-center gap-3">
        <RouterLink to="/cookies" class="text-sm font-semibold text-blue-300 transition-colors hover:text-blue-200">
          Cookie policy
        </RouterLink>
        <button
          type="button"
          class="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500"
          @click="accept"
        >
          Accept
        </button>
      </div>
    </div>
  </div>
</template>