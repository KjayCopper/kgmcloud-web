<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuth } from '../../composables/useAuth'

interface Category {
  id: number
  name: string
  slug: string
}

interface MediaEntry {
  type: 'image' | 'video'
  name: string
  path: string
}

interface FileEntry {
  name: string
  path: string
  size?: number
}

interface StaffProduct {
  id: number
  name: string
  slug: string
  category_id: number | null
  category_name: string | null
  price: string | number
  on_sale: number
  pinned: number
  active: number
  requires_license: number
  max_games_per_license: number
  short_description: string | null
  description: string | null
  media_json: string | null
  features_json: string | null
  files_json: string | null
  documentation_url: string | null
  productdemo_url: string | null
}

const { request, token, hasPermId } = useAuth()
const canView = computed(() => hasPermId(29))
const canCreate = computed(() => hasPermId(30))
const canManage = computed(() => hasPermId(31))

const products = ref<StaffProduct[]>([])
const categories = ref<Category[]>([])
const loading = ref(true)
const error = ref('')
const msg = ref('')

const formOpen = ref(false)
const editingId = ref<number | null>(null)
const newFeature = ref('')

const form = ref({
  name: '',
  category_id: '',
  short_description: '',
  description: '',
  price: '',
  on_sale: false,
  sale_price: '',
  discount_percent: '',
  requires_license: false,
  max_games_per_license: 3,
  pinned: false,
  active: true,
  features: [] as string[],
  media: [] as MediaEntry[],
  files: [] as FileEntry[],
  documentationUrl: '',
  demoUrl: '',
})

const mediaInput = ref<HTMLInputElement | null>(null)
const filesInput = ref<HTMLInputElement | null>(null)
const uploadingMedia = ref(false)
const uploadingFiles = ref(false)

function parseJson<T>(raw: string | null): T[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    products.value = await request<StaffProduct[]>('/api/staff/products')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load products'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (!canView.value) {
    loading.value = false
    return
  }
  try {
    categories.value = await request<Category[]>('/api/staff/categories')
  } catch {
    categories.value = []
  }
  await load()
})

function openNew() {
  editingId.value = null
  newFeature.value = ''
  form.value = {
    name: '', category_id: '', short_description: '', description: '',
    price: '', on_sale: false, sale_price: '', discount_percent: '',
    requires_license: false, max_games_per_license: 3, pinned: false, active: true,
    features: [], media: [], files: [], documentationUrl: '', demoUrl: '',
  }
  formOpen.value = true
  msg.value = ''
}

function openEdit(p: StaffProduct) {
  editingId.value = p.id
  newFeature.value = ''
  form.value = {
    name: p.name,
    category_id: p.category_id ? String(p.category_id) : '',
    short_description: p.short_description ?? '',
    description: p.description ?? '',
    price: String(p.price ?? ''),
    on_sale: !!p.on_sale,
    sale_price: '',
    discount_percent: '',
    requires_license: !!p.requires_license,
    max_games_per_license: p.max_games_per_license ?? 3,
    pinned: !!p.pinned,
    active: !!p.active,
    features: parseJson<string>(p.features_json).filter((f) => typeof f === 'string'),
    media: parseJson<MediaEntry>(p.media_json).filter(
      (m) => m && (m.type === 'image' || m.type === 'video')
    ),
    files: parseJson<FileEntry>(p.files_json).filter((f) => f && f.path),
    documentationUrl: p.documentation_url ?? '',
    demoUrl: p.productdemo_url ?? '',
  }
  formOpen.value = true
  msg.value = ''
}

function addFeature() {
  const value = newFeature.value.trim()
  if (!value) return
  form.value.features.push(value)
  newFeature.value = ''
}

function removeFeature(index: number) {
  form.value.features.splice(index, 1)
}

function addMedia() {
  form.value.media.push({ type: 'image', name: '', path: '' })
}

function removeMedia(index: number) {
  form.value.media.splice(index, 1)
}

function moveMedia(index: number, dir: number) {
  const target = index + dir
  if (target < 0 || target >= form.value.media.length) return
  const [item] = form.value.media.splice(index, 1)
  form.value.media.splice(target, 0, item)
}

