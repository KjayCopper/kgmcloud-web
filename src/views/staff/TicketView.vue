<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'
import { useAuth } from '../../composables/useAuth'
import { sanitizeHtml } from '../../utils/sanitizeHtml'
import { uploadFile, pickImageAndInsert } from '../../utils/uploadImage'
import type { UploadedFile } from '../../utils/uploadImage'
import { openUserProfile } from '../../utils/openUserProfile'

interface Ticket {
  id: number
  title: string
  status: 'awaiting_cx' | 'open' | 'awaiting_customer' | 'resolved' | 'closed'
  transaction_id: string | null
  team_id: number
  created_at: string
  updated_at: string
  customer_id: number
  customer_firstname: string
  customer_email: string
}

interface TicketMessage {
  id: number
  ticket_id: number
  user_id: number
  sender_type?: 'customer' | 'staff'
  firstname: string
  role: string
  body: string
  is_note: number
  created_at: string
  attachments?: UploadedFile[]
}

const route = useRoute()
const router = useRouter()
const { request, user, token, hasPermId } = useAuth()

const canReply = computed(() => hasPermId(18))
const canNote = computed(() => hasPermId(19))
const canTransfer = computed(() => hasPermId(20))
const canResolve = computed(() => hasPermId(21))
const canClose = computed(() => hasPermId(22))
const canReopen = computed(() => hasPermId(23))

const id = Number(route.params.id)
const ticket = ref<Ticket | null>(null)
const messages = ref<TicketMessage[]>([])
const loading = ref(true)
const err = ref('')
const transferring = ref(false)
const showTransferModal = ref(false)
const transferReason = ref('')
const transferTargetTeam = ref<1 | 2>(2)

const sending = ref(false)
const replyErr = ref('')
const composerTab = ref<'reply' | 'notes'>(canReply.value ? 'reply' : 'notes')

const editorEl = ref<HTMLDivElement | null>(null)
const quill = ref<Quill | null>(null)
const replyDraft = ref('')
const noteDraft = ref('')
const replyFiles = ref<UploadedFile[]>([])
const noteFiles = ref<UploadedFile[]>([])

function currentFiles(): UploadedFile[] {
  return composerTab.value === 'notes' ? noteFiles.value : replyFiles.value
}

function removePendingFile(index: number) {
  currentFiles().splice(index, 1)
}

async function addFileAttachments(files: File[]) {
  let firstErr = ''
  for (const file of files) {
    try {
      const up = await uploadFile(file, token.value, 'files')
      if (up.url) currentFiles().push(up)
    } catch (e) {
      if (!firstErr) firstErr = e instanceof Error ? e.message : 'File upload failed'
      break
    }
  }
  if (firstErr) replyErr.value = firstErr
}

