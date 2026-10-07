<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../../composables/useAuth'

const { request } = useAuth()
const router = useRouter()

interface SearchResult {
  id: number
  firstname: string
  surname: string
  email: string
  role: number | null
}

interface DisputeInfo {
  id: number
  status: string
  raised_at: string
  settled_at: string | null
}

interface TransactionRow {
  id: number
  transactionid: string
  amount: number
  currency: string
  date: string
  dispute: DisputeInfo | null
}

const q = ref('')
const results = ref<SearchResult[]>([])
const searchBusy = ref(false)
let timeout: ReturnType<typeof setTimeout> | null = null

const selectedUser = ref<SearchResult | null>(null)
const transactions = ref<TransactionRow[]>([])
const transactionsLoading = ref(false)
const selectedTx = ref<TransactionRow | null>(null)

const generating = ref(false)
const settleBusy = ref(false)
const err = ref('')
const msg = ref('')

function fullName(u: SearchResult): string {
  return [u.firstname, u.surname].filter(Boolean).join(' ').trim()
}

function fmtDate(v: string): string {
  if (!v) return ''
  return new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function gbp(n: number): string {
  return `£${Number(n || 0).toFixed(2)}`
}

async function maybeSearch() {
  if (timeout) clearTimeout(timeout)
  timeout = setTimeout(runSearch, 300)
}

async function runSearch() {
  const term = q.value.trim()
  if (!term) {
    results.value = []
    return
  }
  searchBusy.value = true
  err.value = ''
  try {
    const data = await request<{ users: SearchResult[] }>(`/api/staff/disputes/users?q=${encodeURIComponent(term)}`)
    results.value = data.users || []
  } catch (e) {
    err.value = e instanceof Error ? e.message : 'Search failed'
    results.value = []
  } finally {
    searchBusy.value = false
  }
}

function pickUser(u: SearchResult) {
  selectedUser.value = u
  selectedTx.value = null
  results.value = []
  q.value = fullName(u)
  loadTransactions()
}

async function loadTransactions() {
  if (!selectedUser.value) return
  transactionsLoading.value = true
  err.value = ''
  try {
    const data = await request<{ transactions: TransactionRow[] }>(
      `/api/staff/disputes/users/${selectedUser.value.id}/transactions`
    )
    transactions.value = data.transactions || []
  } catch (e) {
    err.value = e instanceof Error ? e.message : 'Failed to load transactions'
    transactions.value = []
  } finally {
    transactionsLoading.value = false
  }
}

async function createDocument() {
  if (!selectedUser.value || !selectedTx.value || generating.value) return
  generating.value = true
  err.value = ''
  msg.value = ''
  try {
    const data = await request<any>(
      `/api/staff/disputes/document?user_id=${selectedUser.value.id}&purchase_id=${selectedTx.value.id}`
    )
    sessionStorage.setItem('kgm_dispute_doc', JSON.stringify(data))
    await loadTransactions()
    router.push({
      name: 'StaffDisputeDocument',
      query: { user_id: String(selectedUser.value.id), purchase_id: String(selectedTx.value.id) },
    })
  } catch (e) {
    err.value = e instanceof Error ? e.message : 'Failed to create document'
  } finally {
    generating.value = false
  }
}

async function settle(outcome: 'restore' | 'uphold') {
  const dispute = selectedTx.value?.dispute
  if (!dispute || settleBusy.value) return
  settleBusy.value = true
  err.value = ''
  try {
    await request<{ ok: boolean }>(`/api/staff/disputes/${dispute.id}/settle`, {
      method: 'POST',
      body: JSON.stringify({ outcome }),
    })
    msg.value =
      outcome === 'restore'
        ? 'Dispute settled. Licences on that transaction were restored.'
        : 'Dispute settled. Licences on that transaction remain suspended.'
    await loadTransactions()
  } catch (e) {
    err.value = e instanceof Error ? e.message : 'Failed to settle dispute'
  } finally {
    settleBusy.value = false
  }
}

onBeforeUnmount(() => {
  if (timeout) clearTimeout(timeout)
})
</script>

<template>
  <section class="mx-auto w-full max-w-3xl">
    <p class="text-sm font-semibold uppercase tracking-widest text-blue-400">Administration</p>
    <h2 class="mt-2 text-3xl font-bold tracking-tight text-white lg:text-4xl">Disputes</h2>
    <p class="mt-2 text-sm text-slate-400">
      Look up a customer, pick a transaction and generate a dispute document. Creating a document logs the dispute for
      that transaction and suspends its licences until an outcome is settled.
    </p>

    <p v-if="msg" class="mt-5 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
      {{ msg }}
    </p>
    <p v-if="err" class="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
      {{ err }}
    </p>

    <div class="mt-8 flex flex-col gap-6">
      <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 class="text-lg font-semibold text-white">1. Find the customer</h3>
        <div class="relative mt-4">
          <input
            v-model="q"
            type="text"
            placeholder="Search by name or email"
            class="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/60"
            @input="maybeSearch"
          />
          <i
            v-if="searchBusy"
            class="fa-solid fa-circle-notch fa-spin absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500"
            aria-hidden="true"
          ></i>
        </div>

        <div
          v-if="results.length"
          class="mt-3 divide-y divide-white/5 overflow-hidden rounded-lg border border-white/10 bg-black/40"
        >
          <button
            v-for="u in results"
            :key="u.id"
            type="button"
            class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5"
            @click="pickUser(u)"
          >
            <span class="font-semibold text-white">{{ fullName(u) }}</span>
            <span class="flex items-center gap-3">
              <span class="text-sm text-slate-400">{{ u.email }}</span>
              <span
                v-if="u.role != null"
                class="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300"
              >
                Staff
              </span>
              <span
                v-else
                class="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-300"
              >
                Customer
              </span>
            </span>
          </button>
        </div>
      </div>

      <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 class="text-lg font-semibold text-white">2. Select a transaction</h3>
        <p v-if="!selectedUser" class="mt-4 text-sm text-slate-500">
          Pick a customer first to see their transactions.
        </p>
        <template v-else>
          <div class="mt-4 flex flex-col gap-3">
            <select
              v-model="selectedTx"
              class="rounded-lg border border-white/10 bg-black/40 px-4 py-2.5 text-white outline-none transition-colors focus:border-blue-400/60"
            >
              <option :value="null" disabled>Choose a transaction</option>
              <option
                v-for="t in transactions"
                :key="t.id"
                :value="t"
              >
                {{ t.transactionid }} · {{ fmtDate(t.date) }} · {{ gbp(t.amount) }}
              </option>
            </select>
            <p v-if="transactionsLoading" class="text-sm text-slate-500">Loading transactions...</p>
            <p
              v-if="!transactionsLoading && transactions.length === 0"
              class="text-sm text-slate-500"
            >
              This customer has no paid transactions.
            </p>
          </div>

          <div
            v-if="selectedTx"
            class="mt-5 flex flex-col gap-4 rounded-xl border border-white/10 bg-black/30 p-4"
          >
            <div class="flex flex-wrap items-center gap-3 text-sm">
              <span class="font-semibold text-white">{{ selectedTx.transactionid }}</span>
              <span
                v-if="selectedTx.dispute"
                class="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider"
                :class="
                  selectedTx.dispute.status === 'settled'
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'bg-red-500/15 text-red-300'
                "
              >
                {{ selectedTx.dispute.status }} dispute
              </span>
              <span v-else class="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-300">
                no dispute
              </span>
            </div>

            <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                :disabled="generating"
                class="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                @click="createDocument"
              >
                {{ generating ? 'Creating document...' : 'Create document' }}
              </button>

              <template v-if="selectedTx.dispute && selectedTx.dispute.status === 'pending'">
                <button
                  :disabled="settleBusy"
                  class="rounded-lg border border-emerald-500/40 px-5 py-2.5 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  @click="settle('restore')"
                >
                  Settle: restore licences
                </button>
                <button
                  :disabled="settleBusy"
                  class="rounded-lg border border-red-500/40 px-5 py-2.5 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  @click="settle('uphold')"
                >
                  Settle: keep licences suspended
                </button>
              </template>
            </div>

            <p class="text-xs text-slate-500">
              Creating a document records the dispute and immediately suspends any licences bought on this transaction.
              The document is generated as a printable PDF-ready page.
            </p>
          </div>
        </template>
      </div>
    </div>
  </section>
</template>