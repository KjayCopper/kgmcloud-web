<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useAuth } from '../../composables/useAuth'
import { roleTitle } from '../../lib/roles'
import { sanitizeHtml } from '../../utils/sanitizeHtml'

interface WeekStat {
  current: number
  previous: number
}

interface Stats {
  sales: WeekStat
  new_customers: WeekStat
  resolved_tickets: WeekStat
}

interface Announcement {
  id: number
  author_id: number
  firstname: string
  role: string
  title: string
  body: string
  created_at: string
}

interface ChatMessage {
  id: number
  user_id: number
  firstname: string
  role: string
  body: string
  created_at: string
}

const { request, user, hasPerm } = useAuth()
const firstname = computed(() => user.value?.firstname || '')
const canSeeDashboard = computed(() => hasPerm('view.companydashboard'))
const canSeeSales = canSeeDashboard
const canViewAnnouncements = computed(() => hasPerm('view.companyannouncements'))
const canCreateAnnouncements = computed(() => hasPerm('create.companyannouncements'))
const canManageAnnouncements = computed(() => hasPerm('manage.companyannouncements'))
const canViewChat = computed(() => hasPerm('view.companychat'))
const canSendChat = computed(() => hasPerm('send.companychat'))

function fmtMoney(v?: number): string {
  return `£${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtNum(v?: number): string {
  return Number(v || 0).toLocaleString()
}

function weekTrend(s?: WeekStat): { text: string; dir: -1 | 0 | 1; arrow: boolean } {
  if (!s) return { text: '', dir: 0, arrow: false }
  if (s.previous <= 0 && s.current <= 0) return { text: 'No change vs previous 7 days', dir: 0, arrow: false }
  if (s.previous <= 0) return { text: 'New this week', dir: 1, arrow: false }
  const pct = (s.current - s.previous) / s.previous
  if (pct === 0) return { text: 'No change vs previous 7 days', dir: 0, arrow: false }
  return {
    text: `${Math.abs(Math.round(pct * 100))}% vs previous 7 days`,
    dir: pct > 0 ? 1 : -1,
    arrow: true,
  }
}

const statCards = computed(() => {
  const S = stats.value
  if (!S || !S.sales || !S.new_customers || !S.resolved_tickets) return []
  const mk = (title: string, value: string, stat: WeekStat) => {
    const t = weekTrend(stat)
    return {
      title,
      value,
      text: t.text,
      arrow: t.arrow ? (t.dir === 1 ? '▲' : '▼') : '',
      dirCls: t.dir === 1 ? 'text-emerald-400' : t.dir === -1 ? 'text-red-400' : 'text-slate-500',
    }
  }
  return [
    mk('Sales · 7 days', fmtMoney(S.sales.current), S.sales),
    mk('New customers · 7 days', fmtNum(S.new_customers.current), S.new_customers),
    mk('Resolved tickets · 7 days', fmtNum(S.resolved_tickets.current), S.resolved_tickets),
  ]
})

const stats = ref<Stats | null>(null)
const statsError = ref('')
const loadingStats = ref(true)

const announcements = ref<Announcement[]>([])
const annError = ref('')
const loadingAnn = ref(true)
const active = ref<Announcement | null>(null)

const manageOpen = ref(false)
const manageErr = ref('')
const deletingId = ref<number | null>(null)

const messages = ref<ChatMessage[]>([])
const chatText = ref('')
const chatErr = ref('')
const sending = ref(false)
const loadingChat = ref(true)
const chatBox = ref<HTMLElement | null>(null)

let chatTimer: ReturnType<typeof setInterval> | null = null

function scrollChat(force = false) {
  const el = chatBox.value
  if (!el) return
  const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  if (force || nearBottom) el.scrollTop = el.scrollHeight
}

function isMe(m: ChatMessage) {
  return m.user_id === user.value?.id
}

function initials(name: string) {
  return (name?.trim().charAt(0) || '?').toUpperCase()
}

function time(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

async function loadStats() {
  if (!canSeeSales.value) {
    loadingStats.value = false
    return
  }
  try {
    stats.value = await request<Stats>('/api/staff/stats')
  } catch (e) {
    statsError.value = e instanceof Error ? e.message : 'Failed to load stats'
  } finally {
    loadingStats.value = false
  }
}

async function loadAnnouncements() {
  if (!canViewAnnouncements.value) {
    loadingAnn.value = false
    return
  }
  try {
    announcements.value = await request<Announcement[]>('/api/staff/announcements')
  } catch (e) {
    annError.value = e instanceof Error ? e.message : 'Failed to load updates'
  } finally {
    loadingAnn.value = false
  }
}

async function loadChat(force = false) {
  if (!canViewChat.value) {
    loadingChat.value = false
    return
  }
  try {
    messages.value = await request<ChatMessage[]>('/api/staff/chat')
    await nextTick()
    scrollChat(force)
  } catch (e) {
    chatErr.value = e instanceof Error ? e.message : 'Failed to load chat'
  } finally {
    loadingChat.value = false
  }
}

async function sendMessage() {
  const body = chatText.value.trim()
  if (!body) return
  sending.value = true
  chatErr.value = ''
  try {
    await request('/api/staff/chat', {
      method: 'POST',
      body: JSON.stringify({ body }),
    })
    chatText.value = ''
    await loadChat(true)
  } catch (e) {
    chatErr.value = e instanceof Error ? e.message : 'Failed to send message'
  } finally {
    sending.value = false
  }
}

function relativeDate(value: string): string {
  const d = new Date(value)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const days = Math.floor((today.getTime() - day.getTime()) / 86400000)
  if (days <= 0) return 'Today'
  if (days <= 7) return days === 1 ? '1 day' : `${days} days`
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function closeModal() {
  active.value = null
}

async function removeAnnouncement(a: Announcement) {
  deletingId.value = a.id
  manageErr.value = ''
  try {
    await request(`/api/staff/announcements/${a.id}`, { method: 'DELETE' })
    announcements.value = announcements.value.filter((x) => x.id !== a.id)
  } catch (e) {
    manageErr.value = e instanceof Error ? e.message : 'Failed to delete update'
  } finally {
    deletingId.value = null
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeModal()
}

onMounted(() => {
  loadStats()
  loadAnnouncements()
  if (canViewChat.value) loadChat(true)
  if (canViewChat.value) {
    chatTimer = setInterval(() => loadChat(false), 5000)
  }
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  if (chatTimer) clearInterval(chatTimer)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div>
    <div class="mb-8">
      <p class="text-sm font-semibold uppercase tracking-widest text-blue-400">Staff panel</p>
      <h2 class="mt-2 text-3xl font-bold tracking-tight text-white lg:text-4xl">Company Dashboard</h2>
      <p class="mt-4 text-xl font-semibold text-white">Hey {{ firstname }}</p>
    </div>

    <div
      v-if="!canSeeDashboard"
      class="rounded-2xl border border-white/10 bg-white/5 px-6 py-10 text-center"
    >
      <p class="text-sm font-semibold text-slate-400">You don't have access to the company dashboard.</p>
    </div>

    <template v-else>
    <div v-if="canSeeSales">
      <div class="flex items-center justify-between gap-4">
        <h3 class="text-2xl font-semibold tracking-tight text-white lg:text-3xl">Performance · last 7 days</h3>
        <span class="text-xs text-slate-500">compared with the previous 7 days</span>
      </div>

      <p v-if="statsError" class="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
        {{ statsError }}
      </p>

      <div v-if="loadingStats" class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="i in 4"
          :key="i"
          class="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/5"
        ></div>
      </div>

      <div v-else-if="stats" class="mt-4">
        <p
          v-if="statCards.length === 0"
          class="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300"
        >
          Metrics unavailable — the backend update hasn't been deployed yet.
        </p>
        <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="card in statCards"
            :key="card.title"
            class="rounded-2xl border border-white/10 bg-white/5 p-6"
          >
            <p class="text-sm font-semibold text-slate-400">{{ card.title }}</p>
            <p class="mt-2 text-4xl font-bold text-white">{{ card.value }}</p>
            <p class="mt-3 text-xs font-semibold" :class="card.dirCls">
              <span v-if="card.arrow">{{ card.arrow }}</span>
              {{ card.text }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-10 grid gap-6 lg:grid-cols-2">
      <section v-if="canViewAnnouncements">
        <div class="flex items-center justify-between gap-4">
          <h3 class="text-2xl font-semibold tracking-tight text-white lg:text-3xl">Updates</h3>
          <div v-if="canCreateAnnouncements || canManageAnnouncements" class="flex items-center gap-2.5">
            <button
              v-if="canManageAnnouncements"
              type="button"
              class="rounded-lg border border-white/15 bg-white/5 px-5 py-2 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10"
              @click="manageOpen = true"
            >
              Manage
            </button>
            <RouterLink
              v-if="canCreateAnnouncements"
              to="/staff/announcements/new"
              class="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500"
            >
              Post update
            </RouterLink>
          </div>
        </div>

        <p v-if="annError" class="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {{ annError }}
        </p>

        <div v-if="loadingAnn" class="mt-4 flex flex-col gap-3">
          <div v-for="i in 3" :key="i" class="h-20 animate-pulse rounded-xl border border-white/10 bg-white/5"></div>
        </div>

        <div v-else class="mt-4 flex flex-col gap-3">
          <button
            v-for="a in announcements"
            :key="a.id"
            type="button"
            class="cursor-pointer rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-left transition-colors hover:bg-white/[0.08]"
            @click="active = a"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="text-sm font-bold text-white">{{ a.title }}</p>
              <span class="text-xs text-slate-500">{{ relativeDate(a.created_at) }}</span>
            </div>
            <p class="mt-2 text-xs text-slate-500">
              <span class="font-semibold text-blue-300">{{ a.firstname }}</span>
              <span v-if="roleTitle(a.role)"> · {{ roleTitle(a.role) }}</span>
            </p>
          </button>
          <p v-if="announcements.length === 0" class="rounded-xl border border-dashed border-white/15 px-5 py-6 text-center text-sm text-slate-500">
            No company updates yet.
          </p>
        </div>
      </section>

      <section v-if="canViewChat" class="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-5">
        <div class="flex items-center justify-between gap-4">
          <h3 class="text-2xl font-semibold tracking-tight text-white lg:text-3xl">Company chat</h3>
          <span class="text-xs text-slate-500">refreshes automatically</span>
        </div>

        <div
          ref="chatBox"
          class="chat-list mt-4 flex h-72 flex-col gap-3 overflow-y-auto rounded-xl border border-white/10 bg-black/25 p-4 lg:h-[28rem]"
        >
          <div v-for="m in messages" :key="m.id" class="flex items-end gap-2" :class="isMe(m) ? 'justify-end' : 'justify-start'">
            <div
              v-if="!isMe(m)"
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-300"
            >
              {{ initials(m.firstname) }}
            </div>
            <div class="max-w-[85%]">
              <div
                class="rounded-2xl px-3.5 py-2.5"
                :class="isMe(m) ? 'rounded-br-sm bg-blue-600 shadow-lg shadow-blue-600/20' : 'rounded-bl-sm bg-white/10'"
              >
                <div class="flex items-baseline justify-between gap-3">
                  <p class="text-xs font-semibold" :class="isMe(m) ? 'text-blue-100' : 'text-blue-300'">
                    {{ isMe(m) ? 'You' : m.firstname }}
                    <span v-if="roleTitle(m.role)" class="font-normal text-slate-400">· {{ roleTitle(m.role) }}</span>
                  </p>
                  <span class="shrink-0 text-[10px] text-slate-400">{{ time(m.created_at) }}</span>
                </div>
                <p class="mt-1 whitespace-pre-wrap text-sm" :class="isMe(m) ? 'text-white' : 'text-slate-100'">{{ m.body }}</p>
              </div>
            </div>
            <div
              v-if="isMe(m)"
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/40 text-xs font-bold text-white"
            >
              {{ initials(user?.firstname || '') }}
            </div>
          </div>
          <p v-if="!loadingChat && messages.length === 0" class="m-auto text-sm text-slate-500">
            No messages yet — say hello!
          </p>
        </div>

        <form v-if="canSendChat" class="mt-4 flex items-center gap-2 border-t border-white/10 pt-4" @submit.prevent="sendMessage">
          <input
            v-model="chatText"
            type="text"
            placeholder="Message the company…"
            class="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/60"
          />
          <button
            :disabled="sending"
            class="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
          >
            {{ sending ? '…' : 'Send' }}
          </button>
        </form>
        <p v-if="chatErr" class="mt-2 text-sm text-red-400">{{ chatErr }}</p>
      </section>
    </div>
    </template>

    <Teleport to="body">
    <div
      v-if="active"
      class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-24 sm:p-8 sm:pt-28"
      @click.self="closeModal"
    >
      <div class="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#0d1629] text-slate-200 shadow-2xl">
        <div class="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-4">
          <div class="min-w-0">
            <h3 class="text-lg font-bold text-white">{{ active.title }}</h3>
            <p class="mt-1 text-xs text-slate-500">
              <span class="font-semibold text-blue-300">{{ active.firstname }}</span>
              <span v-if="roleTitle(active.role)"> · {{ roleTitle(active.role) }}</span>
              <span> · {{ new Date(active.created_at).toLocaleString() }}</span>
            </p>
          </div>
          <button
            type="button"
            class="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10"
            @click="closeModal"
          >
            Close
          </button>
        </div>
        <div class="ann-body max-h-[70vh] overflow-y-auto px-6 py-5" v-html="sanitizeHtml(active.body)"></div>
      </div>
    </div>

    <div
      v-if="manageOpen"
      class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-24 sm:p-8 sm:pt-28"
      @click.self="manageOpen = false"
    >
      <div class="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#0d1629] shadow-2xl">
        <div class="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-4">
          <div class="min-w-0">
            <h3 class="text-lg font-bold text-white">Manage updates</h3>
            <p class="mt-1 text-xs text-slate-500">Updates on this dashboard.</p>
          </div>
          <button
            type="button"
            class="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10"
            @click="manageOpen = false"
          >
            Close
          </button>
        </div>

        <div class="max-h-[70vh] overflow-y-auto px-6 py-5">
          <p v-if="manageErr" class="mb-3 text-sm text-red-400">{{ manageErr }}</p>
          <p v-if="announcements.length === 0" class="text-sm text-slate-500">No updates on this dashboard yet.</p>
          <ul v-else class="flex flex-col gap-3">
            <li
              v-for="a in announcements"
              :key="a.id"
              class="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-white">{{ a.title }}</p>
                <p class="mt-0.5 text-xs text-slate-500">
                  <span class="font-semibold text-blue-300">{{ a.firstname }}</span>
                  <span> · {{ new Date(a.created_at).toLocaleString() }}</span>
                </p>
              </div>
              <button
                :disabled="deletingId === a.id"
                type="button"
                class="shrink-0 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                @click="removeAnnouncement(a)"
              >
                {{ deletingId === a.id ? '…' : 'Delete' }}
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </Teleport>
  </div>
</template>

<style scoped>
.chat-list {
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.35) transparent;
}
.chat-list::-webkit-scrollbar {
  width: 6px;
}
.chat-list::-webkit-scrollbar-track {
  background: transparent;
}
.chat-list::-webkit-scrollbar-thumb {
  background-color: rgba(148, 163, 184, 0.3);
  border-radius: 9999px;
}
.chat-list::-webkit-scrollbar-thumb:hover {
  background-color: rgba(148, 163, 184, 0.5);
}
.ann-body {
  color: #e2e8f0;
  font-size: 0.875rem;
  line-height: 1.65;
}
.ann-body :deep(p) {
  margin: 0.5rem 0;
}
.ann-body :deep(strong) {
  color: #fff;
  font-weight: 700;
}
.ann-body :deep(h1),
.ann-body :deep(h2),
.ann-body :deep(h3) {
  margin: 0.75rem 0 0.5rem;
  font-weight: 700;
  color: #fff;
}
.ann-body :deep(ol),
.ann-body :deep(ul) {
  padding-left: 1.5rem;
  margin: 0.5rem 0;
  list-style: revert;
}
.ann-body :deep(a) {
  color: #60a5fa;
  text-decoration: underline;
}
.ann-body :deep(blockquote) {
  border-left: 3px solid rgba(96, 165, 250, 0.5);
  padding-left: 0.75rem;
  color: #94a3b8;
  margin: 0.5rem 0;
}
</style>