function fileExt(path: string): string {
  return path.split('.').pop()?.toLowerCase() || ''
}

function fmtSize(bytes?: number): string {
  if (!bytes || bytes < 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

async function uploadFile(file: File, kind: 'media' | 'files'): Promise<{ url: string; name: string; size: number }> {
  const res = await fetch(`/api/staff/upload?kind=${kind}&filename=${encodeURIComponent(file.name)}`, {
    method: 'POST',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
      Authorization: token.value ? `Bearer ${token.value}` : '',
    },
    body: file,
  })
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(data.error || `Upload failed (${res.status})`)
  }
  return res.json()
}

async function onMediaChosen(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = ''
  if (!files.length) return
  uploadingMedia.value = true
  for (const f of files) {
    try {
      const { url } = await uploadFile(f, 'media')
      form.value.media.push({
        type: f.type.startsWith('video/') ? 'video' : 'image',
        name: f.name.replace(/\.[^.]+$/, ''),
        path: url,
      })
    } catch (err) {
      msg.value = err instanceof Error ? err.message : 'Upload failed'
    }
  }
  uploadingMedia.value = false
}

async function onFilesChosen(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = ''
  if (!files.length) return
  uploadingFiles.value = true
  for (const f of files) {
    try {
      const { url, name, size } = await uploadFile(f, 'files')
      form.value.files.push({ name, path: url, size })
    } catch (err) {
      msg.value = err instanceof Error ? err.message : 'Upload failed'
    }
  }
  uploadingFiles.value = false
}

