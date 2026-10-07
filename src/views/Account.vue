<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import InvoiceView from '../components/account/InvoiceView.vue'
import { formatMoney, downloadInvoicePdf, type Invoice } from '../lib/invoicePdf'

interface Game {
  game_id: number
  added_at: string
  name?: string | null
}

interface License {
  id: number
  license_key: string
  product_id: number
  product_name?: string
  product_slug?: string
  product_image_url?: string | null
  status: string
  max_games: number
  created_at: string
  expires_at: string | null
  games: Game[]
}

interface PurchasedProduct {
  id: number
  name: string
  slug: string
  image_url: string | null
  files: { name: string; path: string; size?: number }[]
  documentation_url: string | null
  purchased_at: string | null
}

interface SettingsResult {
  ok: boolean
  user?: { id: number; firstname: string; surname: string; email: string; role: string; is_staff: boolean; permissions: string[]; dob?: string | null }
  email_sent?: boolean
  verification_required?: boolean
}

interface UnlinkResult {
  games_used: number
  max_games: number
}

interface OrderRequestRow {
  id: number
  type: 'free' | 'discount'
  item_names: string | null
  amount: number
  currency: string
  status: 'pending' | 'approved' | 'declined' | 'completed'
  decision_note: string | null
  created_at: string
  decided_at: string | null
}

interface Ticket {
  id: number
  title: string
  status: string
  transaction_id: string | null
  created_at: string
  updated_at: string
}

const { user, request, updateUser } = useAuth()
const route = useRoute()
const router = useRouter()

const tabItems = [
  { key: 'overview', label: 'Overview', icon: 'fa-table-cells-large' },
  { key: 'orders', label: 'Orders & invoices', icon: 'fa-receipt' },
  { key: 'downloads', label: 'Downloads', icon: 'fa-download' },
  { key: 'licenses', label: 'Licenses', icon: 'fa-key' },
  { key: 'tickets', label: 'Support tickets', icon: 'fa-message' },
  { key: 'settings', label: 'Account settings', icon: 'fa-user' },
]

const activeTab = computed(() => {
  const key = String(route.query.tab || 'overview')
  return tabItems.some((t) => t.key === key) ? key : 'overview'
})

const licenses = ref<License[]>([])
const downloads = ref<PurchasedProduct[]>([])
const invoices = ref<Invoice[]>([])
const loading = ref(true)
const licensesError = ref('')
const downloadsError = ref('')
const invoicesError = ref('')

const selectedInvoice = ref<Invoice | null>(null)

const tickets = ref<Ticket[]>([])
const ticketsError = ref('')
const ticketModal = ref(false)
const ticketForm = ref({ title: '', body: '', transaction_id: '' })
const creatingTicket = ref(false)
const ticketFormErr = ref('')

const orderRequests = ref<OrderRequestRow[]>([])
const orderRequestsError = ref('')
const orderPayConsent = ref<Record<number, boolean>>({})
const payingOrderId = ref<number | null>(null)
const orderPayError = ref('')

const payReadyRequests = computed(() =>
  orderRequests.value.filter((r) => r.status === 'approved' && r.type === 'discount')
)

const TICKET_STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: 'Open', cls: 'bg-blue-500/15 text-blue-300' },
  awaiting_cx: { label: 'Awaiting CX reply', cls: 'bg-amber-500/15 text-amber-300' },
  awaiting_customer: { label: 'Waiting for you', cls: 'bg-violet-500/15 text-violet-300' },
  resolved: { label: 'Resolved', cls: 'bg-green-500/15 text-green-400' },
  closed: { label: 'Closed', cls: 'bg-slate-500/15 text-slate-400' },
}

function ticketStatusMeta(status: string) {
  return TICKET_STATUS[status] || { label: 'Unknown', cls: 'bg-slate-500/15 text-slate-400' }
}

const orderLinkOptions = computed(() =>
  invoices.value.map((inv) => ({
    value: inv.transactionid,
    label: `${inv.transactionid} — ${invoiceSummary(inv)}`,
  }))
)

const newGameId = ref('')
const addingLicense = ref('')
const gameError = ref('')
const removingGame = ref('')

const profileForm = ref({ firstname: '', surname: '', email: '', dob: '' })
const profileMsg = ref('')
const profileErr = ref('')
const savingProfile = ref(false)

