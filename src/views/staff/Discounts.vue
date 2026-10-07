<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuth } from '../../composables/useAuth'

interface DiscountRow {
  id: number
  code: string
  type: 'percent' | 'fixed'
  value: number | string
  user_id: number | null
  user_firstname: string | null
  user_surname: string | null
  user_email: string | null
  max_uses: number | null
  uses_count: number
  per_user_limit: number | null
  valid_from: string | null
  valid_to: string | null
  active: boolean
  revoked_at: string | null
  revoked_reason: string | null
  revoked_by_firstname: string | null
  revoked_by_surname: string | null
  created_at: string
}

interface Customer {
  id: number
  firstname: string
  surname: string
  email: string
}

const { request, user, hasPermId } = useAuth()

const canManage = computed(() => hasPermId(35))

const codes = ref<DiscountRow[]>([])
const loading = ref(true)
const err = ref('')

const createOpen = ref(false)
const creating = ref(false)
const createErr = ref('')

const resultOpen = ref(false)
const result = ref<{ code: string; email_sent: boolean; customer: Customer | null } | null>(null)
const copied = ref(false)

const revokeTarget = ref<DiscountRow | null>(null)
const revokeReason = ref('')
const revoking = ref(false)
const revokeErr = ref('')

const form = ref({
  type: 'percent' as 'percent' | 'fixed',
  value: '',
  audience: 'anyone' as 'anyone' | 'customer',
  customer: null as Customer | null,
  search: '',
  results: [] as Customer[],
  searching: false,
  perUserLimit: '',
  maxUses: '',
  validFrom: '',
  validTo: '',
  emailCustomer: false,
})

