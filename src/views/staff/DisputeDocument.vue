<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../../composables/useAuth'
import TransactionBlock, { type TxEvidence } from './parts/TransactionBlock.vue'

const { request } = useAuth()
const route = useRoute()
const router = useRouter()

interface LegalSection {
  title: string
  body: string
  points?: string[]
}

interface DisputeDocPayload {
  generated_at: string
  generated_by: { id: number; firstname: string; surname: string }
  account: {
    id: number
    firstname: string
    surname: string
    email: string
    created_at: string
    tos_agreed: boolean
  }
  dispute: { id: number; status: string; raised_at: string; settled_at: string | null; newly_raised: boolean }
  legal: {
    tos_updated_at: string
    tos_sections: LegalSection[]
    digital_policy_updated_at: string
    digital_policy_sections: LegalSection[]
  }
  transaction: TxEvidence
  disputed_history: (TxEvidence & {
    dispute: { id: number; status: string; raised_at: string; settled_at: string | null }
  })[]
  prior_statistics: { total: number; disputed: number }
  tickets: {
    id: number
    title: string
    status: string
    transaction_id: string | null
    created_at: string
    messages: {
      id: number
      user_id: number
      body: string
      is_note: number
      created_at: string
      sender_firstname: string
      sender_role: number | null
    }[]
  }[]
}

const doc = ref<DisputeDocPayload | null>(null)
const loading = ref(true)
const error = ref('')

