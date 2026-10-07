<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useCart } from '../composables/useCart'
import { useSettings } from '../composables/useSettings'
import { useAuth } from '../composables/useAuth'

const { items, total, removeItem, clear, formatPrice } = useCart()
const { vatRate, vatEnabled, rateFor, load, staffDiscountPercent } = useSettings()
const { request, isStaff } = useAuth()
const route = useRoute()

const staffDiscountApplied = ref(true)

onMounted(async () => {
  load()
  detectCountry()
})

async function detectCountry() {
  if (country.value !== 'GB') return
  try {
    const res = await fetch('/api/geo/country')
    const data = res.ok ? await res.json() : {}
    const code = String(data.country || '').toUpperCase()
    if (code !== 'GB' && COUNTRIES.some((c) => c.code === code)) country.value = code
  } catch {
    /* keep default */
  }
}

const COUNTRIES = [
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'AU', name: 'Australia' },
  { code: 'CA', name: 'Canada' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'IE', name: 'Ireland' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'PL', name: 'Poland' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'IT', name: 'Italy' },
  { code: 'PT', name: 'Portugal' },
  { code: 'IN', name: 'India' },
  { code: 'SG', name: 'Singapore' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'XX', name: 'Other' },
]

const country = ref('GB')

const breakdown = computed(() => {
  const listed = Math.round(items.value.reduce((s, i) => s + (Number(i.price) || 0), 0) * 100) / 100
  if (!vatEnabled.value) return { rate: 0, net: listed, vat: 0, gross: listed }
  const homeRate = vatRate.value ?? 20
  const rate = rateFor(country.value)
  const ratio = (1 + rate / 100) / (1 + homeRate / 100)
  const gross = Math.round(listed * ratio * 100) / 100
  const net = rate > 0 ? Math.round((gross / (1 + rate / 100)) * 100) / 100 : gross
  const vat = Math.round((gross - net) * 100) / 100
  return { rate, net, vat, gross }
})

type PaymentState = 'idle' | 'creating' | 'checking' | 'paid' | 'failed'

const paymentState = ref<PaymentState>('idle')
const licenseKeys = ref<{ product_id: number; license_key: string }[]>([])
const orderRef = ref('')
const checkoutError = ref('')
let checkTimer: number | null = null

interface AppliedDiscount {
  code: string
  type: 'percent' | 'fixed'
  value: number
  amount_off: number
}

const discountInput = ref('')
const discount = ref<AppliedDiscount | null>(null)
const discountError = ref('')
const applyingDiscount = ref(false)
const digitalConsent = ref(false)

const staffPct = computed(() => (isStaff.value ? Math.max(0, Number(staffDiscountPercent.value) || 0) : 0))

const staffOff = computed(() => {
  if (!staffDiscountApplied.value || staffPct.value <= 0) return 0
  const g = Number(breakdown.value.gross) || 0
  return Math.max(0, Math.min(Math.round((g * staffPct.value) / 100 * 100) / 100, g))
})

const codeOff = computed(() => discount.value?.amount_off || 0)

const staffActive = computed(() => staffOff.value > 0 && staffOff.value >= codeOff.value)

const appliedOff = computed(() => Math.max(staffOff.value, codeOff.value))

const discountedTotal = computed(() => {
  const g = Number(breakdown.value.gross) || 0
  const off = Number(appliedOff.value) || 0
  return Math.max(0, Math.round((g - off) * 100) / 100)
})

async function applyDiscount() {
  if (applyingDiscount.value) return
  const code = discountInput.value.trim()
  if (!code) {
    discountError.value = 'Enter a discount code'
    return
  }
  discountError.value = ''
  applyingDiscount.value = true
  try {
    const data = await request<{ code: string; type: 'percent' | 'fixed'; value: number; amount_off: number }>(
      '/api/checkout/validate-code',
      { method: 'POST', body: JSON.stringify({ code, subtotal: breakdown.value.gross }) }
    )
    discount.value = { code: data.code, type: data.type, value: data.value, amount_off: data.amount_off }
    discountInput.value = ''
  } catch (e) {
    discountError.value = e instanceof Error ? e.message : 'This code could not be applied'
  } finally {
    applyingDiscount.value = false
  }
}