const marketing = ref(false)
watch(
  () => user.value?.marketing_opt_in,
  (val) => {
    if (typeof val === 'boolean') marketing.value = val
  },
  { immediate: true }
)
const savingMarketing = ref(false)
const marketingMsg = ref('')
const marketingErr = ref('')

async function toggleMarketing(val: boolean) {
  if (savingMarketing.value) return
  savingMarketing.value = true
  marketingMsg.value = ''
  marketingErr.value = ''
  marketing.value = val
  try {
    const data = await request<{ ok: boolean; marketing_opt_in: boolean }>('/api/account/preferences', {
      method: 'PUT',
      body: JSON.stringify({ marketing_opt_in: val }),
    })
    updateUser({ marketing_opt_in: data.marketing_opt_in })
    marketingMsg.value = val
      ? "You're subscribed. Marketing emails are now on."
      : 'Marketing emails turned off.'
  } catch (e) {
    marketing.value = !val
    marketingErr.value = e instanceof Error ? e.message : 'Failed to update preference'
  } finally {
    savingMarketing.value = false
  }
}

const pwForm = ref({ current: '', next: '', confirm: '' })
const pwMsg = ref('')
const pwErr = ref('')
const savingPw = ref(false)

const customer = computed(() => ({
  name: [user.value?.firstname, user.value?.surname].filter(Boolean).join(' ').trim(),
  email: user.value?.email || '',
  id: user.value?.id,
}))

watch(
  () => user.value?.firstname,
  (name) => {
    if (name) profileForm.value.firstname = name
  },
  { immediate: true }
)

watch(
  () => user.value?.surname,
  (name) => {
    if (name) profileForm.value.surname = name
  },
  { immediate: true }
)

watch(
  () => user.value?.email,
  (email) => {
    if (email) profileForm.value.email = email
  },
  { immediate: true }
)

watch(
  () => user.value?.dob,
  (dob) => {
    profileForm.value.dob = dob || ''
  },
  { immediate: true }
)

