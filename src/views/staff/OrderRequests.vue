<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuth } from '../../composables/useAuth'

interface OrderRequestRow {
  id: number
  type: string
  items_purchased: string
  item_names: string
  amount: number
  currency: string
  reason: string | null
  status: string
  decision_note: string | null
  payment_link: string | null
  created_by_firstname: string
  decided_by_firstname: string | null
  created_at: string
  decided_at: string | null
  customer_firstname: string
  customer_email: string
}

const { request, hasPermId } = useAuth()

const canManage = computed(() => hasPermId(24))

const requests = ref<OrderRequestRow[]>([])
const loading = ref(true)
const error = ref('')

const isApprover = canManage

const pendingCount = computed(() => requests.value.filter((r) => r.status === 'pending').length)

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
  return (
    d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  )
}

function money(amount: number, currency: string): string {
  const symbol = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : `${currency} `
  return `${symbol}${Number(amount).toFixed(2)}`
}

function statusClass(status: string): string {
  switch (status) {
    case 'pending': return 'bg-amber-500/15 text-amber-300'
    case 'approved': return 'bg-blue-500/15 text-blue-300'
    case 'declined': return 'bg-red-500/15 text-red-300'
    case 'completed': return 'bg-emerald-500/15 text-emerald-300'
    default: return 'bg-white/10 text-slate-300'
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    requests.value = await request<OrderRequestRow[]>('/api/staff/order-requests')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load order requests'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (canManage.value) load()
})

/* ---- decision modal ---- */
interface DecisionTarget {
  id: number
  action: 'approve' | 'decline'
}
const decision = ref<DecisionTarget | null>(null)
const decisionNote = ref('')
const decisionBusy = ref(false)
const decisionError = ref('')
const decisionResult = ref('')

function openDecision(id: number, action: 'approve' | 'decline') {
  decisionNote.value = ''
  decisionError.value = ''
  decisionResult.value = ''
  decision.value = { id, action }
}

