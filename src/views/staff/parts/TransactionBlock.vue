<script setup lang="ts">
import { computed } from 'vue'

export interface TxKey {
  product_id: number
  product_name: string
  license_key: string
  status: string
}

export interface TxEvidence {
  purchase_id: number
  transactionid: string
  sumup_transaction: string | null
  date: string
  country: string | null
  vat_rate: number | null
  vat_amount: number | null
  items: { product_id: number; name: string; price: number; qty: number }[]
  license_keys: TxKey[]
  subtotal: number
  discount: { code: string; percent: number | null; amount: number | null } | null
  total: number
  currency: string
  digital_consent: boolean
  digital_consent_at: string | null
  digital_consent_ip: string | null
}

const props = defineProps<{ title: string; tx: TxEvidence }>()

function gbp(n: number | null | undefined): string {
  return `£${Number(n || 0).toFixed(2)}`
}

function fmtDateTime(v: string | null | undefined): string {
  if (!v) return 'N/A'
  return new Date(v).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const subtotalLabel = computed(() => {
  if (props.tx.subtotal === props.tx.total) return null
  return gbp(props.tx.subtotal)
})
</script>

<template>
  <div>
    <h3 class="text-[15px] font-bold uppercase tracking-wide text-slate-900">{{ title }}</h3>
    <table class="mt-3 w-full border-collapse text-[13px]">
      <tbody>
        <tr>
          <td class="w-52 py-1.5 pr-4 font-semibold text-slate-600 align-top">Transaction number</td>
          <td class="py-1.5 font-mono text-slate-900">{{ tx.transactionid }}</td>
        </tr>
        <tr>
          <td class="py-1.5 pr-4 font-semibold text-slate-600 align-top">SumUp transaction number</td>
          <td class="py-1.5 font-mono text-slate-900">{{ tx.sumup_transaction || 'N/A' }}</td>
        </tr>
        <tr>
          <td class="py-1.5 pr-4 font-semibold text-slate-600 align-top">Date of transaction</td>
          <td class="py-1.5 text-slate-900">{{ fmtDateTime(tx.date) }}</td>
        </tr>
        <tr>
          <td class="py-1.5 pr-4 font-semibold text-slate-600 align-top">Transaction amount</td>
          <td class="py-1.5 font-semibold text-slate-900">{{ gbp(tx.total) }} {{ tx.currency }}</td>
        </tr>
      </tbody>
    </table>

    <h4 class="mt-4 text-[12px] font-bold uppercase tracking-wide text-slate-500">Items purchased</h4>
    <table class="mt-2 w-full border-collapse text-[13px]">
      <thead>
        <tr class="border-b border-slate-300 text-left">
          <th class="py-1.5 pr-4 font-semibold text-slate-600">Item</th>
          <th class="py-1.5 pr-4 text-right font-semibold text-slate-600">Qty</th>
          <th class="py-1.5 text-right font-semibold text-slate-600">Price</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(it, i) in tx.items" :key="`${it.product_id}-${i}`" class="border-b border-slate-200">
          <td class="py-1.5 pr-4 text-slate-900">{{ it.name }}</td>
          <td class="py-1.5 pr-4 text-right text-slate-900">{{ it.qty }}</td>
          <td class="py-1.5 text-right text-slate-900">{{ gbp(it.price) }}</td>
        </tr>
        <tr v-if="!tx.items.length">
          <td colspan="3" class="py-1.5 text-slate-500">No item breakdown available</td>
        </tr>
      </tbody>
    </table>

    <div class="mt-3 flex flex-col items-end gap-0.5 text-[13px]">
      <div v-if="subtotalLabel" class="flex gap-6 text-slate-700">
        <span>Subtotal</span>
        <span class="w-24 text-right">{{ subtotalLabel }}</span>
      </div>
      <div v-if="tx.discount" class="flex gap-6 font-medium text-slate-800">
        <span>Discount ({{ tx.discount.code }}){{ tx.discount.percent != null ? ` ${tx.discount.percent}%` : '' }}</span>
        <span class="w-24 text-right">-{{ gbp(tx.discount.amount) }}</span>
      </div>
      <div v-if="tx.vat_amount != null" class="flex gap-6 text-slate-700">
        <span>VAT ({{ tx.vat_rate }}%)</span>
        <span class="w-24 text-right">{{ gbp(tx.vat_amount) }}</span>
      </div>
      <div class="flex gap-6 border-t border-slate-300 pt-1 font-bold text-slate-900">
        <span>Total paid</span>
        <span class="w-24 text-right">{{ gbp(tx.total) }} {{ tx.currency }}</span>
      </div>
    </div>

    <h4 class="mt-4 text-[12px] font-bold uppercase tracking-wide text-slate-500">Licence keys</h4>
    <table v-if="tx.license_keys.length" class="mt-2 w-full border-collapse text-[12px]">
      <thead>
        <tr class="border-b border-slate-300 text-left">
          <th class="py-1.5 pr-4 font-semibold text-slate-600">Product</th>
          <th class="py-1.5 font-semibold text-slate-600">Licence key</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="k in tx.license_keys" :key="k.license_key" class="border-b border-slate-200">
          <td class="py-1.5 pr-4 text-slate-900">{{ k.product_name }}</td>
          <td class="py-1.5 font-mono text-slate-900">{{ k.license_key }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else class="mt-2 text-[13px] text-slate-600">No licenced products on this transaction.</p>

    <h4 class="mt-4 text-[12px] font-bold uppercase tracking-wide text-slate-500">
      Digital delivery consent (14-day cooling-off waiver)
    </h4>
    <table class="mt-2 w-full border-collapse text-[13px]">
      <tbody>
        <tr>
          <td class="w-52 py-1.5 pr-4 font-semibold text-slate-600 align-top">Agreed to immediate supply and waiver</td>
          <td class="py-1.5 font-semibold" :class="tx.digital_consent ? 'text-emerald-700' : 'text-red-700'">
            {{ tx.digital_consent ? 'Yes' : 'No' }}
          </td>
        </tr>
        <tr v-if="tx.digital_consent">
          <td class="py-1.5 pr-4 font-semibold text-slate-600 align-top">When they agreed</td>
          <td class="py-1.5 text-slate-900">{{ fmtDateTime(tx.digital_consent_at) }}</td>
        </tr>
        <tr v-if="tx.digital_consent">
          <td class="py-1.5 pr-4 font-semibold text-slate-600 align-top">IP at the time they agreed</td>
          <td class="py-1.5 font-mono text-slate-900">{{ tx.digital_consent_ip || 'N/A' }}</td>
        </tr>
        <tr v-if="tx.country">
          <td class="py-1.5 pr-4 font-semibold text-slate-600 align-top">Purchase country</td>
          <td class="py-1.5 text-slate-900">{{ tx.country }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>