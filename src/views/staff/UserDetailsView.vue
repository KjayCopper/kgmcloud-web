<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'
import { useAuth } from '../../composables/useAuth'
import { roleTitle, loadRoleTitles } from '../../lib/roles'
import { sanitizeHtml } from '../../utils/sanitizeHtml'
import { pickImageAndInsert } from '../../utils/uploadImage'

const props = defineProps<{ id?: string }>()

interface PurchaseRow {
  transactionid: string
  purchase_datetime: string
  item_names: string
  amount: number
  currency: string
}

interface LicenseRow {
  license_key: string
  status: string
  created_at: string
  product_name: string
}

interface InternalNote {
  id: number
  body: string
  created_at: string
  author_firstname: string
  author_role: string
}

interface OrderRequestRow {
  id: number
  type: string
  item_names: string
  amount: number
  currency: string
  reason: string | null
  status: string
  decision_note: string | null
  payment_link: string | null
  created_by_firstname: string
  created_by_role: string
  decided_by_firstname: string | null
  created_at: string
  decided_at: string | null
}

interface UserDetail {
  id: number
  firstname: string
  email: string
  role: number | string | null
  role_title?: string
  team?: number | string | null
  team_name?: string
  email_verified: number
  created_at: string
  purchases: PurchaseRow[]
  licenses: LicenseRow[]
  notes: InternalNote[]
  order_requests: OrderRequestRow[]
}

interface ProductOption {
  id: number
  name: string
  price_value: number
}

const { user, request, hasPerm, hasPermId } = useAuth()
const route = useRoute()

function displayRole(detail: UserDetail | null): string {
  if (!detail) return ''
  if (detail.role == null || Number(detail.role) === 0) return 'Customer'
  return detail.role_title || roleTitle(Number(detail.role)) || ''
}

const detail = ref<UserDetail | null>(null)
const loading = ref(true)
const error = ref('')

const tabItems = [
  { key: 'overview', label: 'Overview', icon: 'fa-table-cells-large' },
  { key: 'purchases', label: 'Purchases', icon: 'fa-bookmark' },
  { key: 'products', label: 'Products', icon: 'fa-bag-shopping' },
  { key: 'licenses', label: 'Licenses', icon: 'fa-key' },
  { key: 'notes', label: 'Notes', icon: 'fa-note-sticky' },
]

const activeTab = computed(() => {
  const key = String(route.query.tab ?? '')
  return tabItems.some((t) => t.key === key) ? key : 'overview'
})

const targetId = computed(() => (props.id ? Number(props.id) : Number(user.value?.id)))

const canCreateOrder = computed(() => hasPermId(16))
const canNote = computed(() => hasPermId(17))