async function confirmDecision() {
  if (!decision.value) return
  decisionBusy.value = true
  decisionError.value = ''
  decisionResult.value = ''
  try {
    const data = await request<{ ok: boolean; status?: string; payment_link?: string | null }>(
      `/api/staff/order-requests/${decision.value.id}/${decision.value.action}`,
      { method: 'POST', body: JSON.stringify({ note: decisionNote.value }) }
    )
    if (decision.value.action === 'approve') {
      decisionResult.value = data.status === 'completed'
        ? 'Approved. Free order has been granted to the customer.'
        : 'Approved. The customer has been emailed and completes payment from their account.'
    } else {
      decisionResult.value = 'Request declined and the customer has been notified.'
    }
    await load()
  } catch (e) {
    decisionError.value = e instanceof Error ? e.message : 'Failed to update request'
  } finally {
    decisionBusy.value = false
  }
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-sm font-semibold uppercase tracking-widest text-blue-400">Staff panel</p>
        <h2 class="mt-2 text-3xl font-bold tracking-tight text-white lg:text-4xl">Order requests</h2>
        <p class="mt-1 text-xs text-slate-500">
          Staff-created orders waiting on approval by a CX Manager, Operations Director or Managing Director.
        </p>
      </div>
      <span
        v-if="!loading && canManage"
        class="rounded-full px-3 py-1 text-xs font-bold"
        :class="pendingCount ? 'bg-amber-500/15 text-amber-300' : 'bg-white/10 text-slate-300'"
      >
        {{ pendingCount }} pending
      </span>
    </div>

    <template v-if="canManage">
    <p v-if="error" class="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
      {{ error }}
    </p>

    <div v-if="loading" class="mt-6 space-y-3">
      <div v-for="i in 3" :key="i" class="h-16 animate-pulse rounded-xl border border-white/10 bg-white/5"></div>
    </div>

    <div v-else-if="!requests.length" class="mt-6 rounded-2xl border border-white/10 bg-white/5 px-6 py-14 text-center">
      <i class="fa-solid fa-inbox text-3xl text-slate-600" aria-hidden="true"></i>
      <p class="mt-3 text-sm font-semibold text-white">No order requests</p>
      <p class="mt-1 text-sm text-slate-500">Requests will appear here once staff create an order for a customer.</p>
    </div>

    <div v-else class="mt-6 flex flex-col gap-4">
      <div
        v-for="r in requests"
        :key="r.id"
        class="rounded-2xl border border-white/10 bg-white/5 p-5"
      >
        <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-sm font-bold text-white">#{{ r.id }}</span>
              <span
                class="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                :class="statusClass(r.status)"
              >
                {{ r.status }}
              </span>
              <span class="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
                {{ r.type === 'free' ? 'Free' : 'Discounted' }}
              </span>
            </div>

            <p class="mt-2 text-sm text-slate-300">
              <span class="font-semibold text-white">{{ r.customer_firstname }}</span>
              <span class="text-slate-500">({{ r.customer_email }})</span>
            </p>
            <p class="mt-1 text-sm text-slate-200">{{ r.item_names }}</p>
            <p class="mt-1 text-xs text-slate-500">
              {{ money(r.amount, r.currency) }} · requested by {{ r.created_by_firstname }} on {{ fmtDateTime(r.created_at) }}
            </p>
            <p v-if="r.reason" class="mt-1 text-xs italic text-slate-400">“{{ r.reason }}”</p>
            <p v-if="r.decision_note" class="mt-1 text-xs italic text-slate-400">Decision: {{ r.decision_note }}</p>
            <p v-if="r.decided_by_firstname && r.decided_at" class="mt-1 text-xs text-slate-500">
              Decided by {{ r.decided_by_firstname }} on {{ fmtDateTime(r.decided_at) }}
            </p>
            <p
              v-if="r.status === 'approved' && r.type === 'discount'"
              class="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400"
            >
              <i class="fa-solid fa-circle-check" aria-hidden="true"></i> Customer completes payment in their account
            </p>
          </div>

          <div v-if="r.status === 'pending' && isApprover" class="flex shrink-0 gap-2">
            <button
              type="button"
              class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
              @click="openDecision(r.id, 'approve')"
            >
              Approve
            </button>
            <button
              type="button"
              class="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/10"
              @click="openDecision(r.id, 'decline')"
            >
              Decline
            </button>
          </div>

          <span
            v-else-if="r.status === 'pending'"
            class="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-400"
          >
            Awaiting manager
          </span>
        </div>
      </div>
    </div>
    </template>
  </div>

  <!-- DECISION MODAL -->
  <div
    v-if="decision"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    @click.self="decision = null"
  >
    <div class="w-full max-w-md rounded-2xl border border-white/10 bg-[#110a1e] p-6 shadow-2xl">
      <h3 class="text-lg font-bold text-white">
        {{ decision.action === 'approve' ? 'Approve request' : 'Decline request' }}
      </h3>
      <p class="mt-1 text-xs text-slate-500">
        {{
          decision.action === 'approve'
            ? 'Free orders are granted immediately. Discounted orders will generate a payment link emailed to the customer.'
            : 'The customer will be notified that their order request was declined.'
        }}
      </p>

      <p v-if="decisionError" class="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
        {{ decisionError }}
      </p>

      <div v-if="decisionResult" class="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-3">
        <p class="whitespace-pre-wrap text-xs text-emerald-300">{{ decisionResult }}</p>
      </div>

      <div v-else class="mt-5">
        <p class="text-[11px] font-bold uppercase tracking-widest text-slate-500">Note (optional)</p>
        <textarea
          v-model="decisionNote"
          rows="3"
          :placeholder="decision.action === 'approve' ? 'Approval note…' : 'Reason for declining…'"
          class="mt-2 w-full resize-y rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/60"
        ></textarea>
      </div>

      <div class="mt-5 flex justify-end gap-2">
        <button
          type="button"
          class="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/10"
          @click="decision = null"
        >
          Close
        </button>
        <button
          v-if="!decisionResult"
          type="button"
          :disabled="decisionBusy"
          class="rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          :class="decision.action === 'approve' ? 'bg-emerald-600 shadow-emerald-600/30 hover:bg-emerald-500' : 'bg-red-600 shadow-red-600/30 hover:bg-red-500'"
          @click="confirmDecision"
        >
          {{ decisionBusy ? 'Submitting…' : decision.action === 'approve' ? 'Approve' : 'Decline' }}
        </button>
      </div>
    </div>
  </div>
</template>