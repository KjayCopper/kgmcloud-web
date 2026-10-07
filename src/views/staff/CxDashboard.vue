<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useAuth } from '../../composables/useAuth'
import { roleTitle } from '../../lib/roles'
import { sanitizeHtml } from '../../utils/sanitizeHtml'

interface Announcement {
  id: number
  author_id: number
  firstname: string
  role: number | string | null
  title: string
  body: string
  created_at: string
}

interface ChatMessage {
  id: number
  user_id: number
  firstname: string
  role: number | string | null
  body: string
  created_at: string
}

interface CxStats {
  open: number
  awaiting_cx: number
  awaiting_customer: number
  avg_response: string
  resolved: number
  closed: number
}

interface DashboardData {
  cx_stats: CxStats
  announcements: Announcement[]
}

const { request, user, hasPerm } = useAuth()

const canSeeDashboard = computed(() => hasPerm('view.cxdashboard'))
const canViewAnnouncements = computed(() => hasPerm('view.cxannouncements'))
const canCreateAnnouncements = computed(() => hasPerm('create.cxannouncements'))
const canManageAnnouncements = computed(() => hasPerm('manage.cxannouncements'))
const canViewChat = computed(() => hasPerm('view.cxchat'))
const canSendChat = computed(() => hasPerm('send.cxchat'))

const data = ref<DashboardData | null>(null)
const error = ref('')
const loading = ref(true)

const announcements = ref<Announcement[]>([])
const messages = ref<ChatMessage[]>([])

const chatText = ref('')
const sending = ref(false)
const chatErr = ref('')
const chatLoading = ref(true)

const manageOpen = ref(false)
const manageErr = ref('')
const deletingId = ref<number | null>(null)

const active = ref<Announcement | null>(null)

const cxStats = ref<CxStats>({
  open: 0,
  awaiting_cx: 0,
  awaiting_customer: 0,
  avg_response: '—',
  resolved: 0,
  closed: 0,
})

let pollTimer: ReturnType<typeof setInterval> | null = null

const chatBox = ref<HTMLElement | null>(null)

function scrollChat() {
  requestAnimationFrame(() => {
    if (chatBox.value) chatBox.value.scrollTop = chatBox.value.scrollHeight
  })
}