function fmtDate(v: string): string {
  if (!v) return 'N/A'
  return new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDateTime(v: string | null): string {
  if (!v) return 'N/A'
  return new Date(v).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const accountName = computed(() =>
  doc.value ? [doc.value.account.firstname, doc.value.account.surname].filter(Boolean).join(' ').trim() : ''
)

const priorSentence = computed(() => {
  if (!doc.value) return ''
  const n = doc.value.prior_statistics.total
  return `The user has previously made ${n} transaction${n === 1 ? '' : 's'} on our website, none of which have ever been disputed`
})

const pages = computed(() => {
  if (!doc.value) return []
  return [
    { key: 'page1', heading: 'Customer account details' },
    { key: 'page2', heading: 'Transaction under dispute' },
    { key: 'page3', heading: 'Dispute history' },
    { key: 'page4', heading: 'Support and ticket contact' },
    { key: 'page5', heading: 'Terms of Service as at the time of the transaction' },
    { key: 'page6', heading: 'Digital Products, Cancellation & Refunds policy' },
  ]
})

onMounted(async () => {
  const cached = sessionStorage.getItem('kgm_dispute_doc')
  if (cached) {
    try {
      doc.value = JSON.parse(cached) as DisputeDocPayload
      loading.value = false
      sessionStorage.removeItem('kgm_dispute_doc')
      return
    } catch {
      sessionStorage.removeItem('kgm_dispute_doc')
    }
  }
  const userId = route.query.user_id
  const purchaseId = route.query.purchase_id
  if (!userId || !purchaseId) {
    error.value = 'Missing user or transaction reference'
    loading.value = false
    return
  }
  try {
    doc.value = await request<DisputeDocPayload>(
      `/api/staff/disputes/document?user_id=${encodeURIComponent(String(userId))}&purchase_id=${encodeURIComponent(String(purchaseId))}`
    )
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load document'
  } finally {
    loading.value = false
  }
})

function printDoc() {
  window.print()
}
</script>

<template>
  <section class="mx-auto w-full max-w-4xl">
    <div class="toolbar mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
      <h2 class="text-2xl font-bold tracking-tight text-white">Dispute document</h2>
      <div class="flex items-center gap-3">
        <button
          class="rounded-lg border border-white/15 px-5 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10"
          @click="router.push({ name: 'StaffDisputes' })"
        >
          Back
        </button>
        <button
          class="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500"
          @click="printDoc"
        >
          Print / Save as PDF
        </button>
      </div>
    </div>

    <p v-if="loading" class="py-12 text-center text-sm text-slate-400">Building document...</p>
    <p v-else-if="error" class="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
      {{ error }}
    </p>

    <div v-else-if="doc" class="space-y-6 print:space-y-0">
      <div v-for="pg in pages" :key="pg.key" class="sheet">
        <div class="sheet-head">
          <div class="flex items-center gap-3">
            <div>
              <p class="text-[13px] font-bold tracking-wide text-slate-900">KGM CLOUD</p>
              <p class="text-[11px] text-slate-500">Dispute Evidence pack</p>
            </div>
          </div>
          <div class="text-right text-[11px] text-slate-500">
            <p>Generated {{ fmtDateTime(doc.generated_at) }}</p>
          </div>
        </div>

        <h2 class="mt-5 text-lg font-bold text-slate-900">{{ pg.heading }}</h2>

        <div v-if="pg.key === 'page1'">
          <p class="mt-1 text-[13px] text-slate-600">
            Customer {{ accountName }} (account ID {{ doc.account.id }}) in relation to transaction
            {{ doc.transaction.transactionid }}.
          </p>
          <table class="mt-4 w-full border-collapse text-[13px]">
            <tbody>
              <tr>
                <td class="w-52 py-1.5 pr-4 font-semibold text-slate-600 align-top">Name</td>
                <td class="py-1.5 font-semibold text-slate-900">{{ accountName }}</td>
              </tr>
              <tr>
                <td class="py-1.5 pr-4 font-semibold text-slate-600 align-top">Email</td>
                <td class="py-1.5 text-slate-900">{{ doc.account.email }}</td>
              </tr>
              <tr>
                <td class="py-1.5 pr-4 font-semibold text-slate-600 align-top">Account creation date</td>
                <td class="py-1.5 text-slate-900">{{ fmtDateTime(doc.account.created_at) }}</td>
              </tr>
              <tr>
                <td class="py-1.5 pr-4 font-semibold text-slate-600 align-top">Agreed to Terms at account creation</td>
                <td class="py-1.5 font-semibold" :class="doc.account.tos_agreed ? 'text-emerald-700' : 'text-red-700'">
                  {{ doc.account.tos_agreed ? 'Yes' : 'No' }}
                </td>
              </tr>
              <tr>
                <td class="py-1.5 pr-4 font-semibold text-slate-600 align-top">Last time the Terms were updated</td>
                <td class="py-1.5 text-slate-900">{{ fmtDate(doc.legal.tos_updated_at) }}</td>
              </tr>
            </tbody>
          </table>
          <p class="mt-4 text-[12px] text-slate-500">
            Dispute status:
            <span class="font-semibold uppercase text-slate-800">{{ doc.dispute.status }}</span>
            <template v-if="doc.dispute.status === 'settled'"> (settled {{ fmtDateTime(doc.dispute.settled_at) }})</template>
          </p>
        </div>

        <div v-else-if="pg.key === 'page2'" class="mt-4">
          <TransactionBlock title="Transaction under dispute" :tx="doc.transaction" />
        </div>

        <div v-else-if="pg.key === 'page3'" class="mt-4">
          <template v-if="doc.disputed_history.length">
            <p class="text-[13px] text-slate-600">
              The user has {{ doc.prior_statistics.total }}
              previous transaction{{ doc.prior_statistics.total === 1 ? '' : 's' }},
              of which {{ doc.disputed_history.length }} previously disputed transaction
              {{ doc.disputed_history.length === 1 ? '' : 's' }}. Details of the previous disputed transaction
              {{ doc.disputed_history.length === 1 ? '' : 's' }}:
            </p>
            <div
              v-for="pd in doc.disputed_history"
              :key="pd.purchase_id"
              class="avoid-break mt-5 border-t border-slate-300 pt-4"
            >
              <p class="mb-3 text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                Previously disputed transaction {{ pd.transactionid }} -
                status: <span class="text-slate-800">{{ pd.dispute.status }}</span>
                (raised {{ fmtDateTime(pd.dispute.raised_at) }}{{
                  pd.dispute.status === 'settled' ? `, settled ${fmtDateTime(pd.dispute.settled_at)}` : ''
                }})
              </p>
              <TransactionBlock title="Previous disputed transaction" :tx="pd" :key="`tb-${pd.purchase_id}`" />
            </div>
          </template>
          <template v-else>
            <p class="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-[13px] text-slate-800">
              {{ priorSentence }}.
            </p>
          </template>
        </div>

        <div v-else-if="pg.key === 'page4'" class="mt-4">
          <template v-if="doc.tickets.length">
            <p class="text-[13px] text-slate-600">
              Support tickets raised in relation to {{ doc.transaction.transactionid }}:
            </p>
            <div
              v-for="t in doc.tickets"
              :key="t.id"
              class="avoid-break mt-5 border-t border-slate-300 pt-4"
            >
              <div class="flex flex-wrap items-center gap-3">
                <h3 class="text-[13px] font-bold text-slate-900">#{{ t.id }} - {{ t.title }}</h3>
                <span class="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                  {{ t.status }}
                </span>
                <span class="text-[11px] text-slate-500">{{ fmtDateTime(t.created_at) }}</span>
              </div>
              <div class="mt-3 space-y-3">
                <div
                  v-for="m in t.messages"
                  :key="m.id"
                  class="avoid-break rounded-lg border border-slate-200 p-3"
                  :class="m.is_note ? 'bg-slate-50' : 'bg-white'"
                >
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <p class="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      {{ m.sender_firstname }}
                      <span
                        class="ml-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
                        :class="
                          m.sender_role != null
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        "
                      >
                        {{ m.sender_role != null ? 'staff' : 'customer' }}
                      </span>
                      <span v-if="m.is_note" class="ml-1 rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-violet-800">
                        note
                      </span>
                    </p>
                    <span class="text-[11px] text-slate-500">{{ fmtDateTime(m.created_at) }}</span>
                  </div>
                  <div class="mt-2 text-[13px] leading-relaxed text-slate-800" v-html="m.body"></div>
                </div>
              </div>
            </div>
          </template>
          <template v-else>
            <p class="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-[13px] text-slate-800">
              The user has not raised any support or ticket contact in relation to the disputed transaction.
            </p>
          </template>
        </div>

        <div v-else-if="pg.key === 'page5'">
          <p class="mt-1 text-[13px] text-slate-600">
            The Terms of Service in force at the time of the transaction were last updated
            <span class="font-semibold">{{ fmtDate(doc.legal.tos_updated_at) }}</span>. The terms were:
          </p>
          <div class="mt-4 space-y-3">
            <div
              v-for="s in doc.legal.tos_sections"
              :key="s.title"
              class="avoid-break rounded-lg border border-slate-200 p-3"
            >
              <h4 class="text-[13px] font-bold text-slate-900">{{ s.title }}</h4>
              <p class="mt-1 text-[12px] leading-relaxed text-slate-700">{{ s.body }}</p>
              <ul v-if="s.points" class="mt-1.5 space-y-1 text-[12px] text-slate-700">
                <li v-for="p in s.points" :key="p" class="flex items-start gap-2">
                  <span class="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-slate-400"></span>
                  <span>{{ p }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div v-else-if="pg.key === 'page6'">
          <p class="mt-1 text-[13px] text-slate-600">
            The Digital Products, Cancellation &amp; Refunds policy in force at the time of the transaction was last
            updated <span class="font-semibold">{{ fmtDate(doc.legal.digital_policy_updated_at) }}</span>.
            At checkout the customer gave express consent to immediate supply and waived the 14-day cooling-off period
            (see Page 2), in accordance with the following policy:
          </p>
          <div class="mt-4 space-y-3">
            <div
              v-for="s in doc.legal.digital_policy_sections"
              :key="s.title"
              class="avoid-break rounded-lg border border-slate-200 p-3"
            >
              <h4 class="text-[13px] font-bold text-slate-900">{{ s.title }}</h4>
              <p class="mt-1 text-[12px] leading-relaxed text-slate-700">{{ s.body }}</p>
              <ul v-if="s.points" class="mt-1.5 space-y-1 text-[12px] text-slate-700">
                <li v-for="p in s.points" :key="p" class="flex items-start gap-2">
                  <span class="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-slate-400"></span>
                  <span>{{ p }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div class="sheet-foot">
          Generated by {{ doc.generated_by.firstname }} {{ doc.generated_by.surname }} on
          {{ fmtDateTime(doc.generated_at) }}.
        </div>
      </div>
    </div>
  </section>
</template>

<style>
.sheet {
  background: #ffffff;
  color: #0f172a;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 14px;
  padding: 28px 32px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
}

.sheet-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 14px;
  border-bottom: 2px solid #cbd5e1;
}

.sheet-foot {
  margin-top: 20px;
  padding-top: 10px;
  border-top: 1px solid #e2e8f0;
  font-size: 11px;
  color: #64748b;
}

@page {
  size: A4;
  margin: 10mm;
}

.toolbar {
  position: relative;
  z-index: 10;
}

@media print {
  html,
  body {
    background: #ffffff !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .toolbar {
    display: none !important;
  }

  .sheet {
    box-shadow: none !important;
    border: none !important;
    border-radius: 0 !important;
    padding: 0;
    min-height: 0;
    page-break-after: always;
    break-after: page;
  }

  .sheet:last-child {
    page-break-after: auto;
    break-after: auto;
  }

  .sheet-head {
    border-bottom: 2px solid #475569;
    page-break-after: avoid;
    break-after: avoid;
  }

  .avoid-break {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .sheet h2,
  .sheet h3,
  .sheet h4 {
    page-break-after: avoid;
    break-after: avoid;
  }

  .sheet table tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .sheet ul li {
    break-inside: avoid;
    page-break-inside: avoid;
  }
}
</style>