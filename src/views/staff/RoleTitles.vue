<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuth } from '../../composables/useAuth'

interface RoleRow {
  id: number
  title: string
  user_count: number
  permission_ids: number[]
  permissions: { id: number; name: string }[]
}

interface PermOpt {
  id: number
  permission_name: string
}

const { request } = useAuth()

const roles = ref<RoleRow[]>([])
const perms = ref<PermOpt[]>([])
const loading = ref(true)
const error = ref('')
const msg = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    roles.value = await request<RoleRow[]>('/api/staff/roles')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load roles'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    perms.value = await request<PermOpt[]>('/api/staff/permissions')
  } catch {
    perms.value = []
  }
  await load()
})

const trashRole = ref<RoleRow | null>(null)
const deleting = ref(false)

async function confirmDelete() {
  if (!trashRole.value) return
  deleting.value = true
  error.value = ''
  try {
    await request(`/api/staff/roles/${trashRole.value.id}`, { method: 'DELETE' })
    msg.value = `Role "${trashRole.value.title}" deleted.`
    trashRole.value = null
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to delete role'
    trashRole.value = null
  } finally {
    deleting.value = false
  }
}

const editor = ref<'create' | 'edit' | null>(null)
const editingRole = ref<RoleRow | null>(null)
const editTitle = ref('')
const editPermIds = ref<number[]>([])
const permSearch = ref('')
const editError = ref('')
const saving = ref(false)

function openCreate() {
  editingRole.value = null
  editTitle.value = ''
  editPermIds.value = []
  permSearch.value = ''
  editError.value = ''
  editor.value = 'create'
}

function openEdit(role: RoleRow) {
  editingRole.value = role
  editTitle.value = role.title
  editPermIds.value = [...role.permission_ids]
  permSearch.value = ''
  editError.value = ''
  editor.value = 'edit'
}

const filteredPerms = computed(() => {
  const q = permSearch.value.trim().toLowerCase()
  if (!q) return perms.value
  return perms.value.filter((p) => p.permission_name.toLowerCase().includes(q))
})

function togglePerm(id: number) {
  const i = editPermIds.value.indexOf(id)
  if (i === -1) editPermIds.value.push(id)
  else editPermIds.value.splice(i, 1)
}