async function loadDashboard() {
  if (!canSeeDashboard.value) {
    loading.value = false
    return
  }
  try {
    data.value = await request<DashboardData>('/api/staff/cx-dashboard')
    for (const [k, v] of Object.entries(data.value.cx_stats || {})) {
      if (k in cxStats.value) cxStats.value[k as keyof CxStats] = v as never
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load dashboard'
  } finally {
    loading.value = false
  }
}

async function loadAnnouncements() {
  if (!canViewAnnouncements.value) return
  try {
    announcements.value = await request<Announcement[]>('/api/staff/cx-dashboard/announcements')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load updates'
  }
}

async function loadChat() {
  if (!canViewChat.value) {
    chatLoading.value = false
    return
  }
  try {
    messages.value = await request<ChatMessage[]>('/api/staff/cx-dashboard/chat')
    scrollChat()
  } catch {
    // keep last messages
  } finally {
    chatLoading.value = false
  }
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

async function sendMessage() {
  const body = chatText.value.trim()
  if (!body || !canSendChat.value) return
  sending.value = true
  chatErr.value = ''
  try {
    await request('/api/staff/cx-dashboard/chat', {
      method: 'POST',
      body: JSON.stringify({ body }),
    })
    chatText.value = ''
    await loadChat()
  } catch (e) {
    chatErr.value = e instanceof Error ? e.message : 'Failed to send message'
  } finally {
    sending.value = false
  }
}

onMounted(async () => {
  await loadDashboard()
  await loadAnnouncements()
  if (canViewChat.value) await loadChat()
  if (canViewChat.value) pollTimer = setInterval(loadChat, 4000)
})

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
})

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
    await request(`/api/staff/cx-dashboard/announcements/${a.id}`, { method: 'DELETE' })
    announcements.value = announcements.value.filter((x) => x.id !== a.id)
  } catch (e) {
    manageErr.value = e instanceof Error ? e.message : 'Failed to delete update'
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-sm font-semibold uppercase tracking-widest text-blue-400">Customer Experience Team</p>
        <h2 class="mt-2 text-3xl font-bold tracking-tight text-white lg:text-4xl">Customer Experience Dashboard</h2>
      </div>
    </div>

    <div
      v-if="!canSeeDashboard"
      class="mt-8 rounded-2xl border border-white/10 bg-white/5 px-6 py-10 text-center"
    >
      <p class="text-sm font-semibold text-slate-400">You don't have access to the CX dashboard.</p>
    </div>

    <div v-else-if="loading" class="mt-8 space-y-4">
      <div class="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/5"></div>
      <div class="grid gap-4 lg:grid-cols-2">
        <div class="h-64 animate-pulse rounded-2xl border border-white/10 bg-white/5"></div>
        <div class="h-64 animate-pulse rounded-2xl border border-white/10 bg-white/5"></div>
      </div>
    </div>

    <div v-else-if="error" class="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-12 text-center">
      <p class="text-sm font-semibold text-red-300">{{ error }}</p>
    </div>

    <template v-else-if="data">
      <div class="mt-8">
        <div class="flex items-center justify-between gap-4">
          <h3 class="text-2xl font-semibold tracking-tight text-white lg:text-3xl">Support tickets</h3>
        </div>

        <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p class="text-sm font-semibold text-slate-400">Open tickets</p>
            <p class="mt-2 text-4xl font-bold text-white">{{ cxStats.open }}</p>
          </div>
          <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p class="text-sm font-semibold text-slate-400">Awaiting CX reply</p>
            <p class="mt-2 text-4xl font-bold text-white">{{ cxStats.awaiting_cx }}</p>
          </div>
          <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p class="text-sm font-semibold text-slate-400">Awaiting customer response</p>
            <p class="mt-2 text-4xl font-bold text-white">{{ cxStats.awaiting_customer }}</p>
          </div>
          <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p class="text-sm font-semibold text-slate-400">Average ticket response time</p>
            <p class="mt-2 text-4xl font-bold text-white">{{ cxStats.avg_response }}</p>
          </div>
        </div>

        <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6">
            <p class="text-sm font-semibold text-emerald-200">Resolved tickets</p>
            <p class="mt-2 text-4xl font-bold text-emerald-300">{{ cxStats.resolved }}</p>
          </div>
          <div class="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6">
            <p class="text-sm font-semibold text-amber-200">Closed tickets</p>
            <p class="mt-2 text-4xl font-bold text-amber-300">{{ cxStats.closed }}</p>
          </div>
        </div>
      </div>

      <div class="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div v-if="canViewAnnouncements">
          <div class="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h3 class="text-2xl font-semibold tracking-tight text-white lg:text-3xl">Updates</h3>
              <p class="mt-1 text-xs text-slate-500">company updates</p>
            </div>
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
                to="/staff/cx-dashboard/announcements/new"
                class="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500"
              >
                Post update
              </RouterLink>
            </div>
          </div>

          <div class="mt-4 flex flex-col gap-3">
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
                <template v-if="roleTitle(a.role)"> · {{ roleTitle(a.role) }}</template>
              </p>
            </button>
            <p v-if="announcements.length === 0" class="rounded-xl border border-dashed border-white/15 px-5 py-6 text-center text-sm text-slate-500">
              No updates yet.
            </p>
          </div>
        </div>

        <section v-if="canViewChat" class="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-5">
          <div class="flex items-center justify-between gap-4">
            <h3 class="text-2xl font-semibold tracking-tight text-white lg:text-3xl">Team chat</h3>
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
                      <template v-if="roleTitle(m.role)"> · {{ roleTitle(m.role) }}</template>
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
            <p v-if="!chatLoading && messages.length === 0" class="m-auto text-sm text-slate-500">
              No messages yet — say hello!
            </p>
          </div>

          <form v-if="canSendChat" class="mt-4 flex items-center gap-2 border-t border-white/10 pt-4" @submit.prevent="sendMessage">
            <input
              v-model="chatText"
              type="text"
              placeholder="Message the team…"
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
                <template v-if="roleTitle(active.role)"> · {{ roleTitle(active.role) }}</template>
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
  color: #f8fafc;
  font-weight: 700;
}
.ann-body :deep(h1),
.ann-body :deep(h2),
.ann-body :deep(h3) {
  color: #f8fafc;
  font-weight: 700;
  margin: 1rem 0 0.5rem;
}
.ann-body :deep(ol),
.ann-body :deep(ul) {
  padding-left: 1.25rem;
  margin: 0.5rem 0;
  list-style: revert;
}
.ann-body :deep(a) {
  color: #60a5fa;
  text-decoration: underline;
}
.ann-body :deep(blockquote) {
  border-left: 3px solid #1e293b;
  padding-left: 0.75rem;
  color: #94a3b8;
}
</style>