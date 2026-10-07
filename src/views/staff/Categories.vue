<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuth } from '../../composables/useAuth'

interface Category {
  id: number
  name: string
  slug: string
}

const { request, hasPermId } = useAuth()
const canView = computed(() => hasPermId(26))
const canCreate = computed(() => hasPermId(27))
const canManage = computed(() => hasPermId(28))

const categories = ref<Category[]>([])
const loading = ref(true)
const error = ref('')
const msg = ref('')

const newName = ref('')
const creating = ref(false)
const creatingError = ref('')

const editingId = ref<number | null>(null)
const editName = ref('')
const savingName = ref(false)
const nameError = ref('')

const deleteConfirmId = ref<number | null>(null)
const deletingId = ref<number | null>(null)

async function load() {
  loading.value = true
  error.value = ''
  try {
    categories.value = await request<Category[]>('/api/staff/categories')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load categories'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (canView.value) load()
})

async function create() {
  const name = newName.value.trim()
  if (!name) return
  creatingError.value = ''
  creating.value = true
  try {
    await request<{ ok: boolean }>('/api/staff/categories', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
    newName.value = ''
    msg.value = 'Category added.'
    await load()
  } catch (e) {
    creatingError.value = e instanceof Error ? e.message : 'Failed to add category'
  } finally {
    creating.value = false
  }
}

function startEdit(category: Category) {
  editingId.value = category.id
  editName.value = category.name
  nameError.value = ''
}

async function saveEdit(category: Category) {
  const name = editName.value.trim()
  if (!name) {
    nameError.value = 'Name required'
    return
  }
  savingName.value = true
  nameError.value = ''
  try {
    await request(`/api/staff/categories/${category.id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    })
    editingId.value = null
    msg.value = 'Category updated.'
    await load()
  } catch (e) {
    nameError.value = e instanceof Error ? e.message : 'Failed to update category'
  } finally {
    savingName.value = false
  }
}

async function remove(category: Category) {
  if (deletingId.value) return
  if (deleteConfirmId.value !== category.id) {
    deleteConfirmId.value = category.id
    return
  }
  deleteConfirmId.value = null
  deletingId.value = category.id
  try {
    await request(`/api/staff/categories/${category.id}`, { method: 'DELETE' })
    msg.value = `Category "${category.name}" removed. Products using it were left uncategorised.`
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to delete category'
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <div>
    <div class="mb-6">
      <p class="text-sm font-semibold uppercase tracking-widest text-blue-400">Staff panel</p>
      <h2 class="mt-2 text-3xl font-bold tracking-tight text-white lg:text-4xl">Categories</h2>
      <p class="mt-2 text-sm text-slate-400">Create, rename and remove product categories.</p>
    </div>

    <div
      v-if="!canView"
      class="mt-8 rounded-2xl border border-white/10 bg-white/5 px-6 py-10 text-center"
    >
      <p class="text-sm font-semibold text-slate-400">You don't have access to categories.</p>
    </div>

    <template v-if="canView">
    <p v-if="msg" class="mb-4 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-300">
      {{ msg }}
    </p>
    <p v-if="error" class="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
      {{ error }}
    </p>

    <form
      v-if="canCreate"
      class="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 sm:flex-row sm:items-center"
      @submit.prevent="create"
    >
      <div class="min-w-0 flex-1">
        <input
          v-model="newName"
          type="text"
          placeholder="New category name (e.g. Game Passes)"
          class="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/60"
        />
        <p v-if="creatingError" class="mt-2 text-sm text-red-400">{{ creatingError }}</p>
      </div>
      <button
        :disabled="creating"
        class="shrink-0 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
      >
        {{ creating ? 'Adding…' : 'Add category' }}
      </button>
    </form>

    <div v-if="loading" class="mt-6 space-y-3">
      <div v-for="i in 4" :key="i" class="h-12 animate-pulse rounded-xl border border-white/10 bg-white/5"></div>
    </div>

    <div v-else-if="categories.length === 0" class="mt-6 rounded-2xl border border-white/10 bg-white/5 px-6 py-12 text-center">
      <p class="text-sm font-semibold text-white">No categories yet</p>
      <p class="mt-1 text-sm text-slate-400">Add your first category above.</p>
    </div>

    <ul v-else class="mt-6 flex flex-col gap-3">
      <li
        v-for="category in categories"
        :key="category.id"
        class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4"
      >
        <div class="min-w-0">
          <template v-if="editingId === category.id">
            <div class="flex items-center gap-2">
              <input
                v-model="editName"
                type="text"
                class="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white outline-none transition-colors focus:border-blue-400/60"
              />
              <button
                :disabled="savingName"
                class="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-60"
                @click="saveEdit(category)"
              >
                {{ savingName ? 'Saving…' : 'Save' }}
              </button>
              <button
                class="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/10"
                @click="editingId = null"
              >
                Cancel
              </button>
            </div>
            <p v-if="nameError" class="mt-2 text-sm text-red-400">{{ nameError }}</p>
          </template>
          <template v-else>
            <p class="truncate text-base font-semibold text-white">{{ category.name }}</p>
            <p class="mt-0.5 text-xs text-slate-500">/{{ category.slug }}</p>
          </template>
        </div>

        <div class="shrink-0">
          <template v-if="editingId !== category.id && canManage">
            <button
              class="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/10"
              @click="startEdit(category)"
            >
              Rename
            </button>
            <button
              class="ml-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/20"
              :disabled="deletingId !== null"
              @click="remove(category)"
            >
              {{
                deletingId === category.id
                  ? 'Removing…'
                  : deleteConfirmId === category.id
                    ? 'Confirm delete'
                    : 'Delete'
              }}
            </button>
          </template>
        </div>
      </li>
    </ul>
    </template>
  </div>
</template>