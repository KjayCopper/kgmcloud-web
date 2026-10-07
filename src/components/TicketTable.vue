<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useAuth } from '../composables/useAuth'

interface Props {
  title: string
  team: string
  teamId?: number
  from?: string
}

const props = withDefaults(defineProps<Props>(), { from: 'tickets', teamId: 1 })

interface Ticket {
  id: number
  title: string
  status: 'awaiting_cx' | 'open' | 'awaiting_customer' | 'resolved' | 'closed'
  team_id: number
  created_at: string
  updated_at: string
  customer_firstname: string
  customer_email: string
  last_staff_user_id: number | null
  last_staff_firstname: string | null
  last_staff_reply_at: string | null
}

const { request } = useAuth()

const tickets = ref<Ticket[]>([])
const loading = ref(true)
const err = ref('')
const refreshing = ref(false)

const statusStyles: Record<Ticket['status'], string> = {
  awaiting_cx: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  open: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  awaiting_customer: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  resolved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  closed: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
}

const statusLabel: Record<Ticket['status'], string> = {
  awaiting_cx: 'Awaiting CX',
  open: 'Open',
  awaiting_customer: 'Awaiting Customer',
  resolved: 'Resolved',
  closed: 'Closed',
}

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function loadTickets() {
  try {
    const res = (await request<{ tickets: Ticket[] }>(`/api/staff/tickets?team=${props.teamId}`)) as {
      tickets: Ticket[]
    }
    tickets.value = res.tickets || []
  } catch (e) {
    err.value = e instanceof Error ? e.message : 'Failed to load tickets'
  } finally {
    loading.value = false
  }
}

let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  loadTickets()
  timer = setInterval(loadTickets, 10000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-sm font-semibold uppercase tracking-widest text-blue-400">{{ team }}</p>
        <h2 class="mt-2 text-3xl font-bold tracking-tight text-white lg:text-4xl">{{ title }}</h2>
      </div>
      <button
        type="button"
        :disabled="refreshing"
        class="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        @click="async () => { refreshing = true; try { await loadTickets() } finally { refreshing = false } }"
      >
        {{ refreshing ? 'Refreshing…' : 'Refresh' }}
      </button>
    </div>

    <p v-if="err" class="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
      {{ err }}
    </p>

    <div v-if="loading" class="mt-6 space-y-3">
      <div v-for="i in 4" :key="i" class="h-14 animate-pulse rounded-xl border border-white/10 bg-white/5"></div>
    </div>

    <div v-else-if="!err" class="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr class="border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
              <th class="w-40 px-5 py-3.5 font-semibold">Customer Name</th>
              <th class="w-[38%] px-5 py-3.5 font-semibold">Subject</th>
              <th class="w-20 px-5 py-3.5 text-center font-semibold">Status</th>
              <th class="w-28 px-5 py-3.5 text-center font-semibold">Last staff to reply</th>
              <th class="w-24 px-5 py-3.5 text-center font-semibold">Last reply</th>
              <th class="w-28 px-5 py-3.5 text-center font-semibold">View</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="t in tickets"
              :key="t.id"
              class="border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.03]"
            >
              <td class="px-5 py-4">
                <p class="font-semibold text-white">{{ t.customer_firstname }}</p>
                <p class="mt-0.5 text-xs text-slate-500">{{ t.customer_email }}</p>
              </td>
              <td class="px-5 py-4">
                <span class="font-semibold text-blue-300">#{{ t.id }}</span>
                <span class="text-white"> - {{ t.title }}</span>
              </td>
              <td class="px-5 py-4 text-center">
                <span
                  class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                  :class="statusStyles[t.status]"
                >
                  {{ statusLabel[t.status] }}
                </span>
              </td>
              <td class="px-5 py-4 text-center text-slate-300">
                {{ t.last_staff_firstname ?? '—' }}
              </td>
              <td class="px-5 py-4 text-center text-slate-400">
                {{ formatDateTime(t.last_staff_reply_at) }}
              </td>
              <td class="px-5 py-4 text-center">
                <RouterLink
                  :to="{ path: `/staff/tickets/${t.id}`, query: { from: props.from } }"
                  class="inline-flex rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/90 transition-colors hover:bg-white/10"
                >
                  View Ticket
                </RouterLink>
              </td>
            </tr>
            <tr v-if="tickets.length === 0">
              <td colspan="6" class="px-5 py-12 text-center text-sm text-slate-500">
                No tickets yet.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>