function removeDiscount() {
  discount.value = null
  discountError.value = ''
}

const refParam = computed(() => String(route.query.ref || '').trim())

const BASKET_COOKIE = 'kgm_basket'

function readBasketCookie(): { ref: string; checkout_id?: string; items?: number[]; country?: string; discount_code?: string | null } | null {
  const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + BASKET_COOKIE + '=([^;]*)'))
  if (!m) return null
  try { return JSON.parse(decodeURIComponent(m[1])) } catch { return null }
}

function setBasketCookie(ref: string, checkoutId: string, items: number[], country: string, discountCode?: string) {
  document.cookie = `${BASKET_COOKIE}=${encodeURIComponent(JSON.stringify({ ref, checkout_id: checkoutId, items, country, discount_code: discountCode || null }))}; path=/; max-age=21600; samesite=lax`
}

function clearBasketCookie() {
  document.cookie = `${BASKET_COOKIE}=; path=/; max-age=0`
}

function stopPolling() {
  if (checkTimer != null) {
    window.clearInterval(checkTimer)
    checkTimer = null
  }
}

async function createCheckout() {
  if (paymentState.value !== 'idle') return
  const ids = items.value.map((i) => i.id)
  if (!ids.length) return
  if (!digitalConsent.value) {
    checkoutError.value = 'You need to accept the digital delivery terms before you can pay'
    return
  }
  checkoutError.value = ''
  paymentState.value = 'creating'
  try {
    const data = await request<{ hosted_checkout_url: string; checkout_reference: string; checkout_id: string }>('/api/checkout', {
      method: 'POST',
      body: JSON.stringify({ items: ids.map((id) => ({ id })), country: country.value, discount_code: discount.value?.code, staff_discount: staffDiscountApplied.value, digital_consent: digitalConsent.value }),
    })
    setBasketCookie(data.checkout_reference, data.checkout_id, ids, country.value, discount.value?.code)
    window.location.href = data.hosted_checkout_url
  } catch (e) {
    checkoutError.value = e instanceof Error ? e.message : 'Failed to start checkout'
    paymentState.value = 'idle'
  }
}

async function checkStatus() {
  if (!orderRef.value) return
  try {
    const params = new URLSearchParams({ ref: orderRef.value })
    const basket = readBasketCookie()
    if (basket && basket.ref === orderRef.value) {
      if (basket.checkout_id) params.set('sumup_checkout_id', basket.checkout_id)
      if (basket.items?.length) params.set('items', basket.items.join(','))
      if (basket.country) params.set('country', basket.country)
      if (basket.discount_code) params.set('discount_code', basket.discount_code)
    }
    const data = await request<{
      status: string
      license_keys?: { product_id: number; product_name?: string; license_key: string }[]
    }>(`/api/checkout/status?${params.toString()}`)
    if (data.status === 'PAID') {
      paymentState.value = 'paid'
      licenseKeys.value = data.license_keys || []
      clear()
      clearBasketCookie()
      stopPolling()
      return
    }
    if (data.status === 'FAILED') {
      paymentState.value = 'failed'
      stopPolling()
    }
  } catch {
    // keep polling — the server may not have finalized the payment yet
  }
}

function startPolling() {
  paymentState.value = 'checking'
  checkStatus()
  checkTimer = window.setInterval(checkStatus, 2500)
}

onMounted(() => {
  if (refParam.value) {
    orderRef.value = refParam.value
    startPolling()
  }
})

onUnmounted(stopPolling)
</script>

