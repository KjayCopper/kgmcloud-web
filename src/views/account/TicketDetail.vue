<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'
import { useAuth } from '../../composables/useAuth'
import { sanitizeHtml } from '../../utils/sanitizeHtml'
import { pickImageAndInsert, uploadFile } from '../../utils/uploadImage'
import type { UploadedFile } from '../../utils/uploadImage'

interface Ticket {
  id: number
  customer_id: number
  title: string
  status: 'awaiting_cx' | 'open' | 'awaiting_customer' | 'resolved' | 'closed'
  transaction_id: string | null
  created_at: string
  updated_at: string
}

interface TicketMessage {
  id: number
  user_id: number
  sender_type?: 'customer' | 'staff'
  firstname: string
  role: string
  body: string
  created_at: string
  attachments?: UploadedFile[]
}

const route = useRoute()
const { request, user, token } = useAuth()

const id = Number(route.params.id)
const ticket = ref<Ticket | null>(null)
const messages = ref<TicketMessage[]>([])
const loading = ref(true)
const err = ref('')

const sending = ref(false)
const replyErr = ref('')
const editorEl = ref<HTMLDivElement | null>(null)
const quill = ref<Quill | null>(null)
const replyFiles = ref<UploadedFile[]>([])

const resolving = ref(false)
const resolveErr = ref('')

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

