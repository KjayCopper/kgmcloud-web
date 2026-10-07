<script setup lang="ts">
import { ref } from 'vue'
import { formatMoney, downloadInvoicePdf, type Invoice, type InvoiceCustomer } from '../../lib/invoicePdf'

const props = defineProps<{
  invoice: Invoice
  customer: InvoiceCustomer
}>()

const exporting = ref(false)

function fmtDate(value: string): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function exportPdf() {
  if (exporting.value) return
  exporting.value = true
  setTimeout(() => {
    downloadInvoicePdf(props.invoice, props.customer)
    exporting.value = false
  }, 50)
}
</script>

<template>
  <div class="overflow-hidden rounded-2xl border border-white/10 bg-white text-slate-800 shadow-2xl shadow-black/40">
    <div class="h-2 bg-[#0f2857]"></div>

    <div class="p-6 sm:p-8">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-2xl font-black tracking-tight text-[#0f2857]">KGM CLOUD</p>
          <p class="mt-0.5 text-xs text-slate-500">kgmcloud.co.uk</p>
        </div>
        <div class="text-right">
          <p class="text-3xl font-black tracking-tight text-[#0f2857]">INVOICE</p>
          <p class="mt-1 text-xs font-semibold text-emerald-600">Status: Paid</p>
        </div>
      </div>

      <div class="mt-8 flex flex-wrap justify-between gap-6">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Billed to</p>
          <p class="mt-1 text-sm font-semibold text-slate-800">{{ customer.name }}</p>
          <p class="text-xs text-slate-500">{{ customer.email }}</p>
        </div>
        <div class="text-sm sm:text-right">
          <p><span class="text-slate-400">Invoice no.</span> <span class="font-semibold">{{ invoice.transactionid }}</span></p>
          <p class="mt-1"><span class="text-slate-400">Date</span> <span class="font-medium">{{ fmtDate(invoice.purchase_datetime) }}</span></p>
        </div>
      </div>

      <table class="mt-8 w-full border-collapse">
        <thead>
          <tr class="bg-slate-100 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <th class="rounded-l-md py-2.5 pl-4">Item</th>
            <th class="py-2.5 text-center">Qty</th>
            <th class="rounded-r-md py-2.5 pr-4 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, i) in invoice.items" :key="item.product_id" :class="i % 2 === 1 ? 'bg-slate-50' : ''">
            <td class="py-3 pl-4 text-sm font-medium text-slate-800">{{ item.name }}</td>
            <td class="py-3 text-center text-sm text-slate-600">{{ item.qty }}</td>
            <td class="py-3 pr-4 text-right text-sm font-semibold text-slate-800">
              {{ formatMoney(item.price * item.qty, invoice.currency) }}
            </td>
          </tr>
        </tbody>
      </table>

      <div class="mt-6 flex justify-end">
        <div class="w-full max-w-[260px]">
          <div
            v-if="Number(invoice.discount) > 0"
            class="flex items-center justify-between border-b border-slate-200 py-2 text-sm"
          >
            <span class="text-slate-500">Subtotal</span>
            <span class="font-semibold text-slate-800">{{ formatMoney(invoice.subtotal ?? 0, invoice.currency) }}</span>
          </div>
          <div
            v-if="Number(invoice.discount) > 0"
            class="flex items-center justify-between border-b border-slate-200 py-2 text-sm"
          >
            <span class="text-slate-500">Discount</span>
            <span class="font-semibold text-emerald-600">-{{ formatMoney(Number(invoice.discount), invoice.currency) }}</span>
          </div>
          <div class="flex items-center justify-between rounded-lg bg-[#0f2857] px-5 py-3 text-white">
            <span class="text-xs font-bold uppercase tracking-widest opacity-80">Total</span>
            <span class="text-lg font-bold">{{ formatMoney(invoice.total, invoice.currency) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:px-8">
      <p class="text-xs text-slate-400">Invoice {{ invoice.transactionid }} · Thank you for your purchase!</p>
      <button
        :disabled="exporting"
        class="rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        @click="exportPdf"
      >
        {{ exporting ? 'Exporting…' : 'Export PDF' }}
      </button>
    </div>
  </div>
</template>