<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'
import { useAuth } from '../../composables/useAuth'
import { sanitizeHtml } from '../../utils/sanitizeHtml'
import { pickImageAndInsert } from '../../utils/uploadImage'

const props = defineProps<{ cx?: boolean }>()

const { request, token, hasPerm } = useAuth()
const router = useRouter()

const title = ref('')
const posting = ref(false)
const msg = ref('')
const err = ref('')
const isCx = computed(() => props.cx === true)
const homeRoute = computed(() => (isCx.value ? '/staff/cx-dashboard' : '/staff'))
const canPost = computed(() => (isCx.value ? hasPerm('create.cxannouncements') : hasPerm('create.companyannouncements')))

const editorEl = ref<HTMLDivElement | null>(null)
let quill: Quill | null = null

onMounted(async () => {
  await nextTick()
  if (editorEl.value && !quill) {
    quill = new Quill(editorEl.value, {
      theme: 'snow',
      placeholder: 'Write your announcement…',
      modules: {
        toolbar: [
          [{ header: [2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          ['blockquote'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['link', 'image'],
          ['clean'],
        ],
      },
    })
    quill
      .getModule('toolbar')
      .addHandler('image', () => pickImageAndInsert(quill!, token.value, (m) => (err.value = m)))
  }
})

onUnmounted(() => {
  if (quill) { quill.destroy(); quill = null }
})

async function submit() {
  if (!canPost.value) {
    err.value = 'You do not have permission to post updates.'
    return
  }
  const body = sanitizeHtml(quill?.root.innerHTML || '')
  if (!title.value.trim()) {
    err.value = 'A title is required.'
    return
  }
  if (!body || body === '<p><br></p>') {
    err.value = 'Please write some content.'
    return
  }
  posting.value = true
  msg.value = ''
  err.value = ''
  try {
    await request(isCx.value ? '/api/staff/cx-dashboard/announcements' : '/api/staff/announcements', {
      method: 'POST',
      body: JSON.stringify({ title: title.value.trim(), body }),
    })
    router.push(homeRoute.value)
  } catch (e) {
    err.value = e instanceof Error ? e.message : 'Failed to post update'
  } finally {
    posting.value = false
  }
}
</script>

<template>
  <div>
    <div>
      <p class="text-sm font-semibold uppercase tracking-widest text-blue-400">Staff panel</p>
      <h2 class="mt-2 text-3xl font-bold tracking-tight text-white lg:text-4xl">Post an update</h2>
      <p class="mt-2 text-sm text-slate-400">
        Write an announcement for the {{ isCx ? 'Customer Experience Dashboard' : 'Company Dashboard' }}.
      </p>
    </div>

    <p v-if="msg" class="mt-4 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-300">
      {{ msg }}
    </p>

    <form
      v-if="canPost"
      class="mt-6 flex max-w-3xl flex-col gap-5 rounded-2xl border border-white/10 bg-white/5 p-6"
      @submit.prevent="submit"
    >
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-semibold text-slate-200">Title</label>
        <input
          v-model="title"
          type="text"
          maxlength="200"
          placeholder="Update title"
          class="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/60"
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-semibold text-slate-200">Body</label>
        <div ref="editorEl" class="editor-shell"></div>
      </div>

      <div class="flex items-center gap-3">
        <button
          :disabled="posting"
          type="submit"
          class="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ posting ? 'Posting…' : 'Post update' }}
        </button>
        <button
          type="button"
          class="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10"
          @click="router.push(homeRoute.value)"
        >
          Cancel
        </button>
        <span v-if="err" class="text-sm text-red-400">{{ err }}</span>
      </div>
    </form>

    <div v-else class="mt-6 max-w-3xl">
      <p class="rounded-2xl border border-white/10 bg-white/5 px-6 py-10 text-center text-sm text-slate-300">
        You do not have permission to post updates.
      </p>
    </div>
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
}
.editor-shell :deep(.ql-editor img) {
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