<template>
  <section class="mx-auto w-full max-w-6xl px-6 pb-16 pt-10 lg:pb-20 lg:pt-16">
    <div class="text-center">
      <p class="text-sm font-semibold uppercase tracking-widest text-blue-400">Checkout</p>
      <h2 class="mt-3 text-4xl font-bold tracking-tight text-white lg:text-5xl">Review your order</h2>
    </div>

    <div v-if="paymentState === 'checking'" class="mt-10 flex flex-col items-center gap-6 rounded-2xl border border-white/10 bg-white/5 px-6 py-16 text-center">
      <div class="h-10 w-10 animate-spin rounded-full border-2 border-blue-400 border-t-transparent"></div>
      <div>
        <h3 class="text-xl font-semibold text-white">Verifying your payment…</h3>
        <p class="mt-2 text-sm text-slate-400">Just a moment while we confirm the payment with SumUp.</p>
      </div>
    </div>

    <div v-else-if="paymentState === 'paid'" class="mt-10 rounded-2xl border border-green-500/30 bg-green-500/10 px-6 py-12 text-center">
      <h3 class="text-3xl font-bold tracking-tight text-white">Payment successful</h3>
      <p class="mt-3 text-slate-300">Thanks! Your order is confirmed. Your purchases and downloads are now in your dashboard.</p>
      <div
        v-if="licenseKeys.length"
        class="mx-auto mt-6 flex max-w-md flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-6 text-left"
      >
        <h4 class="text-sm font-semibold uppercase tracking-wider text-slate-400">Your license keys</h4>
        <div v-for="lk in licenseKeys" :key="lk.license_key">
          <p class="text-xs text-slate-500">{{ lk.product_name || 'Product #' + lk.product_id }}</p>
          <code class="break-all text-sm font-semibold text-white select-all">{{ lk.license_key }}</code>
        </div>
        <p class="mt-1 text-xs text-slate-500">Keys are also stored in your account — My account → Your licenses.</p>
      </div>
      <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
        <RouterLink to="/account" class="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500">
          Go to my downloads
        </RouterLink>
        <RouterLink to="/products" class="rounded-lg border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10">
          Continue shopping
        </RouterLink>
      </div>
    </div>

    <div v-else-if="paymentState === 'failed'" class="mt-10 rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-12 text-center">
      <h3 class="text-3xl font-bold tracking-tight text-white">Payment failed</h3>
      <p class="mt-3 text-slate-300">Your order was not completed and you have not been charged.</p>
      <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button class="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500" @click="startPolling">
          Try checking again
        </button>
        <RouterLink to="/checkout" class="rounded-lg border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10">
          Back to cart
        </RouterLink>
      </div>
    </div>

    <template v-else>
      <div v-if="items.length === 0" class="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-6 py-16 text-center">
        <h3 class="text-xl font-semibold text-white">Your cart is empty</h3>
        <RouterLink
          to="/products"
          class="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500"
        >
          Browse the store
        </RouterLink>
      </div>

      <div v-else class="mt-10 grid min-w-0 grid-cols-1 items-start gap-8 lg:grid-cols-3">
        <div class="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <h3 class="text-lg font-semibold text-white">Items</h3>

          <div class="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            <div class="hidden grid-cols-[1fr_auto] gap-4 border-b border-white/10 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 sm:grid">
              <span>Product</span>
              <span>Price</span>
            </div>
            <ul class="divide-y divide-white/10">
              <li
                v-for="item in items"
                :key="item.id"
                class="flex items-center gap-4 px-6 py-4"
              >
                <img
                  v-if="item.image_url"
                  :src="item.image_url"
                  :alt="item.name"
                  class="h-14 w-20 shrink-0 rounded-lg border border-white/10 object-cover"
                />
                <div
                  v-else
                  class="flex h-14 w-20 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/30 text-xs font-semibold text-slate-500"
                >
                  No preview
                </div>

                <div class="min-w-0 flex-1">
                  <p class="truncate font-semibold text-white">{{ item.name }}</p>
                  <p class="text-sm text-slate-400">{{ formatPrice(item.price) }}</p>
                </div>

                <span class="hidden font-semibold text-white sm:block">{{ formatPrice(item.price) }}</span>

                <button
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                  :aria-label="`Remove ${item.name} from cart`"
                  @click="removeItem(item.id)"
                >
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </li>

              <li v-if="staffPct > 0 && staffDiscountApplied && staffActive" class="flex items-center gap-4 px-6 py-4">
                <div class="flex h-14 w-20 shrink-0 flex-col items-center justify-center rounded-lg border border-green-500/30 bg-green-500/10 text-center">
                  <span class="text-[0.6rem] font-bold uppercase tracking-wider text-green-400">Staff</span>
                  <span class="text-xs font-bold text-green-300">−{{ staffPct }}%</span>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate font-semibold text-white">Staff discount ({{ staffPct }}%)</p>
                  <p class="text-sm text-green-400">Applied automatically — your staff benefit</p>
                </div>
                <span class="hidden font-semibold text-green-300 sm:block">−{{ formatPrice(staffOff) }}</span>
                <button
                  type="button"
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                  :aria-label="'Remove staff discount'"
                  @click="staffDiscountApplied = false"
                >
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </li>
              <li v-else-if="staffPct > 0 && staffDiscountApplied" class="flex items-center gap-4 px-6 py-4">
                <div class="flex h-14 w-20 shrink-0 flex-col items-center justify-center rounded-lg border border-white/10 bg-black/30 text-center">
                  <span class="text-[0.6rem] font-bold uppercase tracking-wider text-slate-500">Staff</span>
                  <span class="text-xs font-bold text-slate-400">−{{ staffPct }}%</span>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate font-semibold text-slate-300">Staff discount ({{ staffPct }}%)</p>
                  <p class="text-sm text-slate-500">Replaced by your discount code — it saves you more.</p>
                </div>
                <button
                  type="button"
                  class="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-slate-400 transition-colors hover:text-red-300"
                  @click="staffDiscountApplied = false"
                >
                  Remove
                </button>
              </li>
              <li v-else-if="staffPct > 0" class="flex items-center gap-4 px-6 py-4">
                <div class="flex h-14 w-20 shrink-0 flex-col items-center justify-center rounded-lg border border-white/10 bg-black/30 text-center">
                  <span class="text-[0.6rem] font-bold uppercase tracking-wider text-slate-500">Staff</span>
                  <span class="text-xs font-bold text-slate-400">−{{ staffPct }}%</span>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate font-semibold text-slate-300">Staff discount ({{ staffPct }}%)</p>
                  <p class="text-sm text-slate-500">You've chosen not to use your staff benefit on this order.</p>
                </div>
                <button
                  type="button"
                  class="shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold text-green-300 transition-colors hover:bg-green-500/15"
                  @click="staffDiscountApplied = true"
                >
                  + Add staff discount
                </button>
              </li>
            </ul>
          </div>
        </div>

        <aside class="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-6 lg:sticky lg:top-6">
          <h3 class="text-lg font-semibold text-white">Order summary</h3>

          <div class="mt-5 flex flex-col gap-1.5">
            <label for="country" class="text-xs font-semibold uppercase tracking-wider text-slate-400">Country</label>
            <select
              id="country"
              v-model="country"
              class="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-blue-400/60"
            >
              <option v-for="c in COUNTRIES" :key="c.code" :value="c.code" class="bg-slate-900">
                {{ c.name }}
              </option>
            </select>
            <p class="text-xs text-slate-500">Your location determines any taxes that apply to this order.</p>
          </div>

          <div class="mt-5 flex flex-col gap-1.5">
            <label for="discount-code" class="text-xs font-semibold uppercase tracking-wider text-slate-400">Discount code</label>
            <div v-if="!discount" class="flex gap-2">
              <input
                id="discount-code"
                v-model="discountInput"
                type="text"
                placeholder="Enter code"
                class="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm uppercase text-white placeholder:normal-case placeholder:text-slate-500 outline-none transition-colors focus:border-blue-400/60"
                @keyup.enter="applyDiscount"
              />
              <button
                type="button"
                :disabled="applyingDiscount"
                class="shrink-0 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                @click="applyDiscount"
              >
                {{ applyingDiscount ? 'Checking…' : 'Apply' }}
              </button>
            </div>
            <div v-else class="flex items-center justify-between rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2.5">
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-green-300">
                  <i class="fa-solid fa-tag mr-1.5" aria-hidden="true"></i>{{ discount.code }}
                </p>
                <p class="text-xs text-green-400/80">
                  {{ discount.type === 'percent' ? `${discount.value}% off` : `${formatPrice(discount.value)} off` }}
                </p>
              </div>
              <button
                type="button"
                class="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-green-300 transition-colors hover:bg-green-500/20"
                @click="removeDiscount"
              >
                Remove
              </button>
            </div>
            <p v-if="discountError" class="text-xs text-red-300">{{ discountError }}</p>
            <p v-else class="text-xs text-slate-500">Your code isn't used until the payment succeeds — so an abandoned or declined payment leaves it active.</p>
          </div>

          <dl class="mt-5 space-y-3 text-sm">
            <div class="flex items-center justify-between">
              <dt class="text-slate-300">Item{{ items.length > 1 ? 's' : '' }} ({{ items.length }})</dt>
              <dd class="text-white">{{ formatPrice(total) }}</dd>
            </div>
            <div v-if="vatEnabled" class="flex items-center justify-between">
              <dt class="text-slate-300">Subtotal (excl. VAT)</dt>
              <dd class="text-white">{{ formatPrice(breakdown.net) }}</dd>
            </div>
            <div v-if="vatEnabled && breakdown.rate > 0" class="flex items-center justify-between">
              <dt class="text-slate-300">VAT ({{ breakdown.rate }}%)</dt>
              <dd class="text-white">{{ formatPrice(breakdown.vat) }}</dd>
            </div>
            <div v-if="staffPct > 0 && staffDiscountApplied && staffActive" class="flex items-center justify-between">
              <dt class="text-green-300">Staff discount (−{{ staffPct }}%)</dt>
              <dd class="font-semibold text-green-300">−{{ formatPrice(staffOff) }}</dd>
            </div>
            <div v-if="discount && !staffActive" class="flex items-center justify-between">
              <dt class="text-green-300">Discount ({{ discount.code }})</dt>
              <dd class="font-semibold text-green-300">−{{ formatPrice(discount.amount_off) }}</dd>
            </div>
          </dl>

          <div class="mt-5 flex items-center justify-between border-t border-white/10 pt-5">
            <span class="text-sm font-semibold text-slate-200">Total</span>
            <span class="text-2xl font-bold text-white">{{ formatPrice(discountedTotal) }}</span>
          </div>
          <p v-if="vatEnabled && breakdown.rate > 0" class="mt-1 text-xs text-slate-400">Total includes VAT</p>
          <p v-else-if="vatEnabled" class="mt-1 text-xs text-slate-400">No VAT applies to your selected country</p>

          <p v-if="checkoutError" class="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {{ checkoutError }}
          </p>

          <label class="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
            <input
              v-model="digitalConsent"
              type="checkbox"
              class="mt-0.5 h-4 w-4 shrink-0 accent-blue-600"
            />
            <span class="text-xs leading-relaxed text-slate-300">
              By checking this box you agree to the digital product being supplied immediately after payment, consent to
              the 14-day cooling-off period starting now, and waive your right to cancel once the product is delivered —
              for digital content. Read the
              <RouterLink to="/digital-products" class="font-semibold text-blue-300 underline decoration-blue-400/40 underline-offset-2 transition-colors hover:text-blue-200">
                Digital Products, Cancellation &amp; Refunds
              </RouterLink>
              policy.
            </span>
          </label>

          <button
            class="mt-4 w-full rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="paymentState === 'creating' || !digitalConsent"
            @click="createCheckout"
          >
            {{ paymentState === 'creating' ? 'Contacting SumUp…' : 'Pay with SumUp' }}
          </button>
          <p class="mt-3 text-center text-xs text-slate-500">You'll be taken to SumUp's secure hosted payment page.</p>
        </aside>
      </div>
    </template>
  </section>
</template>