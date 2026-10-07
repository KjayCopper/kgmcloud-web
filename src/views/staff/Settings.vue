<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuth } from '../../composables/useAuth'

const { request } = useAuth()

const vatEnabled = ref(false)
const vatRate = ref(20)
const vatRates = ref<Record<string, number>>({})
const staffDiscountPercent = ref(0)
const loading = ref(true)
const saving = ref(false)
const refreshing = ref(false)
const msg = ref('')
const err = ref('')

const rows = computed(() =>
  Object.entries(vatRates.value)
    .sort(([a], [b]) => (a === 'GB' ? -1 : b === 'GB' ? 1 : a.localeCompare(b)))
    .map(([code, rate]) => ({ code, rate }))
)

async function loadSettings() {
  loading.value = true
  err.value = ''
  try {
    const s = await request<{
      vat_enabled: boolean
      vat_rate: number
      vat_rates: Record<string, number>
      staff_discount_percent: number
    }>('/api/settings')
    vatEnabled.value = !!s.vat_enabled
    vatRate.value = Number(s.vat_rate) || 20
    vatRates.value = s.vat_rates && typeof s.vat_rates === 'object' ? s.vat_rates : {}
    staffDiscountPercent.value = Number(s.staff_discount_percent) || 0
  } catch (e) {
    err.value = e instanceof Error ? e.message : 'Failed to load settings'
  } finally {
    loading.value = false
  }
}

async function save() {
  if (saving.value) return
  saving.value = true
  msg.value = ''
  err.value = ''
  try {
    const s = await request<{ vat_enabled: boolean; vat_rate: number }>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify({ vat_enabled: vatEnabled.value, vat_rate: Number(vatRate.value) || 20, staff_discount_percent: Number(staffDiscountPercent.value) || 0 }),
    })
    vatEnabled.value = !!s.vat_enabled
    vatRate.value = Number(s.vat_rate) || 20
    msg.value = 'Settings saved.'
  } catch (e) {
    err.value = e instanceof Error ? e.message : 'Failed to save settings'
  } finally {
    saving.value = false
  }
}

async function refreshRates() {
  if (refreshing.value) return
  refreshing.value = true
  msg.value = ''
  err.value = ''
  try {
    const s = await request<{ vat_rates: Record<string, number> }>('/api/settings/refresh-vat-rates', {
      method: 'POST',
    })
    vatRates.value = s.vat_rates && typeof s.vat_rates === 'object' ? s.vat_rates : {}
    msg.value = 'VAT rates refreshed from euvatrates.com.'
  } catch (e) {
    err.value = e instanceof Error ? e.message : 'Failed to refresh rates'
  } finally {
    refreshing.value = false
  }
}

onMounted(loadSettings)
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-sm font-semibold uppercase tracking-widest text-blue-400">Administration</p>
        <h2 class="mt-2 text-3xl font-bold tracking-tight text-white lg:text-4xl">Settings</h2>
        <p class="mt-1 text-xs text-slate-500">Store-wide configuration</p>
      </div>
    </div>

    <p v-if="err" class="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
      {{ err }}
    </p>
    <p v-if="msg" class="mt-4 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-300">
      {{ msg }}
    </p>

    <div class="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
      <h3 class="text-lg font-semibold text-white">VAT on store prices</h3>
      <p class="mt-1 text-sm text-slate-400">
        Master switch for charging VAT. When off, no VAT is applied anywhere. When on, the rate for the
        customer's country is applied automatically at checkout.
      </p>

      <div class="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/20 p-4">
        <div>
          <p class="text-sm font-semibold text-white">{{ vatEnabled ? 'VAT is on' : 'VAT is off' }}</p>
          <p class="mt-0.5 text-xs text-slate-400">
            {{ vatEnabled ? 'Customers see VAT applied based on their country.' : 'Prices are shown without VAT until you are registered.' }}
          </p>
        </div>
        <button
          type="button"
          :disabled="saving"
          class="flex items-center gap-3 rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          @click="vatEnabled = !vatEnabled"
        >
          <span class="relative inline-flex h-5 w-9 items-center rounded-full bg-white/10 transition-colors" :class="vatEnabled ? 'bg-green-500/80' : ''">
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
              :class="vatEnabled ? 'translate-x-4' : 'translate-x-0.5'"
            ></span>
          </span>
          <span>{{ vatEnabled ? 'On' : 'Off' }}</span>
        </button>
      </div>

      <div class="mt-5 flex flex-col gap-1.5">
        <label for="uk-rate" class="text-sm font-semibold text-slate-200">UK standard rate (%)</label>
        <input
          id="uk-rate"
          v-model="vatRate"
          type="number"
          min="0"
          max="100"
          step="0.1"
          class="w-full max-w-[10rem] rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/60"
        />
      </div>

      <div class="mt-6">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h4 class="text-sm font-semibold text-white">Standard rates by country</h4>
            <p class="mt-0.5 text-xs text-slate-400">
              Auto-maintained from euvatrates.com plus a built-in list for major non-EU markets. Applied
              automatically at checkout when VAT is on. Countries not listed are charged no VAT.
            </p>
          </div>
          <button
            type="button"
            :disabled="refreshing"
            class="shrink-0 rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            @click="refreshRates"
          >
            {{ refreshing ? 'Refreshing…' : 'Refresh rates' }}
          </button>
        </div>

        <div class="mt-3 overflow-hidden rounded-xl border border-white/10">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-white/10 bg-white/5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th class="px-4 py-3">Country</th>
                <th class="px-4 py-3 text-right">Rate</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/10">
              <tr v-if="loading">
                <td colspan="2" class="px-4 py-6 text-center text-slate-400">Loading…</td>
              </tr>
              <tr v-for="row in rows" :key="row.code">
                <td class="px-4 py-2.5 font-semibold text-white">{{ row.code }}</td>
                <td class="px-4 py-2.5 text-right text-slate-300">
                  {{ row.code === 'GB' ? vatRate : row.rate }}%
                </td>
              </tr>
              <tr v-if="!loading && rows.length === 0">
                <td colspan="2" class="px-4 py-6 text-center text-slate-400">
                  No rates yet — hit “Refresh rates” to fetch them.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <button
        type="button"
        :disabled="saving || loading"
        class="mt-6 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        @click="save"
      >
        {{ saving ? 'Saving…' : 'Save changes' }}
      </button>
    </div>

    <div class="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
      <h3 class="text-lg font-semibold text-white">Staff discount</h3>
      <p class="mt-1 text-sm text-slate-400">
        Percentage auto-applied to staff members' orders at checkout. It appears as a line they can remove —
        set to 0 to disable. A manually entered discount code saves more, it overrides this.
      </p>

      <div class="mt-5 flex flex-col gap-1.5">
        <label for="staff-discount" class="text-sm font-semibold text-slate-200">Staff discount (%)</label>
        <input
          id="staff-discount"
          v-model="staffDiscountPercent"
          type="number"
          min="0"
          max="100"
          step="0.5"
          class="w-full max-w-[10rem] rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/60"
        />
      </div>

      <button
        type="button"
        :disabled="saving || loading"
        class="mt-6 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        @click="save"
      >
        {{ saving ? 'Saving…' : 'Save changes' }}
      </button>
    </div>
  </div>
</template>