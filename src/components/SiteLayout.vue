<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useCart } from '../composables/useCart'
import logoImg from '../assets/images/KGM Cloud.png'
import pkg from '../../package.json'
import CartButton from './CartButton.vue'
import CookieConsent from './CookieConsent.vue'

const { isLoggedIn, isStaff, user, logout } = useAuth()
const { clear, count } = useCart()
const router = useRouter()
const route = useRoute()

const mobileMenuOpen = ref(false)
const accountMenuOpen = ref(false)

const navLinks = [
  { label: 'About', to: '/about' },
  { label: 'Store', to: '/products' },
  { label: 'Documentation', to: '/docs' },
]

watch(
  () => route.fullPath,
  () => {
    mobileMenuOpen.value = false
    accountMenuOpen.value = false
  }
)

function signOut() {
  logout()
  clear()
  accountMenuOpen.value = false
  router.push('/')
}
</script>

<template>
  <div class="home-page">
    <div class="hero-background" aria-hidden="true"></div>

    <header class="relative z-20">
      <nav class="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <RouterLink to="/" class="flex items-center">
          <img :src="logoImg" alt="KGMcloud" class="h-9 w-auto" />
        </RouterLink>

        <div class="hidden items-center gap-6 sm:flex">
          <nav class="flex items-center gap-8 text-sm font-medium text-white/80">
            <RouterLink
              v-for="link in navLinks"
              :key="link.to"
              :to="link.to"
              class="transition-colors hover:text-white"
            >
              {{ link.label }}
            </RouterLink>
          </nav>

          <span class="h-6 w-px bg-white/15" aria-hidden="true"></span>

          <CartButton v-if="isLoggedIn" />

          <template v-if="isLoggedIn">
            <div class="relative">
              <button
                class="flex h-10 shrink-0 items-center gap-2.5 rounded-lg border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white transition-colors hover:border-white/25 hover:bg-white/10"
                aria-label="Account menu"
                aria-haspopup="true"
                aria-expanded="accountMenuOpen"
                @click="accountMenuOpen = !accountMenuOpen"
              >
                <span
                  class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/30 text-xs font-bold text-blue-200"
                >
                  {{ user?.firstname?.[0] ?? '?' }}
                </span>
                {{ user?.firstname }}
                <svg
                  class="h-3.5 w-3.5 text-white/50 transition-transform"
                  :class="{ 'rotate-180': accountMenuOpen }"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fill-rule="evenodd"
                    d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.25 4.39a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>

              <div
                v-if="accountMenuOpen"
                class="absolute right-0 z-30 mt-2 w-52 overflow-hidden rounded-xl border border-white/10 bg-[#0d1629] p-1.5 shadow-2xl shadow-black/50"
              >
                <RouterLink
                  to="/account"
                  class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                >
                  My account
                </RouterLink>
                <RouterLink
                  v-if="isStaff"
                  to="/staff"
                  class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Staff panel
                </RouterLink>
                <button
                  class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200"
                  @click="signOut"
                >
                  Sign out
                </button>
              </div>
            </div>
          </template>

          <template v-else>
            <RouterLink
              to="/login"
              class="shrink-0 rounded-lg border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-white/25 hover:bg-white/10"
            >
              Sign in
            </RouterLink>
          </template>
        </div>

        <div class="flex items-center gap-2 sm:hidden">
          <div class="relative">
            <CartButton v-if="isLoggedIn" />
          </div>

          <button
            class="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5"
            aria-label="Toggle menu"
            aria-expanded="mobileMenuOpen"
            @click="mobileMenuOpen = !mobileMenuOpen"
          >
            <span
              class="block h-0.5 w-5 rounded-full bg-white transition-transform"
              :class="{ 'translate-y-2 rotate-45': mobileMenuOpen }"
            ></span>
            <span
              class="block h-0.5 w-5 rounded-full bg-white transition-opacity"
              :class="{ 'opacity-0': mobileMenuOpen }"
            ></span>
            <span
              class="block h-0.5 w-5 rounded-full bg-white transition-transform"
              :class="{ '-translate-y-2 -rotate-45': mobileMenuOpen }"
            ></span>
          </button>
        </div>
      </nav>

      <div
        v-if="mobileMenuOpen"
        class="border-t border-white/10 bg-black/50 px-6 py-4 backdrop-blur-sm sm:hidden"
      >
        <div class="flex flex-col gap-4 text-sm font-medium text-white/80">
          <RouterLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="transition-colors hover:text-white"
            @click="mobileMenuOpen = false"
          >
            {{ link.label }}
          </RouterLink>

          <div class="my-1 h-px bg-white/10"></div>

          <template v-if="isLoggedIn">
            <RouterLink
              to="/account"
              class="transition-colors hover:text-white"
              @click="mobileMenuOpen = false"
            >
              My account
            </RouterLink>
            <RouterLink
              to="/checkout"
              class="flex items-center justify-between transition-colors hover:text-white"
              @click="mobileMenuOpen = false"
            >
              <span>Cart</span>
              <span
                v-if="count"
                class="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-bold text-blue-300"
              >
                {{ count }} item{{ count === 1 ? '' : 's' }}
              </span>
            </RouterLink>
            <RouterLink
              v-if="isStaff"
              to="/staff"
              class="transition-colors hover:text-white"
              @click="mobileMenuOpen = false"
            >
              Staff panel
            </RouterLink>
            <button
              class="text-left transition-colors hover:text-white"
              @click="signOut"
            >
              Sign out
            </button>
          </template>
          <RouterLink
            v-else
            to="/login"
            class="transition-colors hover:text-white"
            @click="mobileMenuOpen = false"
          >
            Sign in
          </RouterLink>
        </div>
      </div>
    </header>

    <main class="relative">
      <RouterView />
    </main>

    <footer class="relative z-10 mt-12 border-t border-white/10">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-8">
        <div class="flex flex-col items-start gap-1.5">
          <p class="text-sm text-white/40">©2026 KGM Cloud · Dev Test V{{ pkg.version }}</p>
          <div class="flex items-center gap-2.5">
            <RouterLink to="/terms" class="text-xs text-white/40 transition-colors hover:text-white">
              Terms of Service
            </RouterLink>
            <span class="text-white/20">·</span>
            <RouterLink to="/privacy" class="text-xs text-white/40 transition-colors hover:text-white">
              Privacy Policy
            </RouterLink>
            <span class="text-white/20">·</span>
            <RouterLink to="/cookies" class="text-xs text-white/40 transition-colors hover:text-white">
              Cookie Policy
            </RouterLink>
            <span class="text-white/20">·</span>
            <RouterLink to="/digital-products" class="text-xs text-white/40 transition-colors hover:text-white">
              Digital Products &amp; Refunds
            </RouterLink>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <a
            href="#"
            class="hidden h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition-colors hover:border-white/25 hover:text-white"
            aria-label="X (Twitter)"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path
                d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
              />
            </svg>
          </a>

          <a
            href="https://discord.gg/bGpyDNsfxn"
            target="_blank"
            rel="noopener noreferrer"
            class="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition-colors hover:border-white/25 hover:text-white"
            aria-label="Discord"
          >
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path
                d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
              />
            </svg>
          </a>

          <a
            href="#"
            class="hidden h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition-colors hover:border-white/25 hover:text-white"
            aria-label="YouTube"
          >
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path
                d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
              />
            </svg>
          </a>
        </div>
      </div>
    </footer>

    <CookieConsent />
  </div>
</template>