function fmtDate(value: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function discountLabel(r: DiscountRow): string {
  const v = Math.round(Number(r.value) * 100) / 100
  return r.type === 'percent' ? `${v}%` : `£${v.toFixed(2)}`
}

function audienceLabel(r: DiscountRow): string {
  if (r.user_email) {
    const name = [r.user_firstname, r.user_surname].filter(Boolean).join(' ')
    return name ? `${name} · ${r.user_email}` : r.user_email
  }
  return 'Anyone'
}

function revokedBy(r: DiscountRow): string {
  const name = [r.revoked_by_firstname, r.revoked_by_surname].filter(Boolean).join(' ')
  return name ? `Revoked by ${name}` : 'Revoked'
}

function statusOf(r: DiscountRow): { label: string; cls: string } {
  const now = Date.now()
  if (r.revoked_at) return { label: 'Revoked', cls: 'bg-red-500/15 text-red-300' }
  if (!r.active) return { label: 'Disabled', cls: 'bg-slate-500/15 text-slate-400' }
  if (r.valid_to && new Date(r.valid_to).getTime() < now) return { label: 'Expired', cls: 'bg-amber-500/15 text-amber-300' }
  if (r.valid_from && new Date(r.valid_from).getTime() > now) return { label: 'Scheduled', cls: 'bg-amber-500/15 text-amber-300' }
  return { label: 'Active', cls: 'bg-green-500/15 text-green-400' }
}

function validWindow(r: DiscountRow): string {
  if (!r.valid_from && !r.valid_to) return 'Any time'
  if (r.valid_from && r.valid_to) return `${fmtDate(r.valid_from)} → ${fmtDate(r.valid_to)}`
  if (r.valid_from) return `From ${fmtDate(r.valid_from)}`
  return `Until ${fmtDate(r.valid_to)}`
}

const usesLabel = (r: DiscountRow): string =>
  r.max_uses ? `${r.uses_count} / ${r.max_uses}` : String(r.uses_count)

async function load() {
  loading.value = true
  err.value = ''
  try {
    codes.value = await request<DiscountRow[]>('/api/staff/discounts')
  } catch (e) {
    err.value = e instanceof Error ? e.message : 'Failed to load discounts'
  } finally {
    loading.value = false
  }
}

function openCreate() {
  if (!canManage.value) return
  createErr.value = ''
  form.value = {
    type: 'percent',
    value: '',
    audience: 'anyone',
    customer: null,
    search: '',
    results: [],
    searching: false,
    perUserLimit: '',
    maxUses: '',
    validFrom: '',
    validTo: '',
    emailCustomer: false,
  }
  createOpen.value = true
}

async function searchCustomers() {
  const q = form.value.search.trim()
  if (q.length < 2) {
    form.value.results = []
    return
  }
  form.value.searching = true
  try {
    const found = await request<Customer[]>(
      `/api/staff/discounts/customers?q=${encodeURIComponent(q)}`
    )
    form.value.results = found.filter((c) => c.id !== user.value?.id)
  } catch {
    form.value.results = []
  } finally {
    form.value.searching = false
  }
}

function pickCustomer(c: Customer) {
  form.value.customer = c
  form.value.search = `${c.firstname} ${c.surname} · ${c.email}`
  form.value.results = []
}

function clearCustomer() {
  form.value.customer = null
  form.value.search = ''
  form.value.emailCustomer = false
}

async function submit() {
  if (creating.value || !canManage.value) return
  const value = Number(form.value.value)
  if (!Number.isFinite(value) || value <= 0) {
    createErr.value = 'Enter a discount value greater than zero'
    return
  }
  if (form.value.type === 'percent' && value > 100) {
    createErr.value = 'Percentage cannot exceed 100'
    return
  }
  if (form.value.audience === 'customer' && !form.value.customer) {
    createErr.value = 'Pick a customer for this code'
    return
  }
  if (form.value.customer && form.value.customer.id === user.value?.id) {
    createErr.value = "You can't create a discount code for yourself"
    return
  }
  createErr.value = ''
  creating.value = true
  try {
    const data = await request<{ email_sent: boolean; discount: DiscountRow }>('/api/staff/discounts', {
      method: 'POST',
      body: JSON.stringify({
        type: form.value.type,
        value,
        user_id: form.value.audience === 'customer' && form.value.customer ? form.value.customer.id : undefined,
        per_user_limit: form.value.perUserLimit ? Number(form.value.perUserLimit) : undefined,
        max_uses: form.value.maxUses ? Number(form.value.maxUses) : undefined,
        valid_from: form.value.validFrom || undefined,
        valid_to: form.value.validTo || undefined,
        email_customer: form.value.emailCustomer,
        active: true,
      }),
    })
    createOpen.value = false
    result.value = {
      code: data.discount.code,
      email_sent: !!data.email_sent,
      customer: form.value.audience === 'customer' ? form.value.customer : null,
    }
    copied.value = false
    resultOpen.value = true
    await load()
  } catch (e) {
    createErr.value = e instanceof Error ? e.message : 'Failed to create discount'
  } finally {
    creating.value = false
  }
}

async function copyCode() {
  if (!result.value) return
  try {
    await navigator.clipboard.writeText(result.value.code)
    copied.value = true
  } catch {
    copied.value = false
  }
}

function openRevoke(row: DiscountRow) {
  if (!canManage.value) return
  revokeTarget.value = row
  revokeReason.value = ''
  revokeErr.value = ''
}

async function revoke() {
  if (!revokeTarget.value || !canManage.value) return
  const reason = revokeReason.value.trim()
  if (reason.length < 3) {
    revokeErr.value = 'Add a reason for revoking this code'
    return
  }
  revokeErr.value = ''
  revoking.value = true
  try {
    await request(`/api/staff/discounts/${revokeTarget.value.id}/revoke`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
    revokeTarget.value = null
    revokeReason.value = ''
    await load()
  } catch (e) {
    revokeErr.value = e instanceof Error ? e.message : 'Failed to revoke discount'
  } finally {
    revoking.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-sm font-semibold uppercase tracking-widest text-blue-400">Customer Experience</p>
        <h2 class="mt-2 text-3xl font-bold tracking-tight text-white lg:text-4xl">Discounts</h2>
        <p class="mt-1 text-xs text-slate-500">{{ canManage ? 'Create and manage promo codes' : 'View promo codes' }}</p>
      </div>
    </div>

    <p v-if="err" class="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
      {{ err }}
    </p>

    <div class="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-4">
        <h3 class="text-lg font-semibold text-white">Discount codes</h3>
        <button
          v-if="canManage"
          type="button"
          class="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500"
          @click="openCreate"
        >
          Create discount
        </button>
      </div>

      <div v-if="loading" class="space-y-4 p-6">
        <div class="h-12 animate-pulse rounded-xl border border-white/10 bg-white/5"></div>
        <div class="h-12 animate-pulse rounded-xl border border-white/10 bg-white/5"></div>
      </div>

      <div v-else-if="codes.length === 0" class="p-10 text-center">
        <p class="text-sm text-slate-400">{{ canManage ? 'No discount codes yet. Create one for a site-wide promo or a specific customer.' : 'No discount codes found.' }}</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-white/10 bg-white/5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
              <th class="px-6 py-3">Code</th>
              <th class="px-4 py-3">Discount</th>
              <th class="px-4 py-3">Audience</th>
              <th class="px-4 py-3 text-right">Uses</th>
              <th class="px-4 py-3 text-right">Per user</th>
              <th class="px-4 py-3">Valid</th>
              <th class="px-6 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/10">
            <tr v-for="row in codes" :key="row.id">
              <td class="px-6 py-3 font-mono text-xs font-bold text-white">{{ row.code }}</td>
              <td class="px-4 py-3 font-semibold text-slate-200">{{ discountLabel(row) }}</td>
              <td class="px-4 py-3 text-slate-300">{{ audienceLabel(row) }}</td>
              <td class="px-4 py-3 text-right text-slate-300">{{ usesLabel(row) }}</td>
              <td class="px-4 py-3 text-right text-slate-300">{{ row.per_user_limit ?? 'Unlimited' }}</td>
              <td class="px-4 py-3 text-xs text-slate-400">{{ validWindow(row) }}</td>
              <td class="px-6 py-3 text-right">
                <div class="flex items-center justify-end gap-3">
                  <span
                    class="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide"
                    :class="statusOf(row).cls"
                    :title="row.revoked_reason ? `${revokedBy(row)} — ${row.revoked_reason}` : (row.revoked_at ? revokedBy(row) : undefined)"
                  >
                    {{ statusOf(row).label }}
                  </span>
                  <button
                    v-if="canManage && !row.revoked_at"
                    type="button"
                    title="Revoke code"
                    class="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300"
                    @click="openRevoke(row)"
                  >
                    <i class="fa-solid fa-trash-can text-xs" aria-hidden="true"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create modal -->
    <div v-if="createOpen" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-24 sm:p-8 sm:pt-28" @click.self="createOpen = false">
      <div class="w-full max-w-xl rounded-2xl border border-white/10 bg-slate-900 p-6">
        <h3 class="text-lg font-semibold text-white">Create discount code</h3>
        <p class="mt-1 text-sm text-slate-400">Set who it's for, how much it saves, and how often it can be used.</p>

        <p v-if="createErr" class="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {{ createErr }}
        </p>

        <div class="mt-5 flex flex-col gap-5">
          <div>
            <p class="text-sm font-semibold text-slate-200">Who can use it?</p>
            <div class="mt-2 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                class="flex-1 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors"
                :class="form.audience === 'anyone' ? 'border-blue-400/60 bg-blue-600/15 text-white' : 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'"
                @click="form.audience = 'anyone'; form.customer = null; form.emailCustomer = false"
              >
                Anyone (site-wide)
              </button>
              <button
                type="button"
                class="flex-1 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors"
                :class="form.audience === 'customer' ? 'border-blue-400/60 bg-blue-600/15 text-white' : 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'"
                @click="form.audience = 'customer'"
              >
                A specific customer
              </button>
            </div>
          </div>

          <div v-if="form.audience === 'customer'" class="flex flex-col gap-2">
            <div class="relative">
              <label class="text-xs font-semibold uppercase tracking-wider text-slate-400" for="dc-customer">
                User (type to search)
              </label>
              <input
                id="dc-customer"
                v-model="form.search"
                type="text"
                :disabled="!!form.customer"
                placeholder="Search by name or email…"
                class="mt-1.5 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/60 disabled:opacity-60"
                @input="searchCustomers"
              />
              <div
                v-if="form.results.length"
                class="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-white/10 bg-slate-900 shadow-xl"
              >
                <button
                  v-for="c in form.results"
                  :key="c.id"
                  type="button"
                  class="flex w-full flex-col px-4 py-2.5 text-left text-sm transition-colors hover:bg-white/10"
                  @click="pickCustomer(c)"
                >
                  <span class="font-semibold text-white">{{ c.firstname }} {{ c.surname }}</span>
                  <span class="text-xs text-slate-400">{{ c.email }}</span>
                </button>
              </div>
              <p v-else-if="form.searching" class="mt-1 text-xs text-slate-500">Searching…</p>
              <p v-else-if="form.search.length >= 2 && form.results.length === 0 && !form.searching && !form.customer" class="mt-1 text-xs text-slate-500">
                No users found.
              </p>
            </div>
            <div v-if="form.customer" class="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5">
              <p class="min-w-0 truncate text-sm text-slate-300">
                <span class="font-semibold text-white">{{ form.customer.firstname }} {{ form.customer.surname }}</span>
                · {{ form.customer.email }}
              </p>
              <button type="button" class="shrink-0 text-xs font-semibold text-red-300 hover:text-red-200" @click="clearCustomer">
                Change
              </button>
            </div>
            <label v-if="form.customer" class="flex items-start gap-3 rounded-lg border border-blue-400/20 bg-blue-600/10 px-4 py-3">
              <input v-model="form.emailCustomer" type="checkbox" class="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 accent-blue-500" />
              <span class="text-sm text-slate-300">
                Email this code to <span class="font-semibold text-white">{{ form.customer.firstname }}</span> at
                <span class="font-semibold text-white">{{ form.customer.email }}</span>
              </span>
            </label>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="flex flex-col gap-2">
              <p class="text-sm font-semibold text-slate-200">Discount</p>
              <div class="flex gap-2">
                <button
                  type="button"
                  class="flex-1 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors"
                  :class="form.type === 'percent' ? 'border-blue-400/60 bg-blue-600/15 text-white' : 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'"
                  @click="form.type = 'percent'"
                >
                  %
                </button>
                <button
                  type="button"
                  class="flex-1 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors"
                  :class="form.type === 'fixed' ? 'border-blue-400/60 bg-blue-600/15 text-white' : 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'"
                  @click="form.type = 'fixed'"
                >
                  £
                </button>
              </div>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-semibold text-slate-200" for="dc-value">
                {{ form.type === 'percent' ? 'Percent off (%)' : 'Amount off (£)' }}
              </label>
              <input
                id="dc-value"
                v-model="form.value"
                type="number"
                min="0"
                step="0.01"
                placeholder="10"
                class="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/60"
              />
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-semibold text-slate-200" for="dc-peruser">Uses per customer</label>
              <input
                id="dc-peruser"
                v-model="form.perUserLimit"
                type="number"
                min="1"
                step="1"
                placeholder="Unlimited"
                class="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/60"
              />
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-semibold text-slate-200" for="dc-maxuses">Max total uses</label>
              <input
                id="dc-maxuses"
                v-model="form.maxUses"
                type="number"
                min="1"
                step="1"
                placeholder="Unlimited"
                class="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/60"
              />
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-semibold text-slate-200" for="dc-from">Valid from</label>
              <input
                id="dc-from"
                v-model="form.validFrom"
                type="datetime-local"
                class="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/60"
              />
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-semibold text-slate-200" for="dc-to">Valid until</label>
              <input
                id="dc-to"
                v-model="form.validTo"
                type="datetime-local"
                class="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/60"
              />
            </div>
</div>

          <p class="text-xs text-slate-400">
            The code will be generated automatically when you create it.
          </p>
        </div>
        <div class="mt-6 flex justify-end gap-3">
          <button
            type="button"
            class="rounded-lg border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10"
            @click="createOpen = false"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="creating"
            class="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            @click="submit"
          >
            {{ creating ? 'Creating…' : 'Create discount' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Result / copy modal -->
    <div v-if="resultOpen && result" class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" @click.self="resultOpen = false">
      <div class="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 text-center">
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/15">
          <i class="fa-solid fa-check text-lg text-green-400" aria-hidden="true"></i>
        </div>
        <h3 class="mt-4 text-lg font-semibold text-white">Discount code created</h3>

        <div class="mt-5 rounded-xl border border-dashed border-green-400/40 bg-black/30 px-6 py-5">
          <p class="font-mono text-2xl font-black tracking-widest text-white">{{ result.code }}</p>
        </div>

        <div class="mt-5">
          <button
            type="button"
            class="w-full rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500"
            @click="copyCode"
          >
            {{ copied ? 'Copied!' : 'Copy code' }}
          </button>
        </div>

        <p
          v-if="result.email_sent && result.customer"
          class="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300"
        >
          Emailed to <span class="font-semibold">{{ result.customer.firstname }}</span> at
          <span class="font-semibold">{{ result.customer.email }}</span>
        </p>
        <p v-else-if="result.customer" class="mt-4 text-sm text-slate-400">
          Send this code to <span class="font-semibold text-slate-200">{{ result.customer.firstname }}</span> at
          <span class="font-semibold text-slate-200">{{ result.customer.email }}</span>
        </p>
        <p v-else class="mt-4 text-sm text-slate-400">Share this code anywhere you like — it's active now.</p>

        <button
          type="button"
          class="mt-5 rounded-lg border border-white/15 bg-white/5 px-6 py-2.5 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10"
          @click="resultOpen = false"
        >
          Done
        </button>
      </div>
    </div>

    <!-- Revoke modal -->
    <div v-if="revokeTarget" class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" @click.self="revokeTarget = null">
      <div class="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6">
        <h3 class="text-lg font-semibold text-white">Revoke discount code</h3>
        <p class="mt-1 text-sm text-slate-400">
          <span class="font-mono font-bold text-slate-200">{{ revokeTarget.code }}</span> will stop working immediately.
          No one will be emailed — the reason is recorded for your records only.
        </p>

        <p v-if="revokeErr" class="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {{ revokeErr }}
        </p>

        <div class="mt-5 flex flex-col gap-1.5">
          <label class="text-sm font-semibold text-slate-200" for="revoke-reason">Reason for revoking</label>
          <textarea
            id="revoke-reason"
            v-model="revokeReason"
            rows="3"
            maxlength="200"
            placeholder="e.g. customer abused it, internal misuse…"
            class="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-red-400/60"
          />
          <p class="text-right text-xs text-slate-500">{{ revokeReason.length }}/200</p>
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <button
            type="button"
            class="rounded-lg border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10"
            @click="revokeTarget = null"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="revoking"
            class="rounded-lg bg-red-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-600/30 transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
            @click="revoke"
          >
            {{ revoking ? 'Revoking…' : 'Revoke code' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>