function fmtSize(bytes?: number): string {
  if (!bytes || bytes < 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function docName(url: string): string {
  return decodeURIComponent(url.split('/').pop() || 'Documentation')
}

function fmtDate(value: string): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function invoiceSummary(invoice: Invoice): string {
  return invoice.items.map((i) => (i.qty > 1 ? `${i.qty}× ${i.name}` : i.name)).join(', ')
}

function exportInvoice(invoice: Invoice) {
  downloadInvoicePdf(invoice, customer.value)
}

function fmtDateTime(value: string): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function loadTickets() {
  try {
    const data = await request<{ tickets: Ticket[] }>('/api/tickets')
    tickets.value = data.tickets
    ticketsError.value = ''
  } catch (e) {
    ticketsError.value = e instanceof Error ? e.message : 'Failed to load tickets'
  }
}

function openTicketCreate(transactionId?: string) {
  ticketForm.value = { title: '', body: '', transaction_id: transactionId ? String(transactionId) : '' }
  ticketFormErr.value = ''
  ticketModal.value = true
}

async function createTicket() {
  if (creatingTicket.value) return
  const title = ticketForm.value.title.trim()
  const body = ticketForm.value.body.trim()
  if (!title) {
    ticketFormErr.value = 'Enter a title'
    return
  }
  if (!body) {
    ticketFormErr.value = 'Write a message describing your issue'
    return
  }
  creatingTicket.value = true
  ticketFormErr.value = ''
  try {
    await request<{ ok: boolean }>('/api/tickets', {
      method: 'POST',
      body: JSON.stringify({
        title,
        body,
        transaction_id: ticketForm.value.transaction_id || null,
      }),
    })
    ticketModal.value = false
    await loadTickets()
    await router.push({ name: 'Account', query: { tab: 'tickets' } })
  } catch (e) {
    ticketFormErr.value = e instanceof Error ? e.message : 'Failed to create ticket'
  } finally {
    creatingTicket.value = false
  }
}

async function loadLicenses() {
  try {
    const data = await request<{ licenses: License[] }>('/api/licenses')
    licenses.value = data.licenses
  } catch (e) {
    licensesError.value = e instanceof Error ? e.message : 'Failed to load licenses'
  }
}

async function payOrderRequest(r: OrderRequestRow) {
  if (payingOrderId.value) return
  if (!orderPayConsent.value[r.id]) {
    orderPayError.value = 'You need to accept the digital delivery terms before you can pay'
    return
  }
  orderPayError.value = ''
  payingOrderId.value = r.id
  try {
    const data = await request<{ ok: boolean; hosted_checkout_url: string | null }>(
      `/api/order-requests/${r.id}/pay`,
      { method: 'POST', body: JSON.stringify({ digital_consent: true }) }
    )
    if (data.hosted_checkout_url) {
      window.location.href = data.hosted_checkout_url
    } else {
      orderPayError.value = 'No payment link available — please contact support'
    }
  } catch (e) {
    orderPayError.value = e instanceof Error ? e.message : 'Failed to start payment'
  } finally {
    payingOrderId.value = null
  }
}

onMounted(async () => {
  await loadLicenses()
  try {
    downloads.value = await request<PurchasedProduct[]>('/api/my-purchases')
  } catch (e) {
    downloadsError.value = e instanceof Error ? e.message : 'Failed to load downloads'
  }
  try {
    orderRequests.value = await request<OrderRequestRow[]>('/api/order-requests')
  } catch (e) {
    orderRequestsError.value = e instanceof Error ? e.message : 'Failed to load order requests'
  }
  try {
    const data = await request<{ invoices: Invoice[] }>('/api/my-invoices')
    invoices.value = data.invoices
  } catch (e) {
    invoicesError.value = e instanceof Error ? e.message : 'Failed to load invoices'
  }
  await loadTickets()
  loading.value = false
})

async function addGame(licenseKey: string) {
  if (addingLicense.value) return
  gameError.value = ''
  const gid = Number(newGameId.value.trim())
  if (!Number.isInteger(gid) || gid <= 0) {
    gameError.value = 'Enter a valid game ID'
    return
  }
  addingLicense.value = licenseKey
  try {
    await request<{ games_used: number; max_games: number }>('/api/license/game', {
      method: 'POST',
      body: JSON.stringify({ license_key: licenseKey, game_id: gid }),
    })
    const license = licenses.value.find((l) => l.license_key === licenseKey)
    if (license) {
      license.games.push({ game_id: gid, added_at: new Date().toISOString() })
    }
    newGameId.value = ''
    await loadLicenses()
  } catch (e) {
    gameError.value = e instanceof Error ? e.message : 'Failed to link game'
  } finally {
    addingLicense.value = ''
  }
}

async function unlinkGame(license: License, game: Game) {
  const key = `${license.license_key}:${game.game_id}`
  if (removingGame.value) return
  removingGame.value = key
  gameError.value = ''
  try {
    const data = await request<UnlinkResult>('/api/license/game', {
      method: 'DELETE',
      body: JSON.stringify({ license_key: license.license_key, game_id: game.game_id }),
    })
    license.games = license.games.filter((g) => g.game_id !== game.game_id)
    license.max_games = data.max_games
  } catch (e) {
    gameError.value = e instanceof Error ? e.message : 'Failed to unlink game'
  } finally {
    removingGame.value = ''
  }
}

async function saveProfile() {
  const firstname = profileForm.value.firstname.trim()
  const surname = profileForm.value.surname.trim()
  const email = profileForm.value.email.trim()
  if (!firstname || !surname) {
    profileErr.value = 'Enter your first and last name'
    return
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    profileErr.value = 'Enter a valid email address'
    return
  }
  profileErr.value = ''
  savingProfile.value = true
  try {
    const dobRaw = profileForm.value.dob
    if (dobRaw && !/^\d{4}-\d{2}-\d{2}$/.test(dobRaw)) {
      profileErr.value = 'Enter a valid date of birth'
      return
    }
    const data = await request<SettingsResult>('/api/account/profile', {
      method: 'PUT',
      body: JSON.stringify({ firstname, surname, email, dob: dobRaw || null }),
    })
    if (data.user) updateUser(data.user)
    profileMsg.value = data.verification_required
      ? 'Profile updated. A verification email was sent to your new address — confirm it to keep your account fully verified.'
      : 'Profile updated.'
  } catch (e) {
    profileErr.value = e instanceof Error ? e.message : 'Failed to update profile'
  } finally {
    savingProfile.value = false
  }
}

async function changePassword() {
  const { current, next, confirm } = pwForm.value
  if (!current) {
    pwErr.value = 'Enter your current password'
    return
  }
  if (!next || next.length < 6) {
    pwErr.value = 'New password must be at least 6 characters'
    return
  }
  if (next !== confirm) {
    pwErr.value = 'New passwords do not match'
    return
  }
  pwErr.value = ''
  savingPw.value = true
  try {
    await request<{ ok: boolean }>('/api/account/password', {
      method: 'POST',
      body: JSON.stringify({ current_password: current, new_password: next }),
    })
    pwForm.value = { current: '', next: '', confirm: '' }
    pwMsg.value = 'Password changed.'
  } catch (e) {
    pwErr.value = e instanceof Error ? e.message : 'Failed to change password'
  } finally {
    savingPw.value = false
  }
}
</script>

<template>
  <section class="mx-auto w-full max-w-6xl px-6 pb-16 pt-8 lg:pb-20 lg:pt-12">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-sm font-semibold uppercase tracking-widest text-blue-400">My account</p>
        <h2 class="mt-2 text-3xl font-bold tracking-tight text-white lg:text-4xl">
          Hey, {{ user?.firstname }}
        </h2>
        <p class="mt-2 text-sm text-slate-300">{{ user?.email }}</p>
      </div>
    </div>

    <div class="mt-10 gap-8 lg:grid lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside>
        <nav class="hidden flex-col gap-1.5 lg:flex">
          <RouterLink
            v-for="item in tabItems"
            :key="item.key"
            :to="{ name: 'Account', query: { tab: item.key } }"
            class="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors"
            :class="
              activeTab === item.key
                ? 'bg-blue-600/15 text-blue-300'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            "
          >
            <i class="fa-solid w-4.5 shrink-0 text-center text-base leading-none" :class="item.icon" aria-hidden="true"></i>
            {{ item.label }}
          </RouterLink>
        </nav>

        <nav class="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:hidden">
          <RouterLink
            v-for="item in tabItems"
            :key="item.key"
            :to="{ name: 'Account', query: { tab: item.key } }"
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
        <div v-if="loading" class="space-y-4">
          <div class="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/5"></div>
          <div class="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/5"></div>
        </div>

        <!-- Overview -->
        <div v-else-if="activeTab === 'overview'" class="flex flex-col gap-4">
          <div class="grid gap-4 sm:grid-cols-3">
            <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
              <p class="text-xs font-semibold uppercase tracking-widest text-blue-400">Orders</p>
              <p class="mt-2 text-3xl font-bold text-white">{{ invoices.length }}</p>
            </div>
            <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
              <p class="text-xs font-semibold uppercase tracking-widest text-blue-400">Downloads</p>
              <p class="mt-2 text-3xl font-bold text-white">{{ downloads.length }}</p>
            </div>
            <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
              <p class="text-xs font-semibold uppercase tracking-widest text-blue-400">Licenses</p>
              <p class="mt-2 text-3xl font-bold text-white">{{ licenses.length }}</p>
            </div>
          </div>

          <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 class="text-lg font-semibold text-white">Quick actions</h3>
            <div class="mt-4 flex flex-wrap gap-3">
              <RouterLink
                v-for="item in tabItems.filter((t) => t.key !== 'overview')"
                :key="item.key"
                :to="{ name: 'Account', query: { tab: item.key } }"
                class="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                {{ item.label }}
              </RouterLink>
            </div>
          </div>

          <div v-if="invoices.length" class="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 class="text-lg font-semibold text-white">Recent orders</h3>
            <ul class="mt-4 flex flex-col gap-3">
              <li
                v-for="invoice in invoices.slice(0, 4)"
                :key="invoice.transactionid"
                class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <div class="min-w-0">
                  <p class="truncate font-mono text-sm font-semibold text-white">{{ invoice.transactionid }}</p>
                  <p class="mt-0.5 truncate text-xs text-slate-400">{{ fmtDate(invoice.purchase_datetime) }}</p>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-sm font-semibold text-white">{{ formatMoney(invoice.total, invoice.currency) }}</span>
                  <button
                    class="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-500"
                    @click="selectedInvoice = invoice"
                  >
                    View
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <!-- Orders / invoices -->
        <div v-else-if="activeTab === 'orders'" class="flex flex-col gap-4">
          <h3 class="text-2xl font-semibold tracking-tight text-white lg:text-3xl">Orders &amp; invoices</h3>
          <p v-if="orderPayError" class="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {{ orderPayError }}
          </p>
          <div v-if="payReadyRequests.length" class="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-6">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <h4 class="text-sm font-bold uppercase tracking-wider text-blue-300">Ready to pay</h4>
              <span class="rounded-full bg-blue-500/15 px-3 py-1 text-xs font-bold text-blue-300">
                {{ payReadyRequests.length }} order{{ payReadyRequests.length === 1 ? '' : 's' }}
              </span>
            </div>
            <div class="mt-4 flex flex-col gap-4">
              <div
                v-for="r in payReadyRequests"
                :key="r.id"
                class="rounded-xl border border-white/10 bg-white/5 p-5"
              >
                <div class="flex flex-wrap items-start justify-between gap-4">
                  <div class="min-w-0">
                    <p class="font-semibold text-white">{{ r.item_names || 'Digital content' }}</p>
                    <p class="mt-1 text-xs text-slate-500">
                      Request #{{ r.id }} · arranged {{ fmtDate(r.created_at) }}
                    </p>
                    <p v-if="r.decision_note" class="mt-1 text-xs italic text-slate-400">{{ r.decision_note }}</p>
                  </div>
                  <span class="text-lg font-bold text-white">{{ formatMoney(r.amount, r.currency) }}</span>
                </div>
                <label class="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                  <input
                    v-model="orderPayConsent[r.id]"
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
                  class="mt-4 w-full rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  :disabled="payingOrderId !== null || !orderPayConsent[r.id]"
                  @click="payOrderRequest(r)"
                >
                  {{ payingOrderId === r.id ? 'Redirecting to payment…' : 'Pay now' }}
                </button>
              </div>
            </div>
          </div>
          <p v-if="invoicesError" class="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {{ invoicesError }}
          </p>
          <div
            v-else-if="invoices.length === 0"
            class="rounded-2xl border border-white/10 bg-white/5 p-8 text-center"
          >
            <p class="text-slate-300">No orders yet. When you purchase something, each order appears here with its invoice.</p>
          </div>
          <div v-else class="flex flex-col gap-4">
            <div
              v-for="invoice in invoices"
              :key="invoice.transactionid"
              class="rounded-2xl border border-white/10 bg-white/5 p-6"
            >
              <div class="flex flex-wrap items-center justify-between gap-4">
                <div class="min-w-0">
                  <p class="font-mono text-sm font-semibold text-white">{{ invoice.transactionid }}</p>
                  <p class="mt-1 text-xs text-slate-400">{{ fmtDate(invoice.purchase_datetime) }}</p>
                  <p class="mt-1 truncate text-xs text-slate-500">{{ invoiceSummary(invoice) }}</p>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-lg font-bold text-white">{{ formatMoney(invoice.total, invoice.currency) }}</span>
                  <button
                    class="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500"
                    @click="selectedInvoice = invoice"
                  >
                    View invoice
                  </button>
                  <button
                    class="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10"
                    @click="exportInvoice(invoice)"
                  >
                    PDF
                  </button>
                  <button
                    class="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10"
                    @click="openTicketCreate(invoice.transactionid)"
                  >
                    Support ticket
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Support tickets -->
        <div v-else-if="activeTab === 'tickets'" class="flex flex-col gap-4">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <h3 class="text-2xl font-semibold tracking-tight text-white lg:text-3xl">Support tickets</h3>
            <button
              class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500"
              @click="openTicketCreate()"
            >
              Create support ticket
            </button>
          </div>
          <p v-if="ticketsError" class="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {{ ticketsError }}
          </p>
          <div
            v-else-if="tickets.length === 0"
            class="rounded-2xl border border-white/10 bg-white/5 p-8 text-center"
          >
            <p class="text-slate-300">You haven't opened any support tickets yet.</p>
            <button
              class="mt-4 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500"
              @click="openTicketCreate()"
            >
              Create your first ticket
            </button>
          </div>
          <ul v-else class="flex flex-col gap-3">
            <li
              v-for="t in tickets"
              :key="t.id"
              class="rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <div class="flex flex-wrap items-center justify-between gap-4">
                <div class="min-w-0">
                  <p class="truncate font-semibold text-white">{{ t.title }}</p>
                  <p class="mt-1 text-xs text-slate-400">
                    Opened {{ fmtDate(t.created_at) }}
                    <span v-if="t.updated_at !== t.created_at"> · Updated {{ fmtDateTime(t.updated_at) }}</span>
                  </p>
                  <p v-if="t.transaction_id" class="mt-1 font-mono text-xs text-slate-500">
                    Order #{{ t.transaction_id }}
                  </p>
                </div>
                <div class="flex shrink-0 items-center gap-3">
                  <span
                    class="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide"
                    :class="ticketStatusMeta(t.status).cls"
                  >
                    {{ ticketStatusMeta(t.status).label }}
                  </span>
                  <RouterLink
                    :to="{ name: 'AccountTicketView', params: { id: t.id } }"
                    class="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    View
                  </RouterLink>
                </div>
              </div>
            </li>
          </ul>
        </div>

        <!-- Downloads -->
        <div v-else-if="activeTab === 'downloads'" class="flex flex-col gap-4">
          <h3 class="text-2xl font-semibold tracking-tight text-white lg:text-3xl">Downloads</h3>
          <p v-if="downloadsError" class="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {{ downloadsError }}
          </p>
          <div
            v-else-if="downloads.length === 0"
            class="rounded-2xl border border-white/10 bg-white/5 p-8 text-center"
          >
            <p class="text-slate-300">Purchase a product and your downloads will appear here.</p>
          </div>
          <div v-else class="flex flex-col gap-4">
            <div
              v-for="item in downloads"
              :key="item.id"
              class="rounded-2xl border border-white/10 bg-white/5 p-6"
            >
              <div class="flex items-center gap-4">
                <img
                  v-if="item.image_url"
                  :src="item.image_url"
                  :alt="item.name"
                  class="h-16 w-24 shrink-0 rounded-lg border border-white/10 object-cover"
                />
                <div class="min-w-0 flex-1">
                  <p class="truncate font-semibold text-white">{{ item.name }}</p>
                  <p class="mt-0.5 text-xs text-slate-500">
                    {{
                      item.purchased_at
                        ? `Purchased ${fmtDate(item.purchased_at)}`
                        : 'Purchased'
                    }}
                  </p>
                </div>
              </div>

              <div v-if="item.documentation_url" class="mt-4">
                <a
                  :href="item.documentation_url"
                  target="_blank"
                  class="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition-colors hover:bg-white/10"
                >
                  <span class="min-w-0">
                    <span class="block truncate text-sm font-semibold text-white">{{ docName(item.documentation_url) }}</span>
                    <span class="mt-0.5 block text-xs text-slate-400">Documentation</span>
                  </span>
                  <span class="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white">Open</span>
                </a>
              </div>

              <ul v-if="item.files.length" class="mt-3 flex flex-col gap-2">
                <li
                  v-for="file in item.files"
                  :key="file.path"
                  class="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <span class="min-w-0">
                    <span class="block truncate text-sm font-semibold text-white">{{ file.name }}</span>
                    <span class="mt-0.5 block text-xs text-slate-400">{{ fmtSize(file.size) }}</span>
                  </span>
                  <a
                    :href="file.path"
                    target="_blank"
                    class="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-500"
                  >
                    Download
                  </a>
                </li>
              </ul>

              <p v-if="!item.documentation_url && item.files.length === 0" class="mt-4 text-sm text-slate-500">
                No files attached to this product yet.
              </p>
            </div>
          </div>
        </div>

        <!-- Licenses -->
        <div v-else-if="activeTab === 'licenses'" class="flex flex-col gap-4">
          <h3 class="text-2xl font-semibold tracking-tight text-white lg:text-3xl">Licenses</h3>

          <p v-if="licensesError" class="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {{ licensesError }}
          </p>
          <p v-else-if="gameError" class="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {{ gameError }}
          </p>

          <div
            v-if="licenses.length === 0"
            class="rounded-2xl border border-white/10 bg-white/5 p-8 text-center"
          >
            <p class="text-slate-300">No licenses yet. Purchase a product to get your license keys here.</p>
          </div>

          <div v-else class="flex flex-col gap-6">
            <div
              v-for="license in licenses"
              :key="license.id"
              class="rounded-2xl border border-white/10 bg-white/5 p-6"
            >
              <div v-if="license.product_name" class="mb-5 flex items-center gap-4">
                <img
                  v-if="license.product_image_url"
                  :src="license.product_image_url"
                  :alt="license.product_name"
                  class="h-14 w-20 shrink-0 rounded-lg border border-white/10 object-cover"
                />
                <div class="min-w-0">
                  <p class="truncate font-semibold text-white">{{ license.product_name }}</p>
                  <p class="mt-0.5 text-xs text-slate-500">Product</p>
                </div>
              </div>

              <div class="flex flex-wrap items-center justify-between gap-4">
                <div class="flex flex-col gap-1">
                  <span class="text-xs font-semibold uppercase tracking-wider text-blue-400">License key</span>
                  <code class="text-sm font-semibold text-white">{{ license.license_key }}</code>
                </div>
                <span
                  class="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide"
                  :class="
                    license.status === 'active'
                      ? 'bg-green-500/15 text-green-400'
                      : 'bg-red-500/15 text-red-400'
                  "
                >
                  {{ license.status }}
                </span>
              </div>

              <div class="mt-5 flex flex-col gap-3">
                <h4 class="text-sm font-semibold text-slate-300">
                  Linked games
                  <span class="font-normal text-slate-500">
                    ({{ license.games.length }}/{{ license.max_games }})
                  </span>
                </h4>

                <div v-if="license.games.length === 0" class="text-sm text-slate-500">
                  No games linked yet.
                </div>

                <ul v-else class="flex flex-col gap-2">
                  <li
                    v-for="game in license.games"
                    :key="game.game_id"
                    class="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm"
                  >
                    <span class="flex min-w-0 items-center gap-2">
                      <span class="font-mono text-white">{{ game.game_id }}</span>
                      <span v-if="game.name" class="truncate text-slate-300">{{ game.name }}</span>
                    </span>
                    <span class="flex items-center gap-3">
                      <span class="text-xs text-slate-500">
                        Added {{ fmtDate(game.added_at) }}
                      </span>
                      <button
                        class="rounded-md border border-red-500/25 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/20"
                        :disabled="removingGame !== ''"
                        aria-label="Unlink game {{ game.game_id }}"
                        @click="unlinkGame(license, game)"
                      >
                        {{
                          removingGame === `${license.license_key}:${game.game_id}`
                            ? 'Removing…'
                            : 'Remove'
                        }}
                      </button>
                    </span>
                  </li>
                </ul>

                <div class="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    v-model="newGameId"
                    type="text"
                    inputmode="numeric"
                    placeholder="Roblox game/universe ID"
                    class="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/60"
                  />
                  <button
                    :disabled="addingLicense !== ''"
                    class="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                    @click="addGame(license.license_key)"
                  >
                    {{ addingLicense === license.license_key ? 'Linking…' : 'Link game' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Settings -->
        <div v-else-if="activeTab === 'settings'" class="flex flex-col gap-6">
          <h3 class="text-2xl font-semibold tracking-tight text-white lg:text-3xl">Account settings</h3>

          <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h4 class="text-lg font-semibold text-white">Profile</h4>
            <p v-if="profileMsg" class="mt-3 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
              {{ profileMsg }}
              <RouterLink
                v-if="profileMsg.includes('verification')"
                to="/verify-email"
                class="ml-1 underline"
              >
                Verify email
              </RouterLink>
            </p>
            <p v-if="profileErr" class="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {{ profileErr }}
            </p>

            <form class="mt-5 flex flex-col gap-4" @submit.prevent="saveProfile">
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold uppercase tracking-wider text-slate-400" for="pf-name">First name</label>
                <input
                  id="pf-name"
                  v-model="profileForm.firstname"
                  type="text"
                  class="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/60"
                />
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold uppercase tracking-wider text-slate-400" for="pf-surname">Surname</label>
                <input
                  id="pf-surname"
                  v-model="profileForm.surname"
                  type="text"
                  class="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/60"
                />
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold uppercase tracking-wider text-slate-400" for="pf-email">Email</label>
                <input
                  id="pf-email"
                  v-model="profileForm.email"
                  type="email"
                  class="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/60"
                />
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold uppercase tracking-wider text-slate-400" for="pf-dob">Date of birth</label>
                <input
                  id="pf-dob"
                  v-model="profileForm.dob"
                  type="date"
                  class="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/60"
                />
                <p class="text-xs text-slate-500">Used to send you a birthday discount each year.</p>
              </div>
              <div>
                <button
                  :disabled="savingProfile"
                  class="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                  type="submit"
                >
                  {{ savingProfile ? 'Saving…' : 'Save changes' }}
                </button>
              </div>
            </form>
          </div>

          <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h4 class="text-lg font-semibold text-white">Preferences</h4>
            <p v-if="marketingMsg" class="mt-3 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
              {{ marketingMsg }}
            </p>
            <p v-if="marketingErr" class="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {{ marketingErr }}
            </p>

            <div class="mt-5 flex items-center justify-between gap-4">
              <div>
                <p class="text-sm font-semibold text-white">Marketing emails</p>
                <p class="mt-1 text-sm text-slate-400">
                  Emails about new products, offers and updates. Turn this off any time.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                :aria-checked="marketing"
                :disabled="savingMarketing"
                class="relative inline-flex shrink-0 items-center rounded-full p-0 transition-colors disabled:opacity-60"
                @click="toggleMarketing(!marketing)"
              >
                <span
                  class="relative inline-flex h-7 w-12 items-center rounded-full transition-colors"
                  :class="marketing ? 'bg-blue-600' : 'bg-slate-600'"
                >
                  <span
                    class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
                    :class="marketing ? 'translate-x-6' : 'translate-x-0.5'"
                  ></span>
                </span>
              </button>
            </div>
          </div>

          <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h4 class="text-lg font-semibold text-white">Password</h4>
            <p v-if="pwMsg" class="mt-3 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
              {{ pwMsg }}
            </p>
            <p v-if="pwErr" class="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {{ pwErr }}
            </p>

            <form class="mt-5 flex flex-col gap-4" @submit.prevent="changePassword">
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold uppercase tracking-wider text-slate-400" for="pw-current">Current password</label>
                <input
                  id="pw-current"
                  v-model="pwForm.current"
                  type="password"
                  autocomplete="current-password"
                  class="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/60"
                />
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold uppercase tracking-wider text-slate-400" for="pw-new">New password</label>
                <input
                  id="pw-new"
                  v-model="pwForm.next"
                  type="password"
                  autocomplete="new-password"
                  class="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/60"
                />
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold uppercase tracking-wider text-slate-400" for="pw-confirm">Confirm new password</label>
                <input
                  id="pw-confirm"
                  v-model="pwForm.confirm"
                  type="password"
                  autocomplete="new-password"
                  class="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/60"
                />
              </div>
              <div>
                <button
                  :disabled="savingPw"
                  class="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                  type="submit"
                >
                  {{ savingPw ? 'Changing…' : 'Change password' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>

    <div
      v-if="selectedInvoice"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      @click.self="selectedInvoice = null"
    >
      <div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto">
        <div class="mb-3 flex justify-end">
          <button
            class="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            @click="selectedInvoice = null"
          >
            Close
          </button>
        </div>
        <InvoiceView :invoice="selectedInvoice" :customer="customer" />
      </div>
    </div>

    <div
      v-if="ticketModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      @click.self="ticketModal = false"
    >
      <div class="w-full max-w-xl rounded-2xl border border-white/10 bg-slate-900 p-6">
        <div class="flex items-center justify-between gap-4">
          <h3 class="text-lg font-semibold text-white">Create support ticket</h3>
          <button
            class="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            @click="ticketModal = false"
          >
            Close
          </button>
        </div>
        <p v-if="ticketFormErr" class="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {{ ticketFormErr }}
        </p>
        <form class="mt-5 flex flex-col gap-4" @submit.prevent="createTicket">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold uppercase tracking-wider text-slate-400" for="tk-title">Title</label>
            <input
              id="tk-title"
              v-model="ticketForm.title"
              type="text"
              maxlength="255"
              placeholder="Brief summary of your issue"
              class="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/60"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold uppercase tracking-wider text-slate-400" for="tk-body">Message</label>
            <textarea
              id="tk-body"
              v-model="ticketForm.body"
              rows="5"
              maxlength="4000"
              placeholder="Describe the issue in as much detail as you can…"
              class="resize-y rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/60"
            ></textarea>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold uppercase tracking-wider text-slate-400" for="tk-order">Link an order (optional)</label>
            <select
              id="tk-order"
              v-model="ticketForm.transaction_id"
              class="rounded-lg border border-white/10 bg-slate-900 px-4 py-2.5 text-white outline-none transition-colors focus:border-blue-400/60"
            >
              <option value="" class="bg-slate-900 text-white">No order linked</option>
              <option
                v-for="opt in orderLinkOptions"
                :key="opt.value"
                :value="opt.value"
                class="bg-slate-900 text-white"
              >
                {{ opt.label }}
              </option>
            </select>
          </div>
          <div>
            <button
              :disabled="creatingTicket"
              class="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
            >
              {{ creatingTicket ? 'Creating…' : 'Create ticket' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>