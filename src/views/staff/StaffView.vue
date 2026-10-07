<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuth } from '../../composables/useAuth'
import { roleTitle, STAFF_ROLE_KEYS } from '../../lib/roles'

interface StaffDetail {
  id: number
  firstname: string
  email: string
  role: string
  email_verified: number
  created_at: string
}

const props = defineProps<{ id: string }>()

const { request } = useAuth()
const detail = ref<StaffDetail | null>(null)
const loading = ref(true)
const error = ref('')
const msg = ref('')
const saving = ref(false)

const memberEditable = computed(() => !!detail.value)

const roleOptions = computed(() => ['customer', ...STAFF_ROLE_KEYS])

async function load() {
  try {
    detail.value = await request<StaffDetail>(`/api/staff/users/${props.id}`)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load staff member'
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function saveRole() {
  if (!detail.value) return
  saving.value = true
  msg.value = ''
  try {
    await request(`/api/staff/users/${detail.value.id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role: detail.value.role }),
    })
    msg.value = 'Role saved.'
  } catch (e) {
    msg.value = e instanceof Error ? e.message : 'Failed to save'
    await load()
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <div v-if="loading" class="space-y-4">
      <div class="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/5"></div>
      <div class="h-48 animate-pulse rounded-2xl border border-white/10 bg-white/5"></div>
    </div>

    <div v-else-if="error || !detail" class="rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-12 text-center">
      <p class="text-sm font-semibold text-red-300">{{ error || 'Staff member not found' }}</p>
    </div>

    <template v-else>
      <RouterLink to="/staff/staff" class="text-sm font-semibold text-blue-400 hover:text-blue-300">
        ← Back to staff
      </RouterLink>

      <div class="mt-4 flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-6">
        <span class="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/30 text-2xl font-bold text-blue-200">
          {{ detail.firstname?.[0] ?? '?' }}
        </span>
        <div class="min-w-0">
          <h2 class="text-3xl font-bold tracking-tight text-white">{{ detail.firstname }}</h2>
          <p class="mt-1 truncate text-sm text-slate-300">{{ detail.email }}</p>
          <div class="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span class="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-bold text-blue-300">
              {{ roleTitle(detail.role) }}
            </span>
            <span
              class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              :class="detail.email_verified ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'"
            >
              {{ detail.email_verified ? 'Verified' : 'Not verified' }}
            </span>
            <span class="text-slate-500">Joined {{ new Date(detail.created_at).toLocaleDateString() }}</span>
          </div>
        </div>
      </div>

      <div v-if="memberEditable" class="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 class="text-lg font-semibold text-white">Role</h3>
        <div class="mt-3 flex flex-wrap items-center gap-3">
          <select
            v-model="detail.role"
            class="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white outline-none transition-colors focus:border-blue-400/60"
          >
            <option v-for="role in roleOptions" :key="role" :value="role" class="bg-[#0d1629]">
              {{ roleTitle(role) }}
            </option>
          </select>
          <button
            :disabled="saving"
            class="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            @click="saveRole"
          >
            {{ saving ? 'Saving…' : 'Save role' }}
          </button>
          <span v-if="msg" class="text-sm text-blue-300">{{ msg }}</span>
        </div>
      </div>
    </template>
  </div>
</template>