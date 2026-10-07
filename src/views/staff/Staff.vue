<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuth } from '../../composables/useAuth'
import { openUserProfile } from '../../utils/openUserProfile'

interface StaffUser {
  id: number
  firstname: string
  email: string
  role: number | null
  team: number | null
  role_title: string | null
  team_name: string | null
  direct_permissions: string | null
  created_at: string
}

interface RoleOpt {
  id: number
  title: string
}

interface TeamOpt {
  id: number
  team_name: string
}

interface PermOpt {
  id: number
  permission_name: string
}

const { request } = useAuth()

const staff = ref<StaffUser[]>([])
const roles = ref<RoleOpt[]>([])
const teams = ref<TeamOpt[]>([])
const perms = ref<PermOpt[]>([])
const loading = ref(true)
const error = ref('')
const msg = ref('')
const search = ref('')

const isStaffMember = (m: StaffUser) => m.role != null && Number(m.role) > 0

async function load() {
  loading.value = true
  error.value = ''
  try {
    const q = search.value.trim()
    staff.value = await request<StaffUser[]>(`/api/staff/users${q ? `?search=${encodeURIComponent(q)}` : ''}`)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load users'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    roles.value = await request<RoleOpt[]>('/api/staff/role-titles')
  } catch {
    roles.value = []
  }
  try {
    teams.value = await request<TeamOpt[]>('/api/staff/teams')
  } catch {
    teams.value = []
  }
  try {
    perms.value = await request<PermOpt[]>('/api/staff/permissions')
  } catch {
    perms.value = []
  }
  await load()
})

const hireUser = ref<StaffUser | null>(null)
const hireRole = ref('')
const hireTeam = ref('')
const hireError = ref('')
const hiring = ref(false)

function startHire(m: StaffUser) {
  hireUser.value = m
  hireRole.value = ''
  hireTeam.value = ''
  hireError.value = ''
}

async function confirmHire() {
  if (!hireUser.value) return
  if (!hireRole.value) {
    hireError.value = 'Please choose a role'
    return
  }
  hiring.value = true
  hireError.value = ''
  try {
    await request(`/api/staff/users/${hireUser.value.id}/role`, {
      method: 'PUT',
      body: JSON.stringify({
        role: Number(hireRole.value),
        team: hireTeam.value ? Number(hireTeam.value) : null,
      }),
    })
    msg.value = `${hireUser.value.firstname} has been hired as ${hireRoleTitle()}.`
    hireUser.value = null
    await load()
  } catch (e) {
    hireError.value = e instanceof Error ? e.message : 'Failed to hire'
  } finally {
    hiring.value = false
  }
}

function hireRoleTitle(): string {
  const id = Number(hireRole.value)
  return roles.value.find((r) => r.id === id)?.title || 'staff'
}

const fireUser = ref<StaffUser | null>(null)
const firing = ref(false)

function startFire(m: StaffUser) {
  fireUser.value = m
}

