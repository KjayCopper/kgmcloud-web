<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuth } from '../../composables/useAuth'

interface Purchase {
  transactionid: string
  item_names: string
  amount: string
  currency: string
  purchase_datetime: string
}

interface License {
  license_key: string
  product_name: string
  status: string
  created_at: string
}

interface CustomerDetail {
  id: number
  firstname: string
  email: string
  email_verified: number
  created_at: string
  purchases: Purchase[]
  licenses: License[]
}

const props = defineProps<{ id: string }>()

const { request } = useAuth()
const detail = ref<CustomerDetail | null>(null)
const loading = ref(true)
const error = ref('')

const totalSpent = computed(() =>
  detail.value?.purchases.reduce((sum, p) => sum + Number(p.amount || 0), 0) ?? 0
)

onMounted(async () => {
  try {
    detail.value = await request<CustomerDetail>(`/api/staff/customers/${props.id}`)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load account'
  } finally {
    loading.value = false
  }
})

function currency(value: string, code: string) {
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: code || 'GBP' }).format(Number(value) || 0)
  } catch {
    return `${code || 'GBP'} ${value}`
  }
}
</script>

<template>
  <div>
    <div v-if="loading" class="space-y-4">
      <div class="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/5"></div>
      <div class="h-48 animate-pulse rounded-2xl border border-white/10 bg-white/5"></div>
    </div>

    <div v-else-if="error || !detail" class="rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-12 text-center">
      <p class="text-sm font-semibold text-red-300">{{ error || 'Account not found' }}</p>
    </div>

    <template v-else>
      <RouterLink to="/staff/customers" class="text-sm font-semibold text-blue-400 hover:text-blue-300">
        ← Back to customers
      </RouterLink>

      <div class="mt-4 flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-6">
        <span class="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/30 text-2xl font-bold text-blue-200">
          {{ detail.firstname?.[0] ?? '?' }}
        </span>
        <div class="min-w-0">
          <h2 class="text-3xl font-bold tracking-tight text-white">
            {{ detail.firstname }}
            <span class="text-lg font-normal text-slate-500">account #{{ detail.id }}</span>
          </h2>
          <p class="mt-1 truncate text-sm text-slate-300">{{ detail.email }}</p>
          <div class="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span
              class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              :class="detail.email_verified ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'"
            >
              {{ detail.email_verified ? 'Verified' : 'Not verified' }}
            </span>
            <span class="text-slate-500">Joined {{ new Date(detail.created_at).toLocaleDateString() }}</span>
          </div>
        </div>
      </div>

      <div class="mt-8 grid gap-4 sm:grid-cols-3">
        <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p class="text-sm font-semibold text-slate-400">Purchases</p>
          <p class="mt-2 text-4xl font-bold text-white">{{ detail.purchases.length }}</p>
        </div>
        <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p class="text-sm font-semibold text-slate-400">Total spent</p>
          <p class="mt-2 text-4xl font-bold text-white">{{ currency(String(totalSpent.toFixed(2)), 'GBP') }}</p>
        </div>
        <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p class="text-sm font-semibold text-slate-400">Licenses</p>
          <p class="mt-2 text-4xl font-bold text-white">{{ detail.licenses.length }}</p>
        </div>
      </div>

      <div class="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h3 class="text-2xl font-semibold tracking-tight text-white lg:text-3xl">Purchases</h3>
          <div class="mt-4 flex flex-col gap-3">
            <div
              v-for="purchase in detail.purchases"
              :key="purchase.transactionid"
              class="rounded-xl border border-white/10 bg-white/5 px-5 py-3.5"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="text-xs font-mono text-slate-400">{{ purchase.transactionid }}</span>
                <span class="text-sm font-bold text-white">{{ currency(purchase.amount, purchase.currency) }}</span>
              </div>
              <p class="mt-1 text-sm text-slate-300">{{ purchase.item_names }}</p>
              <p class="mt-1 text-xs text-slate-500">{{ new Date(purchase.purchase_datetime).toLocaleString() }}</p>
            </div>
            <p v-if="detail.purchases.length === 0" class="rounded-xl border border-dashed border-white/15 px-5 py-6 text-center text-sm text-slate-500">
              No purchases yet.
            </p>
          </div>
        </div>

        <div>
          <h3 class="text-2xl font-semibold tracking-tight text-white lg:text-3xl">Licenses</h3>
          <div class="mt-4 flex flex-col gap-3">
            <div
              v-for="license in detail.licenses"
              :key="license.license_key"
              class="rounded-xl border border-white/10 bg-white/5 px-5 py-3.5"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="text-xs font-mono text-slate-400">{{ license.license_key }}</span>
                <span
                  class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                  :class="license.status === 'active' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'"
                >
                  {{ license.status }}
                </span>
              </div>
              <p class="mt-1 text-sm text-slate-300">{{ license.product_name }}</p>
              <p class="mt-1 text-xs text-slate-500">Issued {{ new Date(license.created_at).toLocaleDateString() }}</p>
            </div>
            <p v-if="detail.licenses.length === 0" class="rounded-xl border border-dashed border-white/15 px-5 py-6 text-center text-sm text-slate-500">
              No licenses yet.
            </p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>