function formatSize(size: number | undefined | null): string {
  if (typeof size !== 'number' || size < 0) return ''
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

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

const backHref = computed(() => {
  if (route.query.from === 'bug-reports') return '/staff/bug-reports'
  return '/staff/tickets'
})

const backLabel = computed(() =>
  route.query.from === 'bug-reports' ? 'Bug reports' : 'Support tickets'
)

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function renderBody(body: string): string {
  const b = (body || '').trim()
  if (!b) return b
  if (/<[a-z][\s\S]*>/i.test(b)) return sanitizeHtml(b)
  return b
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
}

const TOOLBAR = [
  [{ header: [3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  ['blockquote'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['link', 'image', 'file'],
  ['clean'],
]

function createEditor(el: HTMLDivElement, placeholder: string): Quill {
  const q = new Quill(el, {
    theme: 'snow',
    placeholder,
    modules: {
      toolbar: {
        container: TOOLBAR,
        handlers: {
          image: () => pickImageAndInsert(q, token.value, (msg) => (replyErr.value = msg)),
          file: () => {
            const input = document.createElement('input')
            input.type = 'file'
            input.multiple = true
            input.onchange = async () => {
              const files = Array.from(input.files || [])
              if (!files.length) return
              await addFileAttachments(files)
            }
            input.click()
          },
        },
      },
    },
  })
  const fileBtn = (q.getModule('toolbar') as { container: HTMLElement }).container.querySelector('button.ql-file')
  if (fileBtn) {
    fileBtn.innerHTML =
      '<svg viewBox="0 0 18 18"><path class="ql-stroke" d="M6.6,11.4L9,9a1.456,1.456,0,0,1,2.059,2.059L7.971,14.147a2.912,2.912,0,0,1-4.118-4.118l6.177-6.177a2.912,2.912,0,0,1,4.118,4.118"></path></svg>'
  }
  return q
}

function initEditor() {
  if (editorEl.value && !quill.value) {
    quill.value = createEditor(editorEl.value, 'Write your reply…')
  }
}

watch(composerTab, (tab, prevTab) => {
  if (!quill.value) return
  if (prevTab) {
    const html = quill.value.root.innerHTML || ''
    if (html.trim() && html !== '<p><br></p>') {
      if (prevTab === 'notes') noteDraft.value = html
      else replyDraft.value = html
    }
  }
  const restore = tab === 'notes' ? noteDraft.value : replyDraft.value
  quill.value.root.innerHTML = restore || '<p><br></p>'
  quill.value.root.setAttribute('data-placeholder', tab === 'notes' ? 'Write an internal note…' : 'Write your reply…')
})

watch(() => ticket.value?.status, (status) => {
  if (status && ['resolved', 'closed'].includes(status) && composerTab.value === 'reply') {
    composerTab.value = 'notes'
  }
})

watch([canReply, canNote], () => {
  if (!canReply.value && composerTab.value === 'reply' && canNote.value) {
    composerTab.value = 'notes'
  }
})

async function loadDetail() {
  try {
    const res = (await request<{ ticket: Ticket; messages: TicketMessage[] }>(
      `/api/staff/tickets/${id}`
    )) as { ticket: Ticket; messages: TicketMessage[] }
    ticket.value = res.ticket
    messages.value = res.messages || []
  } catch (e) {
    err.value = e instanceof Error ? e.message : 'Failed to load ticket'
  } finally {
    loading.value = false
  }
  await nextTick()
  initEditor()
}

let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  loadDetail()
  timer = setInterval(loadDetail, 10000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  if (quill.value) { quill.value.destroy(); quill.value = null }
})

async function sendReply() {
  const isNote = composerTab.value === 'notes'
  if (isNote ? !canNote.value : !canReply.value) {
    replyErr.value = 'You do not have permission to do that'
    return
  }
  const body = sanitizeHtml(quill.value?.root.innerHTML || '')
  const files = currentFiles()
  if (sending.value) return
  if ((!body || body === '<p><br></p>') && files.length === 0) return
  sending.value = true
  replyErr.value = ''
  try {
    await request(`/api/staff/tickets/${id}/replies`, {
      method: 'POST',
      body: JSON.stringify({ body, is_note: isNote, attachments: files }),
    })
    if (quill.value) {
      quill.value.root.innerHTML = '<p><br></p>'
      if (isNote) noteDraft.value = ''
      else replyDraft.value = ''
    }
    files.splice(0)
    await loadDetail()
  } catch (e) {
    replyErr.value = e instanceof Error ? e.message : 'Failed to send'
  } finally {
    sending.value = false
  }
}

async function setStatus(status: Ticket['status']) {
  try {
    await request(`/api/staff/tickets/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    })
    await loadDetail()
  } catch (e) {
    err.value = e instanceof Error ? e.message : 'Failed to update status'
  }
}

async function transferTicket(targetTeam: 1 | 2, reason: string) {
  if (transferring.value) return
  transferring.value = true
  try {
    await request(`/api/staff/tickets/${id}/transfer`, {
      method: 'POST',
      body: JSON.stringify({ team_id: targetTeam, reason }),
    })
    router.push(backHref.value)
  } catch (e) {
    err.value = e instanceof Error ? e.message : 'Failed to transfer'
    transferring.value = false
  }
}

function openTransferModal(targetTeam: 1 | 2) {
  transferTargetTeam.value = targetTeam
  transferReason.value = ''
  showTransferModal.value = true
}

function isMe(m: TicketMessage) {
  return user.value?.id === m.user_id
}

function isCustomer(m: TicketMessage) {
  if (m.is_note) return false
  if (m.sender_type) return m.sender_type === 'customer'
  return m.user_id === ticket.value?.customer_id
}

const teamId = computed(() => (ticket.value?.team_id === 2 ? 2 : 1))

function roleLabel(role: string | number | null | undefined) {
  if (typeof role !== 'string') return ''
  if (role === 'customer') return '(customer)'
  if (role === 'managing_director') return '(MD)'
  if (role === 'operations_director') return '(Ops Director)'
  const bits = role
    .split(/[_\s]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
  return `(${bits.join(' ')})`
}

function headerBg(m: TicketMessage) {
  if (m.is_note) return 'bg-amber-500'
  return isCustomer(m) ? 'bg-slate-600' : 'bg-blue-600'
}

function headerText(m: TicketMessage) {
  if (m.is_note) return 'text-amber-50'
  return isCustomer(m) ? 'text-slate-200' : 'text-blue-100'
}
</script>

<template>
  <div>
    <RouterLink
      :to="backHref"
      class="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10"
    >
      <span>←</span>
      Back to {{ backLabel }}
    </RouterLink>

    <p v-if="err" class="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
      {{ err }}
    </p>

    <template v-if="loading">
      <div class="mt-6 space-y-3">
        <div v-for="i in 4" :key="i" class="h-14 animate-pulse rounded-xl border border-white/10 bg-white/5"></div>
      </div>
    </template>

    <template v-else-if="ticket">
      <header class="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div class="flex flex-wrap items-center gap-2">
          <span
            class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold"
            :class="statusStyles[ticket.status]"
          >
            {{ statusLabel[ticket.status] }}
          </span>
        </div>
        <h2 class="mt-3 text-2xl font-bold tracking-tight text-white lg:text-3xl">
          <span class="text-blue-300">#{{ ticket.id }}</span>
          <span class="text-white"> - {{ ticket.title }}</span>
        </h2>
        <div class="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-400">
          <span>
            Opened by
            <button
              type="button"
              class="cursor-pointer font-semibold text-blue-300 underline-offset-2 transition-colors duration-150 hover:text-blue-100 hover:underline"
              @click="openUserProfile(ticket.customer_id)"
            >
              {{ ticket.customer_firstname }}
            </button>
            ({{ ticket.customer_email }}) on {{ formatDateTime(ticket.created_at) }}
          </span>
          <span v-if="ticket.updated_at">Last updated {{ formatDateTime(ticket.updated_at) }}</span>
          <span v-if="ticket.transaction_id" class="font-mono">Order #{{ ticket.transaction_id }}</span>
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          <button
            v-if="canResolve && ticket.status !== 'resolved' && ticket.status !== 'closed'"
            type="button"
            class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 transition-colors hover:bg-emerald-500"
            @click="setStatus('resolved')"
          >
            Mark resolved
          </button>
          <button
            v-if="canClose && ticket.status !== 'resolved' && ticket.status !== 'closed'"
            type="button"
            class="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10"
            @click="setStatus('closed')"
          >
            Close ticket
          </button>
          <button
            v-if="canReopen && (ticket.status === 'resolved' || ticket.status === 'closed')"
            type="button"
            class="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10"
            @click="setStatus('open')"
          >
            Reopen
          </button>
          <button
            v-if="canTransfer && ticket.status !== 'resolved' && ticket.status !== 'closed'"
            type="button"
            :disabled="transferring"
            class="rounded-lg border border-purple-400/30 bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-200 transition-colors hover:bg-purple-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            @click="openTransferModal(teamId === 1 ? 2 : 1)"
          >
            {{ transferring ? 'Transferring…' : (teamId === 1 ? 'Transfer to Product Development' : 'Transfer to Customer Experience') }}
          </button>
        </div>
      </header>

      <div v-if="messages.length === 0" class="mt-6 rounded-2xl border border-white/10 bg-white/5 px-6 py-10 text-center text-sm text-slate-500">
        No messages yet.
      </div>
      <div v-else class="mt-6 space-y-4">
        <div
          v-for="m in messages"
          :key="m.id"
          class="flex items-start gap-3"
          :class="isCustomer(m) ? 'flex-row' : 'flex-row-reverse'"
        >
          <div class="flex w-16 shrink-0 flex-col items-center gap-1.5 pt-1">
            <button
              type="button"
              class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-sm font-bold transition-all duration-150 hover:scale-110 hover:opacity-85 hover:ring-2 hover:ring-blue-400/70"
              :class="m.is_note ? 'bg-amber-500 text-white' : isCustomer(m) ? 'bg-slate-600 text-slate-200' : 'bg-blue-600 text-white'"
              @click="openUserProfile(m.user_id)"
            >
              {{ (m.firstname || '?').charAt(0).toUpperCase() }}
            </button>
            <button
              type="button"
              class="max-w-full cursor-pointer truncate text-left text-[10px] font-semibold text-slate-400 transition-colors duration-150 hover:text-blue-300 hover:underline"
              @click="openUserProfile(m.user_id)"
            >
              {{ m.firstname }}
            </button>
          </div>
          <div class="min-w-0 flex-1 border border-white/10">
            <div
              class="relative flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-2 text-xs font-semibold"
              :class="[headerBg(m), headerText(m)]"
            >
              <span
                class="absolute top-2 h-2.5 w-2.5 rotate-45"
                :class="[headerBg(m), m.is_note || !isCustomer(m) ? '-right-1' : '-left-1']"
              ></span>
              <span class="min-w-0 truncate">
                <span
                  v-if="m.is_note"
                  class="mr-2 rounded-full bg-black/20 px-2 py-0.5 font-bold uppercase tracking-wider"
                >
                  Internal note
                </span>
                <span class="text-white">
                  <button
                    type="button"
                    class="cursor-pointer underline-offset-2 transition-colors duration-150 hover:text-blue-300 hover:underline"
                    @click="openUserProfile(m.user_id)"
                  >
                    {{ m.firstname }}
                  </button>
                </span>
                <span v-if="roleLabel(m.role)">{{ roleLabel(m.role) }} ·</span> posted {{ formatDateTime(m.created_at) }}
              </span>
              <span
                v-if="isMe(m)"
                class="shrink-0 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-300"
              >
                You
              </span>
            </div>
            <div class="post-body px-4 py-3 text-sm leading-relaxed text-slate-200" v-html="renderBody(m.body)"></div>
            <div v-if="m.attachments && m.attachments.length" class="flex flex-col gap-1.5 border-t border-white/10 px-4 py-3">
              <div v-for="(a, ai) in m.attachments" :key="(a.url || '') + '-' + ai" class="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm">
                <i class="fa-solid fa-paperclip text-xs text-slate-400" aria-hidden="true"></i>
                <a :href="a.url" target="_blank" rel="noopener" class="min-w-0 truncate font-medium text-blue-300 transition-colors duration-150 hover:text-blue-100 hover:underline">{{ a.name }}</a>
                <span v-if="formatSize(a.size)" class="shrink-0 text-xs text-slate-500">{{ formatSize(a.size) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="canReply || canNote" class="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <div class="flex border-b border-white/10">
          <button
            v-if="canReply && ticket.status !== 'resolved' && ticket.status !== 'closed'"
            type="button"
            class="border-b-2 px-6 py-3 text-sm font-semibold transition-colors"
            :class="composerTab === 'reply' ? 'border-blue-400 text-blue-300' : 'border-transparent text-slate-400 hover:text-slate-200'"
            @click="composerTab = 'reply'"
          >
            Reply
          </button>
          <button
            v-if="canNote"
            type="button"
            class="border-b-2 px-6 py-3 text-sm font-semibold transition-colors"
            :class="composerTab === 'notes' ? 'border-amber-400 text-amber-300' : 'border-transparent text-slate-400 hover:text-slate-200'"
            @click="composerTab = 'notes'"
          >
            Notes
          </button>
          <span v-if="composerTab === 'notes'" class="flex items-center px-1 text-xs text-amber-300/70">visible to staff only</span>
        </div>
        <div class="px-6 py-5">
          <div ref="editorEl" class="editor-shell"></div>
          <p v-if="replyErr" class="mt-2 text-sm text-red-400">{{ replyErr }}</p>
          <div v-if="currentFiles().length" class="mt-3 flex flex-col gap-1.5">
            <div v-for="(f, i) in currentFiles()" :key="(f.url || f.name) + '-' + i" class="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm">
              <i class="fa-solid fa-paperclip text-xs text-slate-400" aria-hidden="true"></i>
              <span class="min-w-0 truncate font-medium text-white/90">{{ f.name }}</span>
              <span v-if="formatSize(f.size)" class="shrink-0 text-xs text-slate-500">{{ formatSize(f.size) }}</span>
              <button type="button" class="ml-auto shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white" @click="removePendingFile(i)" aria-label="Remove attachment">
                <i class="fa-solid fa-xmark" aria-hidden="true"></i>
              </button>
            </div>
          </div>
          <div class="mt-3 flex items-center justify-end gap-2">
            <button
              :disabled="sending"
              type="button"
              class="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              @click="sendReply"
            >
              {{ composerTab === 'notes' ? (sending ? 'Adding…' : 'Add note') : (sending ? 'Sending…' : 'Send reply') }}
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="showTransferModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        @click.self="showTransferModal = false"
      >
        <div class="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6">
          <div class="flex items-center justify-between gap-4">
            <h3 class="text-lg font-semibold text-white">
              Transfer to {{ transferTargetTeam === 2 ? 'Product Development' : 'Customer Experience' }}
            </h3>
            <button
              type="button"
              class="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              @click="showTransferModal = false"
            >
              Close
            </button>
          </div>
          <div class="mt-5 flex flex-col gap-1.5">
            <label class="text-xs font-semibold uppercase tracking-wider text-slate-400" for="transfer-reason">Reason for transfer</label>
            <textarea
              id="transfer-reason"
              v-model="transferReason"
              rows="4"
              maxlength="4000"
              placeholder="Why is this ticket being transferred?"
              class="resize-y rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/60"
              @keyup.enter.ctrl="if (transferReason.trim()) { showTransferModal = false; transferTicket(transferTargetTeam, transferReason) }"
            ></textarea>
          </div>
          <div class="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              class="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10"
              @click="showTransferModal = false"
            >
              Cancel
            </button>
            <button
              :disabled="transferring || !transferReason.trim()"
              type="button"
              class="rounded-lg bg-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-600/30 transition-colors hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
              @click="showTransferModal = false; transferTicket(transferTargetTeam, transferReason)"
            >
              {{ transferring ? 'Transferring…' : 'Transfer ticket' }}
            </button>
          </div>
        </div>
      </div>

      </template>
  </div>
</template>

<style scoped>
.editor-shell :deep(.ql-container) {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-top: none;
  border-radius: 0 0 0.5rem 0.5rem;
  color: #fff;
  font-size: 0.925rem;
}
.editor-shell :deep(.ql-editor) {
  color: #e2e8f0;
  min-height: 90px;
}
.editor-shell :deep(.ql-editor img) {
  max-width: 100%;
  border-radius: 0.375rem;
}
.post-body img {
  max-width: 100%;
  border-radius: 0.375rem;
}
.editor-shell :deep(.ql-editor.ql-blank::before) {
  color: #64748b;
}
.editor-shell :deep(.ql-toolbar) {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem 0.5rem 0 0;
  background: rgba(255, 255, 255, 0.04);
}
.editor-shell :deep(.ql-toolbar .ql-stroke) {
  stroke: #cbd5e1;
}
.editor-shell :deep(.ql-toolbar .ql-fill) {
  fill: #cbd5e1;
}
.editor-shell :deep(.ql-toolbar .ql-picker) {
  color: #cbd5e1;
}
.editor-shell :deep(.ql-toolbar button:hover .ql-stroke),
.editor-shell :deep(.ql-toolbar button.ql-active .ql-stroke) {
  stroke: #60a5fa;
}
.editor-shell :deep(.ql-toolbar button:hover .ql-fill),
.editor-shell :deep(.ql-toolbar button.ql-active .ql-fill) {
  fill: #60a5fa;
}
.editor-shell :deep(.ql-toolbar .ql-picker:hover),
.editor-shell :deep(.ql-toolbar .ql-picker.ql-expanded .ql-picker-label) {
  color: #60a5fa;
}
</style>