async function confirmFire() {
  if (!fireUser.value) return
  firing.value = true
  error.value = ''
  try {
    await request(`/api/staff/users/${fireUser.value.id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role: null, team: null }),
    })
    msg.value = `${fireUser.value.firstname} has been removed from staff.`
    fireUser.value = null
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to fire'
  } finally {
    firing.value = false
  }
}

const editUser = ref<StaffUser | null>(null)
const editRole = ref('')
const editTeam = ref('')
const editPermIds = ref<number[]>([])
const editError = ref('')
const savingEdit = ref(false)

function startEdit(m: StaffUser) {
  editUser.value = m
  editRole.value = m.role != null ? String(m.role) : ''
  editTeam.value = m.team != null ? String(m.team) : ''
  editPermIds.value = String(m.direct_permissions || '')
    .split(',')
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0)
  editError.value = ''
}

function toggleEditPerm(id: number) {
  const i = editPermIds.value.indexOf(id)
  if (i === -1) editPermIds.value.push(id)
  else editPermIds.value.splice(i, 1)
}

async function saveEdit() {
  if (!editUser.value) return
  savingEdit.value = true
  editError.value = ''
  try {
    await request(`/api/staff/users/${editUser.value.id}/role`, {
      method: 'PUT',
      body: JSON.stringify({
        role: editRole.value ? Number(editRole.value) : null,
        team: editTeam.value ? Number(editTeam.value) : null,
        permissions: editPermIds.value,
      }),
    })
    msg.value = `Permissions updated for ${editUser.value.firstname}.`
    editUser.value = null
    await load()
  } catch (e) {
    editError.value = e instanceof Error ? e.message : 'Failed to save'
  } finally {
    savingEdit.value = false
  }
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-sm font-semibold uppercase tracking-widest text-blue-400">Staff panel</p>
        <h2 class="mt-2 text-3xl font-bold tracking-tight text-white lg:text-4xl">Staff</h2>
        <p class="mt-1 text-xs text-slate-500">Roster · hire and fire accounts to control the staff team</p>
      </div>

      <form class="flex gap-2" @submit.prevent="load">
        <input
          v-model="search"
          type="search"
          placeholder="Search by name or email…"
          class="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/60"
        />
        <button
          type="submit"
          class="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
        >
          Search
        </button>
      </form>
    </div>

    <p v-if="error" class="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
      {{ error }}
    </p>
    <p v-if="msg" class="mt-4 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-300">
      {{ msg }}
    </p>

    <div v-if="loading" class="mt-6 space-y-3">
      <div v-for="i in 5" :key="i" class="h-14 animate-pulse rounded-xl border border-white/10 bg-white/5"></div>
    </div>

    <div v-else-if="staff.length === 0" class="mt-6 rounded-2xl border border-white/10 bg-white/5 px-6 py-12 text-center">
      <p class="text-sm font-semibold text-white">No users found</p>
      <p v-if="search" class="mt-1 text-sm text-slate-400">Try a different search.</p>
    </div>

    <div v-else class="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <div class="hidden grid-cols-[1.2fr_1.4fr_1fr_1fr_auto] gap-4 border-b border-white/10 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 sm:grid">
        <span>Name</span>
        <span>Email</span>
        <span>Team</span>
        <span>Role</span>
        <span>Actions</span>
      </div>
      <ul class="divide-y divide-white/10">
        <li
          v-for="member in staff"
          :key="member.id"
          class="grid grid-cols-1 items-center gap-3 px-6 py-4 sm:grid-cols-[1.2fr_1.4fr_1fr_1fr_auto] sm:gap-4"
        >
          <div class="flex items-center gap-3">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/30 text-xs font-bold text-blue-200">
              {{ member.firstname?.[0] ?? '?' }}
            </span>
            <div>
              <p class="truncate text-sm font-semibold text-white">{{ member.firstname }}</p>
              <p class="text-xs text-slate-500">ID {{ member.id }}</p>
            </div>
          </div>

          <p class="truncate text-sm text-slate-300">{{ member.email }}</p>

          <p class="truncate text-sm text-slate-300">{{ member.team_name ?? '—' }}</p>

          <div>
            <span
              v-if="isStaffMember(member)"
              class="inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-300"
            >
              {{ member.role_title ?? 'Staff' }}
            </span>
            <span
              v-else
              class="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-semibold text-slate-300"
            >
              Customer
            </span>
          </div>

          <div class="flex gap-2">
            <button
              v-if="!isStaffMember(member)"
              type="button"
              class="w-fit rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-500"
              @click="startHire(member)"
            >
              Hire
            </button>
            <button
              v-else
              type="button"
              class="w-fit rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/20"
              @click="startFire(member)"
            >
              Fire
            </button>
            <button
              type="button"
              class="w-fit rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/10"
              @click="openUserProfile(member.id)"
            >
              View
            </button>
            <button
              type="button"
              class="w-fit rounded-lg border border-blue-500/25 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-300 transition-colors hover:bg-blue-500/20"
              @click="startEdit(member)"
            >
              Edit
            </button>
          </div>
        </li>
      </ul>
    </div>

    <div
      v-if="hireUser"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      @click.self="hireUser = null"
    >
      <div class="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d1629] p-6 shadow-2xl shadow-black/50">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h3 class="text-lg font-semibold text-white">Hire {{ hireUser.firstname }}</h3>
            <p class="mt-0.5 text-xs text-slate-500">{{ hireUser.email }}</p>
          </div>
          <button
            class="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/10"
            @click="hireUser = null"
          >
            Close
          </button>
        </div>

        <p v-if="hireError" class="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {{ hireError }}
        </p>

        <div class="mt-5 flex flex-col gap-4">
          <div>
            <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Role *
            </label>
            <select
              v-model="hireRole"
              class="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none transition-colors focus:border-blue-400/60"
            >
              <option value="" class="bg-[#0d1629]">Choose a role…</option>
              <option v-for="r in roles" :key="r.id" :value="String(r.id)" class="bg-[#0d1629]">
                {{ r.title }}
              </option>
            </select>
          </div>

          <div>
            <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Team (optional)
            </label>
            <select
              v-model="hireTeam"
              class="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none transition-colors focus:border-blue-400/60"
            >
              <option value="" class="bg-[#0d1629]">None</option>
              <option v-for="t in teams" :key="t.id" :value="String(t.id)" class="bg-[#0d1629]">
                {{ t.team_name }}
              </option>
            </select>
          </div>
        </div>

        <div class="mt-5 flex items-center gap-2">
          <button
            :disabled="hiring"
            class="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            @click="confirmHire"
          >
            {{ hiring ? 'Hiring…' : 'Hire' }}
          </button>
          <button
            class="rounded-lg border border-white/15 bg-white/5 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            @click="hireUser = null"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="fireUser"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      @click.self="fireUser = null"
    >
      <div class="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d1629] p-6 shadow-2xl shadow-black/50">
        <h3 class="text-lg font-semibold text-white">Fire {{ fireUser.firstname }}?</h3>
        <p class="mt-1 text-xs text-slate-500">{{ fireUser.email }}</p>
        <p class="mt-4 text-sm text-slate-300">
          This will remove {{ fireUser.firstname }} from staff and clear their role and team. They keep their account.
        </p>

        <div class="mt-5 flex items-center gap-2">
          <button
            :disabled="firing"
            class="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-red-600/30 transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
            @click="confirmFire"
          >
            {{ firing ? 'Firing…' : 'Fire' }}
          </button>
          <button
            class="rounded-lg border border-white/15 bg-white/5 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            @click="fireUser = null"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="editUser"
        class="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm"
        @click.self="editUser = null"
      >
        <div class="flex min-h-full items-start justify-center p-4 sm:pt-24">
          <div class="m-auto w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0d1629] p-6 shadow-2xl shadow-black/50">
            <div class="flex items-center justify-between gap-4">
              <div>
                <h3 class="text-lg font-semibold text-white">Edit {{ editUser.firstname }}</h3>
                <p class="mt-0.5 text-xs text-slate-500">{{ editUser.email }}</p>
              </div>
              <button
                class="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/10"
                @click="editUser = null"
              >
                Close
              </button>
            </div>

            <p v-if="editError" class="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {{ editError }}
            </p>

            <div class="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Role
                </label>
                <select
                  v-model="editRole"
                  class="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none transition-colors focus:border-blue-400/60"
                >
                  <option value="" class="bg-[#0d1629]">No role (customer)</option>
                  <option v-for="r in roles" :key="r.id" :value="String(r.id)" class="bg-[#0d1629]">
                    {{ r.title }}
                  </option>
                </select>
              </div>

              <div>
                <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Team
                </label>
                <select
                  v-model="editTeam"
                  class="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none transition-colors focus:border-blue-400/60"
                >
                  <option value="" class="bg-[#0d1629]">No team</option>
                  <option v-for="t in teams" :key="t.id" :value="String(t.id)" class="bg-[#0d1629]">
                    {{ t.team_name }}
                  </option>
                </select>
              </div>
            </div>

            <div class="mt-5">
              <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Individual permissions ({{ editPermIds.length }} selected)
              </label>
              <div class="max-h-72 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-2">
                <button
                  v-for="p in perms"
                  :key="p.id"
                  type="button"
                  class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/5"
                  @click="toggleEditPerm(p.id)"
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
              </div>
            </div>

            <div class="mt-5 flex items-center justify-end gap-2 border-t border-white/10 pt-4">
              <button
                class="rounded-lg border border-white/15 bg-white/5 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                @click="editUser = null"
              >
                Cancel
              </button>
              <button
                :disabled="savingEdit"
                class="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                @click="saveEdit"
              >
                {{ savingEdit ? 'Saving…' : 'Save changes' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>