function fmtDate(value?: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDateTime(value?: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function money(amount: number, currency: string): string {
  const symbol = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : `${currency} `
  return `${symbol}${Number(amount).toFixed(2)}`
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    detail.value = await request<UserDetail>(`/api/staff/userdetails/${targetId.value}`)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load user'
  } finally {
    loading.value = false
  }
}

watch(targetId, () => {
  if (targetId.value) load()
})

onMounted(async () => {
  await loadRoleTitles(request)
  if (targetId.value) await load()
})

const ownedProducts = computed(() => {
  const map = new Map<string, string>()
  for (const p of detail.value?.purchases ?? []) {
    const dt = p.purchase_datetime
    for (const name of String(p.item_names || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)) {
      if (!map.has(name) || (dt && dt < map.get(name)!)) map.set(name, dt)
    }
  }
  for (const l of detail.value?.licenses ?? []) {
    if (l.product_name && !map.has(l.product_name)) map.set(l.product_name, l.created_at)
  }
  return [...map.entries()].map(([name, date]) => ({ name, first_purchase: date }))
})

function requestStatusClass(status: string): string {
  switch (status) {
    case 'pending': return 'bg-amber-500/15 text-amber-300'
    case 'approved': return 'bg-blue-500/15 text-blue-300'
    case 'declined': return 'bg-red-500/15 text-red-300'
    case 'completed': return 'bg-emerald-500/15 text-emerald-300'
    default: return 'bg-white/10 text-slate-300'
  }
}

const copiedKey = ref('')
async function copyLicense(key: string) {
  try {
    await navigator.clipboard.writeText(key)
    copiedKey.value = key
    setTimeout(() => (copiedKey.value = ''), 1500)
  } catch { /* ignore */ }
}

/* ---- create order modal ---- */
const showOrderModal = ref(false)
const products = ref<ProductOption[]>([])
const orderType = ref<'discount' | 'free'>('discount')
const orderItemIds = ref<number[]>([])
const orderAmount = ref<number | null>(null)
const orderReason = ref('')
const orderError = ref('')
const orderSaving = ref(false)

function productTotal(): number {
  return orderItemIds.value.reduce(
    (sum, id) => sum + Number((products.value.find((p) => p.id === id) || {}).price_value || 0),
    0
  )
}

async function openOrderModal() {
  orderError.value = ''
  if (!products.value.length) {
    try {
      products.value = await request<ProductOption[]>('/api/products')
    } catch {
      products.value = []
    }
  }
  orderType.value = 'discount'
  orderItemIds.value = []
  orderAmount.value = null
  orderReason.value = ''
  showOrderModal.value = true
}

function toggleItem(id: number) {
  orderItemIds.value = orderItemIds.value.includes(id)
    ? orderItemIds.value.filter((n) => n !== id)
    : [...orderItemIds.value, id]
}

async function submitOrder() {
  orderError.value = ''
  if (!orderItemIds.value.length) {
    orderError.value = 'Select at least one product.'
    return
  }
  if (orderType.value === 'discount' && (!orderAmount.value || Number(orderAmount.value) <= 0)) {
    orderError.value = 'Enter the discounted amount for the customer.'
    return
  }
  orderSaving.value = true
  try {
    await request('/api/staff/order-requests', {
      method: 'POST',
      body: JSON.stringify({
        customer_id: detail.value?.id,
        type: orderType.value,
        items: orderItemIds.value.map((id) => ({ id })),
        amount: orderType.value === 'discount' ? orderAmount.value : null,
        reason: orderReason.value,
      }),
    })
    showOrderModal.value = false
    await load()
  } catch (e) {
    orderError.value = e instanceof Error ? e.message : 'Failed to submit request'
  } finally {
    orderSaving.value = false
  }
}

/* ---- notes ---- */
const noteError = ref('')
const noteSaving = ref(false)

const noteEditorEl = ref<HTMLDivElement | null>(null)
let noteQuill: Quill | null = null

const TOOLBAR = [
  [{ header: [3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  ['blockquote'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['link'],
  ['clean'],
]

function initNoteEditor() {
  if (noteEditorEl.value && !noteQuill) {
    noteQuill = new Quill(noteEditorEl.value, {
      theme: 'snow',
      placeholder: 'Internal note about this user…',
      modules: { toolbar: TOOLBAR },
    })
    noteQuill
      .getModule('toolbar')
      .addHandler('image', () => pickImageAndInsert(noteQuill!, token.value, (m) => (noteError.value = m)))
  }
}

function renderNoteBody(body: string): string {
  const b = (body || '').trim()
  if (!b) return b
  if (/<[a-z][\s\S]*>/i.test(b)) return sanitizeHtml(b)
  return b
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
}

watch([activeTab, loading], async ([tab, lding]) => {
  if (tab === 'notes' && !lding) {
    await nextTick()
    initNoteEditor()
  }
}, { immediate: true, flush: 'post' })

onUnmounted(() => {
  if (noteQuill) { noteQuill.destroy(); noteQuill = null }
})

async function addNote() {
  const body = noteQuill ? sanitizeHtml(noteQuill.root.innerHTML || '') : ''
  if (!body || body === '<p><br></p>' || noteSaving.value) return
  noteSaving.value = true
  noteError.value = ''
  try {
    await request(`/api/staff/userdetails/${targetId.value}/notes`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    })
    if (noteQuill) noteQuill.root.innerHTML = '<p><br></p>'
    await load()
  } catch (e) {
    noteError.value = e instanceof Error ? e.message : 'Failed to add note'
  } finally {
    noteSaving.value = false
  }
}
</script>

<template>
  <section class="mx-auto w-full max-w-6xl px-6 pb-16 pt-8 lg:pb-20 lg:pt-12">
    <p class="mb-4 text-sm font-semibold uppercase tracking-widest text-blue-400">User details</p>

    <div v-if="loading" class="flex flex-col gap-6">
      <div class="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/5"></div>
      <div class="h-64 animate-pulse rounded-2xl border border-white/10 bg-white/5"></div>
    </div>

    <template v-else-if="detail">
      <div class="mt-0 gap-8 lg:grid lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside>
          <nav class="hidden flex-col gap-1.5 lg:flex">
            <RouterLink
              v-for="item in tabItems"
              :key="item.key"
              :to="{ name: 'UserDetails', params: props.id ? { id: props.id } : {}, query: { tab: item.key } }"
              class="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors"
              :class="
                activeTab === item.key
                  ? 'bg-blue-600/15 text-blue-300'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              "
            >
              <i class="fa-solid w-4.5 shrink-0 text-center text-lg leading-none" :class="item.icon" aria-hidden="true"></i>
              {{ item.label }}
            </RouterLink>
          </nav>

          <nav class="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:hidden">
            <RouterLink
              v-for="item in tabItems"
              :key="item.key"
              :to="{ name: 'UserDetails', params: props.id ? { id: props.id } : {}, query: { tab: item.key } }"
              class="shrink-0 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors"
              :class="
                activeTab === item.key
                  ? 'bg-blue-600 text-white'
                  : 'border border-white/10 bg-white/5 text-slate-300'
              "
            >
              {{ item.label }}
            </RouterLink>
          </nav>
        </aside>

        <main class="mt-8 min-w-0 lg:mt-0">
          <p
            v-if="error"
            class="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            {{ error }}
          </p>

          <!-- OVERVIEW -->
          <template v-if="activeTab === 'overview'">
            <div class="flex flex-wrap items-center gap-5 rounded-2xl border border-white/10 bg-white/5 p-6">
              <span
                class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-500/30 text-2xl font-bold text-blue-200"
              >
                {{ detail.firstname?.[0] ?? '?' }}
              </span>
              <div class="min-w-0">
                <h3 class="text-2xl font-bold tracking-tight text-white lg:text-3xl">{{ detail.firstname }}</h3>
                <p class="mt-1 truncate text-sm text-slate-300">{{ detail.email }}</p>
                <div class="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span class="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-semibold text-blue-300">
                    {{ displayRole(detail) }}
                  </span>
                  <template v-if="detail.team_name">
                    <span class="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-semibold text-emerald-300">
                      {{ detail.team_name }}
                    </span>
                  </template>
                  <span
                    class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                    :class="detail.email_verified ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'"
                  >
                    {{ detail.email_verified ? 'Verified' : 'Not verified' }}
                  </span>
                  <template v-if="detail.created_at">
                    <span class="text-slate-500">Joined {{ fmtDate(detail.created_at) }}</span>
                  </template>
                </div>
              </div>
            </div>

            <div class="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 class="text-lg font-semibold text-white">User details</h3>
              <dl class="mt-5 flex flex-col">
                <div class="grid grid-cols-1 gap-1 border-b border-white/10 py-3 sm:grid-cols-[180px_minmax(0,1fr)]">
                  <dt class="text-sm font-semibold uppercase tracking-wider text-slate-500">Name</dt>
                  <dd class="text-sm font-semibold text-white">{{ detail.firstname }}</dd>
                </div>
                <div class="grid grid-cols-1 gap-1 border-b border-white/10 py-3 sm:grid-cols-[180px_minmax(0,1fr)]">
                  <dt class="text-sm font-semibold uppercase tracking-wider text-slate-500">Email</dt>
                  <dd class="break-all text-sm font-semibold text-white">{{ detail.email }}</dd>
                </div>
                <div class="grid grid-cols-1 gap-1 border-b border-white/10 py-3 sm:grid-cols-[180px_minmax(0,1fr)]">
                  <dt class="text-sm font-semibold uppercase tracking-wider text-slate-500">Role</dt>
                  <dd class="text-sm font-semibold text-white">{{ displayRole(detail) }}</dd>
                </div>
                <div class="grid grid-cols-1 gap-1 border-b border-white/10 py-3 sm:grid-cols-[180px_minmax(0,1fr)]">
                  <dt class="text-sm font-semibold uppercase tracking-wider text-slate-500">Team</dt>
                  <dd class="text-sm font-semibold text-white">{{ detail.team_name || '—' }}</dd>
                </div>
                <div class="grid grid-cols-1 gap-1 border-b border-white/10 py-3 sm:grid-cols-[180px_minmax(0,1fr)]">
                  <dt class="text-sm font-semibold uppercase tracking-wider text-slate-500">Email verified</dt>
                  <dd class="text-sm font-semibold text-white">{{ detail.email_verified ? 'Yes' : 'No' }}</dd>
                </div>
                <div class="grid grid-cols-1 gap-1 border-b border-white/10 py-3 sm:grid-cols-[180px_minmax(0,1fr)]">
                  <dt class="text-sm font-semibold uppercase tracking-wider text-slate-500">Purchases</dt>
                  <dd class="text-sm font-semibold text-white">{{ detail.purchases.length }}</dd>
                </div>
                <div class="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[180px_minmax(0,1fr)]">
                  <dt class="text-sm font-semibold uppercase tracking-wider text-slate-500">Member since</dt>
                  <dd class="text-sm font-semibold text-white">{{ fmtDate(detail.created_at) || '—' }}</dd>
                </div>
              </dl>
            </div>
          </template>

          <!-- PURCHASES -->
          <template v-else-if="activeTab === 'purchases'">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <h3 class="text-xl font-bold tracking-tight text-white">Purchases</h3>
              <button
                v-if="canCreateOrder"
                type="button"
                class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500"
                @click="openOrderModal"
              >
                <i class="fa-solid fa-plus mr-1.5" aria-hidden="true"></i> Create order
              </button>
            </div>

            <div class="mt-5 flex flex-col gap-6">
              <template v-if="detail.order_requests.length">
                <div class="rounded-2xl border border-white/10 bg-white/5">
                  <p class="px-5 pt-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                    Order requests
                  </p>
                  <ul class="mt-2 divide-y divide-white/10">
                    <li
                      v-for="r in detail.order_requests"
                      :key="r.id"
                      class="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div class="min-w-0">
                        <div class="flex flex-wrap items-center gap-2">
                          <span
                            class="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                            :class="requestStatusClass(r.status)"
                          >
                            {{ r.status }}
                          </span>
                          <span class="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
                            {{ r.type === 'free' ? 'Free' : 'Discounted' }}
                          </span>
                          <span class="text-xs font-semibold text-white">#{{ r.id }}</span>
                        </div>
                        <p class="mt-1.5 text-sm text-slate-300">{{ r.item_names }}</p>
                        <p class="mt-0.5 text-xs text-slate-500">
                          {{ money(r.amount, r.currency) }} · {{ r.created_by_firstname }} · {{ fmtDateTime(r.created_at) }}
                        </p>
                        <p v-if="r.reason" class="mt-0.5 text-xs italic text-slate-400">“{{ r.reason }}”</p>
                        <p v-if="r.decision_note" class="mt-0.5 text-xs italic text-slate-400">Decision: {{ r.decision_note }}</p>
                        <p v-if="r.decided_by_firstname && r.decided_at" class="mt-0.5 text-xs text-slate-500">
                          Decided by {{ r.decided_by_firstname }} on {{ fmtDateTime(r.decided_at) }}
                        </p>
                      </div>
                      <p
                        v-if="r.payment_link && r.status === 'approved'"
                        class="shrink-0 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300"
                      >
                        Customer pays in their account
                      </p>
                    </li>
                  </ul>
                </div>
              </template>

              <div class="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                <div class="hidden grid-cols-[1fr_2fr_auto_auto_auto] gap-4 border-b border-white/10 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 md:grid">
                  <span>Reference</span>
                  <span>Items</span>
                  <span>Date</span>
                  <span>Total</span>
                  <span></span>
                </div>
                <div
                  v-if="!detail.purchases.length"
                  class="px-5 py-12 text-center text-sm text-slate-500"
                >
                  No purchases yet.
                </div>
                <ul v-else class="divide-y divide-white/10">
                  <li
                    v-for="p in detail.purchases"
                    :key="p.transactionid"
                    class="grid grid-cols-1 items-center gap-2 px-5 py-4 md:grid-cols-[1fr_2fr_auto_auto_auto] md:gap-4"
                  >
                    <span class="truncate font-mono text-xs text-slate-300">{{ p.transactionid }}</span>
                    <span class="truncate text-sm text-white">{{ p.item_names }}</span>
                    <span class="text-xs text-slate-500">{{ fmtDate(p.purchase_datetime) }}</span>
                    <span class="text-sm font-semibold text-white">{{ money(p.amount, p.currency) }}</span>
                    <span class="text-xs font-semibold uppercase tracking-wide text-emerald-400">Paid</span>
                  </li>
                </ul>
              </div>
            </div>
          </template>

          <!-- PRODUCTS -->
          <template v-else-if="activeTab === 'products'">
            <h3 class="text-xl font-bold tracking-tight text-white">Products</h3>
            <div
              v-if="!ownedProducts.length"
              class="mt-5 rounded-2xl border border-white/10 bg-white/5 px-6 py-12 text-center text-sm text-slate-500"
            >
              No products purchased yet.
            </div>
            <div v-else class="mt-5 grid gap-3 sm:grid-cols-2">
              <div
                v-for="p in ownedProducts"
                :key="p.name"
                class="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <p class="text-sm font-semibold text-white">{{ p.name }}</p>
                <p v-if="p.first_purchase" class="mt-1 text-xs text-slate-500">
                  Since {{ fmtDate(p.first_purchase) }}
                </p>
              </div>
            </div>
          </template>

          <!-- LICENSES -->
          <template v-else-if="activeTab === 'licenses'">
            <h3 class="text-xl font-bold tracking-tight text-white">Licenses</h3>
            <div
              v-if="!detail.licenses.length"
              class="mt-5 rounded-2xl border border-white/10 bg-white/5 px-6 py-12 text-center text-sm text-slate-500"
            >
              No licenses yet.
            </div>
            <div v-else class="mt-5 flex flex-col gap-3">
              <div
                v-for="l in detail.licenses"
                :key="l.license_key"
                class="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-white">{{ l.product_name }}</p>
                  <p class="mt-1 break-all font-mono text-xs text-blue-200">{{ l.license_key }}</p>
                  <p class="mt-0.5 text-xs text-slate-500">
                    {{ fmtDate(l.created_at) }} ·
                    <span class="font-semibold uppercase tracking-wide" :class="l.status === 'active' ? 'text-emerald-400' : 'text-slate-400'">
                      {{ l.status }}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  class="shrink-0 rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10"
                  @click="copyLicense(l.license_key)"
                >
                  {{ copiedKey === l.license_key ? 'Copied' : 'Copy key' }}
                </button>
              </div>
            </div>
          </template>

          <!-- NOTES -->
          <template v-else-if="activeTab === 'notes'">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <h3 class="text-xl font-bold tracking-tight text-white">Internal notes</h3>
              <span class="text-xs text-slate-500">Visible to staff only</span>
            </div>

            <div class="mt-5 flex flex-col gap-3">
              <div
                v-if="!detail.notes.length"
                class="rounded-2xl border border-white/10 bg-white/5 px-6 py-12 text-center text-sm text-slate-500"
              >
                No notes yet.
              </div>
              <div
                v-for="n in detail.notes"
                :key="n.id"
                class="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <p class="post-body whitespace-normal text-sm text-slate-200" v-html="renderNoteBody(n.body)"></p>
                <p class="mt-2 text-xs text-slate-500">
                  {{ n.author_firstname }}<template v-if="roleTitle(n.author_role)"> ({{ roleTitle(n.author_role) }})</template> · {{ fmtDateTime(n.created_at) }}
                </p>
              </div>
            </div>

            <div v-if="canNote" class="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p class="text-[11px] font-bold uppercase tracking-widest text-slate-500">Add a note</p>
              <p v-if="noteError" class="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {{ noteError }}
              </p>
              <div ref="noteEditorEl" class="note-editor mt-3"></div>
              <div class="mt-2 flex justify-end">
                <button
                  type="button"
                  :disabled="noteSaving"
                  class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  @click="addNote"
                >
                  {{ noteSaving ? 'Adding…' : 'Add note' }}
                </button>
              </div>
            </div>
          </template>
        </main>
      </div>
    </template>
  </section>

  <!-- CREATE ORDER MODAL -->
  <div
    v-if="showOrderModal"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    @click.self="showOrderModal = false"
  >
    <div class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#0d1629] p-6 shadow-2xl">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-bold text-white">Create order</h3>
        <button
          type="button"
          class="rounded-lg px-2 py-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          @click="showOrderModal = false"
        >
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </div>
      <p class="mt-1 text-xs text-slate-500">
        For {{ detail?.firstname }} · requires approval by a CX Manager, Operations Director or Managing Director.
      </p>

      <div class="mt-4 flex gap-2">
        <button
          type="button"
          class="flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors"
          :class="orderType === 'discount' ? 'bg-blue-600 text-white' : 'border border-white/10 bg-white/5 text-slate-300'"
          @click="orderType = 'discount'"
        >
          Discounted
        </button>
        <button
          type="button"
          class="flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors"
          :class="orderType === 'free' ? 'bg-emerald-600 text-white' : 'border border-white/10 bg-white/5 text-slate-300'"
          @click="orderType = 'free'"
        >
          Free
        </button>
      </div>

      <p class="mt-5 text-[11px] font-bold uppercase tracking-widest text-slate-500">Products</p>
      <div class="mt-2 flex max-h-52 flex-col gap-2 overflow-y-auto pr-1">
        <label
          v-for="p in products"
          :key="p.id"
          class="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 transition-colors"
          :class="orderItemIds.includes(p.id) ? 'border-blue-400/60 bg-blue-600/10' : 'hover:bg-white/10'"
        >
          <input
            type="checkbox"
            class="h-4 w-4 accent-blue-500"
            :checked="orderItemIds.includes(p.id)"
            @change="toggleItem(p.id)"
          />
          <span class="flex-1 text-sm text-white">{{ p.name }}</span>
          <span class="text-xs text-slate-400">{{ money(p.price_value, 'GBP') }}</span>
        </label>
        <p v-if="!products.length" class="rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-xs text-slate-500">
          No active products available.
        </p>
      </div>

      <div v-if="orderType === 'discount'" class="mt-5">
        <p class="text-[11px] font-bold uppercase tracking-widest text-slate-500">Amount to charge</p>
        <input
          v-model.number="orderAmount"
          type="number"
          min="0"
          step="0.01"
          placeholder="e.g. 24.99"
          class="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/60"
        />
        <p class="mt-1.5 text-xs text-slate-500">
          Regular total {{ money(productTotal(), 'GBP') }}
        </p>
      </div>

      <div class="mt-5">
        <p class="text-[11px] font-bold uppercase tracking-widest text-slate-500">Reason</p>
        <textarea
          v-model="orderReason"
          rows="2"
          placeholder="Why they get this order…"
          class="mt-2 w-full resize-y rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/60"
        ></textarea>
      </div>

      <p v-if="orderError" class="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
        {{ orderError }}
      </p>

      <div class="mt-5 flex justify-end gap-2">
        <button
          type="button"
          class="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/10"
          @click="showOrderModal = false"
        >
          Cancel
        </button>
        <button
          type="button"
          :disabled="orderSaving"
          class="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          @click="submitOrder"
        >
          {{ orderSaving ? 'Submitting…' : 'Submit for approval' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.note-editor :deep(.ql-container) {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-top: none;
  border-radius: 0 0 0.5rem 0.5rem;
  color: #fff;
  font-size: 0.925rem;
  background: rgba(255, 255, 255, 0.03);
}
.note-editor :deep(.ql-editor) {
  color: #e2e8f0;
}
.note-editor :deep(.ql-editor.ql-blank::before) {
  color: #64748b;
}
.note-editor :deep(.ql-toolbar) {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem 0.5rem 0 0;
  background: rgba(255, 255, 255, 0.04);
}
.note-editor :deep(.ql-toolbar .ql-stroke) {
  stroke: #cbd5e1;
}
.note-editor :deep(.ql-toolbar .ql-fill) {
  fill: #cbd5e1;
}
.note-editor :deep(.ql-toolbar .ql-picker) {
  color: #cbd5e1;
}
.note-editor :deep(.ql-toolbar button:hover .ql-stroke),
.note-editor :deep(.ql-toolbar button.ql-active .ql-stroke) {
  stroke: #60a5fa;
}
.note-editor :deep(.ql-toolbar button:hover .ql-fill),
.note-editor :deep(.ql-toolbar button.ql-active .ql-fill) {
  fill: #60a5fa;
}
.note-editor :deep(.ql-toolbar .ql-picker:hover),
.note-editor :deep(.ql-toolbar .ql-picker.ql-expanded .ql-picker-label) {
  color: #60a5fa;
}
.post-body :deep(a) {
  color: #60a5fa;
  text-decoration: underline;
}
.post-body :deep(ul),
.post-body :deep(ol) {
  padding-left: 1.25rem;
}
</style>