async function save() {
  const title = editTitle.value.trim()
  if (!title) {
    editError.value = 'Title is required'
    return
  }
  saving.value = true
  editError.value = ''
  try {
    if (editor.value === 'create') {
      await request('/api/staff/roles', {
        method: 'POST',
        body: JSON.stringify({ title, permissions: editPermIds.value }),
      })
      msg.value = `Role "${title}" created.`
    } else {
      await request(`/api/staff/roles/${editingRole.value?.id}`, {
        method: 'PUT',
        body: JSON.stringify({ title, permissions: editPermIds.value }),
      })
      msg.value = `Role "${title}" updated.`
    }
    editor.value = null
    await load()
  } catch (e) {
    editError.value = e instanceof Error ? e.message : 'Failed to save role'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-sm font-semibold uppercase tracking-widest text-blue-400">Staff panel</p>
        <h2 class="mt-2 text-3xl font-bold tracking-tight text-white lg:text-4xl">Roles</h2>
        <p class="mt-2 text-sm text-slate-400">Create, edit and delete roles and their permissions.</p>
      </div>

      <button
        type="button"
        class="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
        @click="openCreate"
      >
        New role
      </button>
    </div>

    <p v-if="error" class="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
      {{ error }}
    </p>
    <p v-if="msg" class="mt-4 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-300">
      {{ msg }}
    </p>

    <div v-if="loading" class="mt-6 space-y-3">
      <div v-for="i in 4" :key="i" class="h-16 animate-pulse rounded-xl border border-white/10 bg-white/5"></div>
    </div>

    <div v-else-if="roles.length === 0" class="mt-6 rounded-2xl border border-white/10 bg-white/5 px-6 py-12 text-center">
      <p class="text-sm font-semibold text-white">No roles yet</p>
      <p class="mt-1 text-sm text-slate-400">Create your first role to start assigning permissions.</p>
    </div>

    <div v-else class="mt-6 flex flex-col gap-3">
      <div
        v-for="role in roles"
        :key="role.id"
        class="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center"
      >
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <p class="text-sm font-semibold text-white">{{ role.title }}</p>
            <span class="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-slate-400">
              {{ role.user_count }} {{ role.user_count === 1 ? 'member' : 'members' }}
            </span>
          </div>
          <div class="mt-2 flex flex-wrap gap-1.5">
            <span
              v-for="p in role.permissions"
              :key="p.id"
              class="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 font-mono text-[11px] text-blue-300"
            >
              {{ p.name }}
            </span>
            <span
              v-if="role.permissions.length === 0"
              class="text-xs text-slate-500"
            >
              No permissions
            </span>
          </div>
        </div>

        <div class="flex shrink-0 gap-2">
          <button
            type="button"
            class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
            @click="openEdit(role)"
          >
            Edit
          </button>
          <button
            type="button"
            :disabled="role.user_count > 0"
            :title="role.user_count > 0 ? 'Reassign users first' : undefined"
            class="rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-red-500/10"
            @click="trashRole = role"
          >
            Delete
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="editor"
      class="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm"
      @click.self="editor = null"
    >
      <div class="flex min-h-full p-4">
        <div class="m-auto flex w-full max-w-2xl flex-col rounded-2xl border border-white/10 bg-[#0d1629] p-6 shadow-2xl shadow-black/50">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h3 class="text-lg font-semibold text-white">
              {{ editor === 'create' ? 'New role' : `Edit ${editingRole?.title}` }}
            </h3>
            <p v-if="editor === 'create'" class="mt-0.5 text-xs text-slate-500">Give it a title and pick its permissions</p>
          </div>
          <button
            class="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/10"
            @click="editor = null"
          >
            Close
          </button>
        </div>

        <p v-if="editError" class="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {{ editError }}
        </p>

        <div class="mt-5 flex flex-col gap-4">
          <div>
            <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Title *
            </label>
            <input
              v-model="editTitle"
              type="text"
              :placeholder="'e.g. Customer Experience Team Member'"
              class="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/60"
            />
          </div>

          <div>
            <div class="mb-1.5 flex items-center justify-between gap-3">
              <label class="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Permissions ({{ editPermIds.length }} selected)
              </label>
              <input
                v-model="permSearch"
                type="search"
                placeholder="Filter permissions…"
                class="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/60"
              />
            </div>
            <div class="max-h-72 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-2">
              <button
                v-for="p in filteredPerms"
                :key="p.id"
                type="button"
                class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/5"
                @click="togglePerm(p.id)"
              >
                <span
                  class="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-white/20"
                  :class="editPermIds.includes(p.id) ? 'bg-blue-600 border-blue-600' : 'bg-transparent'"
                >
                  <svg
                    v-if="editPermIds.includes(p.id)"
                    class="h-3.5 w-3.5 text-white"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" />
                  </svg>
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate font-mono text-xs text-slate-200">{{ p.permission_name }}</span>
                  <span class="block text-[11px] text-slate-500">ID {{ p.id }}</span>
                </span>
              </button>
              <p v-if="filteredPerms.length === 0" class="px-3 py-2 text-sm text-slate-500">
                No permissions match.
              </p>
            </div>
          </div>
        </div>

        <div class="mt-5 flex items-center justify-between gap-2 border-t border-white/10 pt-4">
          <p class="text-xs text-slate-500">Changes apply to everyone with this role instantly.</p>
          <div class="flex items-center gap-2">
            <button
              class="rounded-lg border border-white/15 bg-white/5 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              @click="editor = null"
            >
              Cancel
            </button>
            <button
              :disabled="saving"
              class="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              @click="save"
            >
              {{ saving ? 'Saving…' : editor === 'create' ? 'Create role' : 'Save changes' }}
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>

    <div
      v-if="trashRole"
      class="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm"
      @click.self="trashRole = null"
    >
      <div class="flex min-h-full p-4">
      <div class="m-auto w-full max-w-md rounded-2xl border border-white/10 bg-[#0d1629] p-6 shadow-2xl shadow-black/50">
        <h3 class="text-lg font-semibold text-white">Delete "{{ trashRole.title }}"?</h3>
        <p class="mt-1 text-xs text-slate-500">Role ID {{ trashRole.id }}</p>
        <p v-if="trashRole.user_count > 0" class="mt-4 text-sm text-red-300">
          This role is assigned to {{ trashRole.user_count }}
          {{ trashRole.user_count === 1 ? 'member' : 'members' }} and cannot be deleted.
          Reassign or fire them first.
        </p>
        <p v-else class="mt-4 text-sm text-slate-300">
          This will permanently delete the role. This cannot be undone.
        </p>

        <div class="mt-5 flex items-center gap-2">
          <button
            :disabled="deleting || trashRole.user_count > 0"
            class="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-red-600/30 transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
            @click="confirmDelete"
          >
            {{ deleting ? 'Deleting…' : 'Delete role' }}
          </button>
          <button
            class="rounded-lg border border-white/15 bg-white/5 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            @click="trashRole = null"
          >
            Cancel
          </button>
        </div>
</div>
      </div>
  </div>
  </div>
</template>
