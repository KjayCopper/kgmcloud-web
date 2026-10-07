<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useCart } from '../composables/useCart'
import { useSettings } from '../composables/useSettings'

const router = useRouter()
const route = useRoute()
const { items, count, total, removeItem, formatPrice } = useCart()
const { vatEnabled, load } = useSettings()

const cartOpen = ref(false)

onMounted(() => load())

watch(
  () => route.fullPath,
  () => {
    cartOpen.value = false
  }
)

function goCheckout() {
  cartOpen.value = false
  router.push('/checkout')
}
</script>

<template>
  <div class="relative">
    <button
      class="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white/80 transition-colors hover:border-white/25 hover:bg-white/10 hover:text-white"
      aria-label="Open cart"
      aria-haspopup="true"
      :aria-expanded="cartOpen"
      @click="cartOpen = !cartOpen"
    >
      <svg
        class="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M6 6h15l-1.5 8.5a2 2 0 0 1-2 1.5H8.5a2 2 0 0 1-2-1.5L4.5 3H2" />
        <circle cx="9" cy="21" r="1" />
        <circle cx="18" cy="21" r="1" />
      </svg>
      <span
        v-if="count"
        class="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1 text-[11px] font-bold text-white"
      >
        {{ count }}
      </span>
    </button>

    <div
      v-if="cartOpen"
      class="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-xl border border-white/10 bg-[#0d1629] shadow-2xl shadow-black/50"
    >
      <div v-if="items.length === 0" class="flex flex-col items-center gap-2 px-6 py-10 text-center">
        <p class="text-sm font-semibold text-white">Your cart is empty</p>
        <p class="text-sm text-slate-400">Add a product to get started.</p>
        <RouterLink
          to="/products"
          class="mt-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
          @click="cartOpen = false"
        >
          Browse the store
        </RouterLink>
      </div>

      <template v-else>
        <ul class="max-h-72 overflow-y-auto p-2">
          <li
            v-for="item in items"
            :key="item.id"
            class="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white/5"
          >
            <img
              v-if="item.image_url"
              :src="item.image_url"
              :alt="item.name"
              class="h-12 w-16 shrink-0 rounded-md border border-white/10 object-cover"
            />
            <div class="flex h-12 w-16 shrink-0 items-center justify-center rounded-md border border-white/10 bg-black/30 text-xs font-semibold text-slate-500"
                 v-else
            >
              No preview
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold text-white">{{ item.name }}</p>
              <p class="text-sm text-slate-400">{{ formatPrice(item.price) }}</p>
            </div>
            <button
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
              :aria-label="`Remove ${item.name} from cart`"
              @click="removeItem(item.id)"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </li>
        </ul>

        <div class="border-t border-white/10 p-4">
          <div class="flex items-center justify-between text-sm">
            <span class="font-medium text-slate-300">Total</span>
            <span class="text-lg font-bold text-white">{{ formatPrice(total) }}</span>
          </div>
          <p v-if="vatEnabled" class="mt-0.5 text-right text-xs text-slate-400">incl. VAT</p>
          <button
            class="mt-3 w-full rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500"
            @click="goCheckout"
          >
            Checkout
          </button>
        </div>
      </template>
    </div>
  </div>
</template>