async function save() {
  msg.value = ''
  if (!form.value.name.trim()) {
    msg.value = 'Name is required.'
    return
  }
  const media = form.value.media.filter((m) => m.path.trim() !== '')
  const payload = {
    name: form.value.name.trim(),
    category_id: form.value.category_id ? Number(form.value.category_id) : null,
    short_description: form.value.short_description.trim() || null,
    description: form.value.description.trim() || null,
    price: form.value.price ? Number(form.value.price) : 0,
    on_sale: form.value.on_sale,
    sale_price: form.value.sale_price ? Number(form.value.sale_price) : null,
    discount_percent: form.value.discount_percent ? Number(form.value.discount_percent) : null,
    requires_license: form.value.requires_license,
    max_games_per_license: form.value.max_games_per_license,
    pinned: form.value.pinned,
    active: form.value.active,
    features: form.value.features,
    media,
    files: form.value.files.filter((f) => f.path.trim()),
    documentation_url: form.value.documentationUrl.trim() || null,
    productdemo_url: form.value.demoUrl.trim() || null,
  }
  try {
    if (editingId.value) {
      await request(`/api/staff/products/${editingId.value}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
      msg.value = 'Product updated.'
    } else {
      await request('/api/staff/products', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      msg.value = 'Product created.'
    }
    formOpen.value = false
    await load()
  } catch (e) {
    msg.value = e instanceof Error ? e.message : 'Failed to save product'
  }
}

async function remove(p: StaffProduct) {
  if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return
  msg.value = ''
  try {
    await request(`/api/staff/products/${p.id}`, { method: 'DELETE' })
    msg.value = `Deleted ${p.name}.`
    await load()
  } catch (e) {
    msg.value = e instanceof Error ? e.message : 'Failed to delete product'
  }
}

const inputClass = 'w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/60'
const labelClass = 'text-sm font-semibold text-slate-200'
const btnSecondary = 'rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10'
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-sm font-semibold uppercase tracking-widest text-blue-400">Staff panel</p>
        <h2 class="mt-2 text-3xl font-bold tracking-tight text-white lg:text-4xl">Products</h2>
      </div>
      <button
        v-if="canCreate"
        class="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
        @click="formOpen ? (formOpen = false) : openNew()"
      >
        {{ formOpen ? 'Cancel' : 'New product' }}
      </button>
    </div>

    <div
      v-if="!canView"
      class="mt-8 rounded-2xl border border-white/10 bg-white/5 px-6 py-10 text-center"
    >
      <p class="text-sm font-semibold text-slate-400">You don't have access to products.</p>
    </div>

    <template v-else>

    <p v-if="error" class="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
      {{ error }}
    </p>
    <p v-if="msg" class="mt-4 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-300">
      {{ msg }}
    </p>

    <form
      v-if="formOpen && canCreate"
      class="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6"
      @submit.prevent="save"
    >
      <h3 class="text-lg font-semibold text-white">{{ editingId ? 'Edit product' : 'New product' }}</h3>

      <div class="mt-5 grid gap-4 sm:grid-cols-2">
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-semibold text-slate-200">Name *</label>
          <input v-model="form.name" required :class="inputClass" placeholder="KGM-ELS" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-semibold text-slate-200">Category</label>
          <select v-model="form.category_id" :class="inputClass">
            <option value="" class="bg-[#0d1629]">None</option>
            <option v-for="cat in categories" :key="cat.id" :value="String(cat.id)" class="bg-[#0d1629]">
              {{ cat.name }}
            </option>
          </select>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-semibold text-slate-200">Price (incl. VAT) *</label>
          <input v-model="form.price" type="number" step="0.01" min="0" required :class="inputClass" placeholder="8.99" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-semibold text-slate-200">Short description</label>
          <input v-model="form.short_description" :class="inputClass" placeholder="One-line summary under the title" />
        </div>
        <div class="flex flex-col gap-1.5 sm:col-span-2">
          <label class="text-sm font-semibold text-slate-200">Description</label>
          <textarea v-model="form.description" rows="3" :class="inputClass" placeholder="Full product write-up (shown under the images)"></textarea>
        </div>
      </div>

      <div class="mt-5 grid gap-4 sm:grid-cols-3">
        <label class="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <input v-model="form.on_sale" type="checkbox" class="h-4 w-4 rounded border-white/20 bg-white/5 accent-blue-500" />
          On sale
        </label>
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-semibold text-slate-200">Sale price (leave empty for %)</label>
          <input v-model="form.sale_price" type="number" step="0.01" min="0" :class="inputClass" placeholder="6.99" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-semibold text-slate-200">Discount % (used if no sale price)</label>
          <input v-model="form.discount_percent" type="number" step="0.01" min="0" max="100" :class="inputClass" placeholder="20" />
        </div>
      </div>

      <div class="mt-6">
        <div class="flex items-center justify-between gap-3">
          <h4 class="text-sm font-semibold uppercase tracking-wider text-slate-400">Media (first image = store card)</h4>
          <div class="flex gap-2">
            <input ref="mediaInput" type="file" multiple accept="image/*,video/*" class="hidden" @change="onMediaChosen" />
            <button type="button" :class="btnSecondary">{{ uploadingMedia ? 'Uploading…' : 'Upload images/videos' }}</button>
            <button type="button" :class="btnSecondary" @click="addMedia">Add by URL</button>
          </div>
        </div>
        <button type="button" class="mt-2 rounded-lg border border-dashed border-white/20 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/5" @click="mediaInput?.click()">
          Choose files to upload straight to the server
        </button>

        <div v-if="form.media.length === 0" class="mt-3 rounded-lg border border-dashed border-white/15 px-4 py-6 text-center text-sm text-slate-500">
          No media yet — add an image or video.
        </div>

        <ul v-else class="mt-3 flex flex-col gap-2">
          <li
            v-for="(media, index) in form.media"
            :key="index"
            class="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/20 p-3 sm:flex-row sm:items-center"
          >
            <select v-model="media.type" class="w-28 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-400/60">
              <option value="image" class="bg-[#0d1629]">Image</option>
              <option value="video" class="bg-[#0d1629]">Video</option>
            </select>
            <input v-model="media.name" :class="inputClass" class="sm:flex-1" placeholder="Label e.g. KGM-ELS" />
            <input v-model="media.path" :class="inputClass" class="sm:flex-[2]" placeholder="/media/products/1/KGMELS.png or https://…" />
            <div class="flex shrink-0 items-center gap-1">
              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-slate-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
                :disabled="index === 0"
                aria-label="Move up"
                @click="moveMedia(index, -1)"
              >
                ↑
              </button>
              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-slate-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
                :disabled="index === form.media.length - 1"
                aria-label="Move down"
                @click="moveMedia(index, 1)"
              >
                ↓
              </button>
              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                aria-label="Remove media"
                @click="removeMedia(index)"
              >
                ✕
              </button>
            </div>
          </li>
        </ul>

        <p class="mt-2 text-xs text-slate-500">Upload files straight from this page, or paste a path/URL manually.</p>
      </div>

      <div class="mt-6">
        <div class="flex items-center justify-between gap-3">
          <h4 class="text-sm font-semibold uppercase tracking-wider text-slate-400">Files / downloads</h4>
          <input ref="filesInput" type="file" multiple class="hidden" @change="onFilesChosen" />
          <button type="button" :class="btnSecondary" @click="filesInput?.click()">{{ uploadingFiles ? 'Uploading…' : 'Upload files' }}</button>
        </div>

        <div v-if="form.files.length === 0" class="mt-3 rounded-lg border border-dashed border-white/15 px-4 py-6 text-center text-sm text-slate-500">
          No files yet — upload manuals, configs or extras (shown as downloads on the product page).
        </div>

        <ul v-else class="mt-3 flex flex-col gap-2">
          <li
            v-for="(file, index) in form.files"
            :key="index"
            class="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/20 p-3 sm:flex-row sm:items-center"
          >
            <input v-model="file.name" :class="inputClass" class="sm:flex-1" placeholder="Label e.g. User manual" />
            <span class="text-xs text-slate-500 sm:w-20">.{{ fileExt(file.path) || 'file' }} {{ fmtSize(file.size) }}</span>
            <a :href="file.path" target="_blank" :class="btnSecondary" class="text-xs">Open</a>
            <button
              type="button"
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
              aria-label="Remove file"
              @click="form.files.splice(index, 1)"
            >
              ✕
            </button>
          </li>
        </ul>

        <p class="mt-2 text-xs text-slate-500">Files are uploaded directly to the server (stored under /media/products/files/).</p>
      </div>

      <div class="mt-6">
        <div class="flex items-center justify-between gap-3">
          <h4 class="text-sm font-semibold uppercase tracking-wider text-slate-400">Documentation</h4>
          <div class="flex flex-wrap gap-2">
            <button
              v-if="form.documentationUrl.trim()"
              type="button"
              class="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/10"
              @click="form.documentationUrl = ''"
            >
              Remove
            </button>
          </div>
        </div>

        <div class="mt-3 flex items-center gap-2">
          <input
            v-model="form.documentationUrl"
            :class="inputClass"
            placeholder="https://kgmcloud.co.uk/docs/kgm-els"
            @keydown.enter.prevent
          />
          <a
            v-if="form.documentationUrl.trim()"
            :href="form.documentationUrl.trim()"
            target="_blank"
            rel="noopener"
            :class="btnSecondary"
          >
            Open
          </a>
        </div>
        <p class="mt-2 text-xs text-slate-500">
          Product documentation lives on the website — paste the guide link (e.g. https://kgmcloud.co.uk/docs/kgm-els) instead of uploading a file.
        </p>
      </div>

      <div class="mt-6">
        <div class="flex items-center justify-between gap-3">
          <h4 class="text-sm font-semibold uppercase tracking-wider text-slate-400">Demo</h4>
          <div class="flex flex-wrap gap-2">
            <button
              v-if="form.demoUrl.trim()"
              type="button"
              class="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/10"
              @click="form.demoUrl = ''"
            >
              Remove
            </button>
          </div>
        </div>

        <div class="mt-3 flex items-center gap-2">
          <input
            v-model="form.demoUrl"
            :class="inputClass"
            placeholder="https://www.roblox.com/games/123456789/…"
            @keydown.enter.prevent
          />
          <a
            v-if="form.demoUrl.trim()"
            :href="form.demoUrl.trim()"
            target="_blank"
            rel="noopener"
            :class="btnSecondary"
          >
            Open
          </a>
        </div>
        <p class="mt-2 text-xs text-slate-500">
          Optional demo link shown on the product page (e.g. a Roblox game link).
        </p>
      </div>

      <div class="mt-6">
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-semibold uppercase tracking-wider text-slate-400">Features</h4>
          <div class="flex gap-2">
            <input
              v-model="newFeature"
              :class="inputClass"
              class="w-64"
              placeholder="Add a feature…"
              @keydown.enter.prevent="addFeature"
            />
            <button type="button" :class="btnSecondary" @click="addFeature">Add</button>
          </div>
        </div>

        <ul v-if="form.features.length" class="mt-3 flex flex-col gap-2">
          <li
            v-for="(feature, index) in form.features"
            :key="index"
            class="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white"
          >
            <span class="min-w-0 truncate">{{ feature }}</span>
            <button
              type="button"
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
              :aria-label="`Remove feature`"
              @click="removeFeature(index)"
            >
              ✕
            </button>
          </li>
        </ul>
        <p v-else class="mt-3 text-sm text-slate-500">No features listed yet.</p>
      </div>

      <div class="mt-6 flex flex-wrap items-center gap-6 text-sm font-semibold text-slate-200">
        <label class="flex items-center gap-2">
          <input v-model="form.requires_license" type="checkbox" class="h-4 w-4 rounded border-white/20 bg-white/5 accent-blue-500" />
          Requires license
        </label>
        <label class="flex items-center gap-2">
          <span>Games per license</span>
          <input v-model.number="form.max_games_per_license" type="number" min="1" step="1" :class="inputClass" class="w-24" />
        </label>
        <label class="flex items-center gap-2">
          <input v-model="form.pinned" type="checkbox" class="h-4 w-4 rounded border-white/20 bg-white/5 accent-blue-500" />
          Pinned (top of store)
        </label>
        <label class="flex items-center gap-2">
          <input v-model="form.active" type="checkbox" class="h-4 w-4 rounded border-white/20 bg-white/5 accent-blue-500" />
          Active (visible)
        </label>
      </div>

      <div class="mt-6 flex gap-3">
        <button type="submit" class="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500">
          {{ editingId ? 'Save changes' : 'Create product' }}
        </button>
        <button type="button" :class="btnSecondary" @click="formOpen = false">Cancel</button>
      </div>
    </form>

    <div v-if="loading" class="mt-6 space-y-3">
      <div v-for="i in 3" :key="i" class="h-14 animate-pulse rounded-xl border border-white/10 bg-white/5"></div>
    </div>

    <div v-else-if="products.length === 0" class="mt-6 rounded-2xl border border-white/10 bg-white/5 px-6 py-12 text-center">
      <p class="text-sm font-semibold text-white">No products yet</p>
      <p class="mt-1 text-sm text-slate-400">Create your first product with the button above.</p>
    </div>

    <div v-else class="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <div class="hidden grid-cols-[1.6fr_1fr_auto_auto] gap-4 border-b border-white/10 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 sm:grid">
        <span>Product</span>
        <span>Category</span>
        <span>Status</span>
        <span>Actions</span>
      </div>
      <ul class="divide-y divide-white/10">
        <li
          v-for="p in products"
          :key="p.id"
          class="grid grid-cols-1 items-center gap-3 px-6 py-4 sm:grid-cols-[1.6fr_1fr_auto_auto] sm:gap-4"
        >
          <div>
            <p class="truncate text-sm font-semibold text-white">{{ p.name }}</p>
            <p class="text-xs text-slate-500">/products/{{ p.slug }}</p>
          </div>
          <p class="truncate text-sm text-slate-300">{{ p.category_name ?? '—' }}</p>
          <div class="flex flex-wrap gap-1.5">
            <span class="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-300">
              £{{ Number(p.price).toFixed(2) }}
            </span>
            <span v-if="p.on_sale" class="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-400">
              Sale
            </span>
            <span v-if="p.pinned" class="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-400">
              Pinned
            </span>
            <span v-if="p.requires_license" class="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-400">
              {{ p.requires_license ? p.max_games_per_license + ' games' : 'License' }}
            </span>
            <span
              class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              :class="p.active ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'"
            >
              {{ p.active ? 'Active' : 'Hidden' }}
            </span>
          </div>
          <div class="flex gap-2">
            <button v-if="canManage" class="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/10" @click="openEdit(p)">
              Edit
            </button>
            <button v-if="canManage" class="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/10" @click="remove(p)">
              Delete
            </button>
          </div>
        </li>
      </ul>
    </div>
    </template>
  </div>
</template>