function formatSize(size: number | undefined | null): string {
  if (typeof size !== 'number' || size < 0) return ''
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

const TOOLBAR = [
  [{ header: [3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  ['blockquote'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['link', 'image', 'file'],
  ['clean'],
]

function createEditor(el: HTMLDivElement): Quill {
  const q = new Quill(el, {
    theme: 'snow',
    placeholder: 'Type a reply…',
    modules: {
      toolbar: {
        container: TOOLBAR,
        handlers: {
          image: () => pickImageAndInsert(q, token.value, (msg) => (replyErr.value = msg), '/api/upload'),
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
    quill.value = createEditor(editorEl.value)
  }
}

async function addFileAttachments(files: File[]) {
  let firstErr = ''
  for (const file of files) {
    try {
      const up = await uploadFile(file, token.value, 'files', '/api/upload')
      if (up.url) replyFiles.value.push(up)
    } catch (e) {
      if (!firstErr) firstErr = e instanceof Error ? e.message : 'File upload failed'
      break
    }
  }
  if (firstErr) replyErr.value = firstErr
}

function removePendingFile(index: number) {
  replyFiles.value.splice(index, 1)
}

async function loadDetail() {
  try {
    const res = await request<{ ticket: Ticket; messages: TicketMessage[] }>(`/api/tickets/${id}`)
    if (!res || !res.ticket) return
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
  if (quill.value) {
    quill.value.destroy()
    quill.value = null
  }
})

async function sendReply() {
  const body = sanitizeHtml(quill.value?.root.innerHTML || '')
  const files = replyFiles.value
  if (sending.value) return
  if ((!body || body === '<p><br></p>') && files.length === 0) return
  sending.value = true
  replyErr.value = ''
  try {
    await request(`/api/tickets/${id}/replies`, {
      method: 'POST',
      body: JSON.stringify({ body, attachments: files }),
    })
    if (quill.value) quill.value.root.innerHTML = '<p><br></p>'
    files.splice(0)
    await loadDetail()
  } catch (e) {
    replyErr.value = e instanceof Error ? e.message : 'Failed to send'
  } finally {
    sending.value = false
  }
}

async function resolveTicket() {
  if (resolving.value || !ticket.value) return
  resolving.value = true
  resolveErr.value = ''
  try {
    await request(`/api/tickets/${id}/resolve`, { method: 'POST' })
    await loadDetail()
  } catch (e) {
    resolveErr.value = e instanceof Error ? e.message : 'Failed to resolve'
  } finally {
    resolving.value = false
  }
}

function isMe(m: TicketMessage) {
  return user.value?.id === m.user_id
}

function isCustomerMessage(m: TicketMessage) {
  if (m.sender_type) return m.sender_type === 'customer'
  return m.user_id === ticket.value?.customer_id
}

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

function initials(name: string) {
  return (name?.trim().charAt(0) || '?').toUpperCase()
}

function headerBg(m: TicketMessage) {
  return isCustomerMessage(m) ? 'bg-slate-600' : 'bg-blue-600'
}

function headerText(m: TicketMessage) {
  return isCustomerMessage(m) ? 'text-slate-200' : 'text-blue-100'
}
</script>

<template>
  <div class="mx-auto w-full max-w-4xl px-6 pb-16 pt-10">
    <RouterLink
      to="/account?tab=tickets"
      class="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10"
    >
      <span>←</span>
      Back to support tickets
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
          <button
            v-if="ticket.status !== 'resolved' && ticket.status !== 'closed'"
            :disabled="resolving"
            type="button"
            class="ml-auto rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            @click="resolveTicket"
          >
            {{ resolving ? 'Marking…' : 'Mark as resolved' }}
          </button>
        </div>
        <p v-if="resolveErr" class="mt-2 text-sm text-red-400">{{ resolveErr }}</p>
        <h2 class="mt-3 text-2xl font-bold tracking-tight text-white lg:text-3xl">
          <span class="text-blue-300">#{{ ticket.id }}</span>
          <span class="text-white"> - {{ ticket.title }}</span>
        </h2>
        <div class="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-400">
          <span>Opened on {{ formatDateTime(ticket.created_at) }}</span>
          <span v-if="ticket.updated_at">Last updated {{ formatDateTime(ticket.updated_at) }}</span>
          <span v-if="ticket.transaction_id" class="font-mono">Order #{{ ticket.transaction_id }}</span>
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
          :class="isCustomerMessage(m) ? 'flex-row' : 'flex-row-reverse'"
        >
          <div class="flex w-16 shrink-0 flex-col items-center gap-1.5 pt-1">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
              :class="[headerBg(m), headerText(m)]"
            >
              {{ initials(m.firstname) }}
            </div>
            <span class="max-w-full truncate text-[10px] font-semibold text-slate-400">{{ m.firstname }}</span>
          </div>
          <div class="min-w-0 flex-1 border border-white/10">
            <div
              class="relative flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-2 text-xs font-semibold"
              :class="[headerBg(m), headerText(m)]"
            >
              <span
                class="absolute top-2 h-2.5 w-2.5 rotate-45"
                :class="[headerBg(m), isCustomerMessage(m) ? '-left-1' : '-right-1']"
              ></span>
              <span class="min-w-0 truncate">
                <span class="text-white">{{ m.firstname }}</span>
                {{ roleLabel(m.role) }} · posted {{ formatDateTime(m.created_at) }}
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

      <form
        v-if="ticket.status === 'open' || ticket.status === 'awaiting_cx' || ticket.status === 'awaiting_customer'"
        class="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/5"
        @submit.prevent="sendReply"
      >
        <div class="border-b border-white/10 px-6 py-3 text-sm font-semibold text-blue-300">Reply</div>
        <div class="px-6 py-5">
          <div ref="editorEl" class="editor-shell"></div>
          <p v-if="replyErr" class="mt-2 text-sm text-red-400">{{ replyErr }}</p>
          <div v-if="replyFiles.length" class="mt-3 flex flex-col gap-1.5">
            <div
              v-for="(f, i) in replyFiles"
              :key="(f.url || f.name) + '-' + i"
              class="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm"
            >
              <i class="fa-solid fa-paperclip text-xs text-slate-400" aria-hidden="true"></i>
              <span class="min-w-0 truncate font-medium text-white/90">{{ f.name }}</span>
              <span v-if="formatSize(f.size)" class="shrink-0 text-xs text-slate-500">{{ formatSize(f.size) }}</span>
              <button
                type="button"
                class="ml-auto shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Remove attachment"
                @click="removePendingFile(i)"
              >
                <i class="fa-solid fa-xmark" aria-hidden="true"></i>
              </button>
            </div>
          </div>
          <div class="mt-3 flex items-center justify-end gap-2">
            <button
              :disabled="sending"
              type="submit"
              class="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {{ sending ? 'Sending…' : 'Send reply' }}
            </button>
          </div>
        </div>
      </form>
      <p v-else class="mt-6 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm text-slate-400">
        This ticket is {{ ticket.status === 'resolved' ? 'resolved' : 'closed' }}.
      </p>
    </template>
  </div>
</template>

<style scoped>
.post-body img {
  max-width: 100%;
  border-radius: 0.375rem;
}
.editor-shell :deep(.ql-toolbar) {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-top-left-radius: 0.5rem;
  border-top-right-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.04);
}
.editor-shell :deep(.ql-container) {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-top: none;
  border-bottom-left-radius: 0.5rem;
  border-bottom-right-radius: 0.5rem;
  font-size: 0.925rem;
}
.editor-shell :deep(.ql-editor) {
  color: #e2e8f0;
  min-height: 96px;
}
.editor-shell :deep(.ql-editor.ql-blank::before) {
  color: #64748b;
}
.editor-shell :deep(.ql-editor img) {
  max-width: 100%;
  border-radius: 0.375rem;
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