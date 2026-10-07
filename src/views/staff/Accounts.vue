<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuth } from '../../composables/useAuth'
import { roleTitle } from '../../lib/roles'
import { openUserProfile } from '../../utils/openUserProfile'

interface Account {
  id: number
  firstname: string
  email: string
  role: number | string | null
  role_title?: string | null
  email_verified: number
  created_at: string
}

const { hasPerm } = useAuth()
const canEdit = hasPerm('customers.edit')
const canViewCustomers = hasPerm('view.customer')

const { request } = useAuth()
const accounts = ref<Account[]>([])
const loading = ref(true)
const error = ref('')
const search = ref('')

function displayRole(account: Account): string {
  if (account.role == null || Number(account.role) === 0) return 'Customer'
  return account.role_title || roleTitle(Number(account.role)) || ''
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const q = search.value.trim()
    accounts.value = await request<Account[]>(`/api/staff/accounts${q ? `?search=${encodeURIComponent(q)}` : ''}`)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load customers'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-sm font-semibold uppercase tracking-widest text-blue-400">Staff panel</p>
        <h2 class="mt-2 text-3xl font-bold tracking-tight text-white lg:text-4xl">Customers</h2>
        <p class="mt-1 text-xs text-slate-500">All registered users · view only{{ canEdit ? '' : ', contact an Operating Manager to edit' }}</p>
      </div>

      <form v-if="canViewCustomers" class="flex gap-2" @submit.prevent="load">
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

    <template v-if="canViewCustomers">
    <p v-if="error" class="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
      {{ error }}
    </p>

    <div v-if="loading" class="mt-6 space-y-3">
      <div v-for="i in 3" :key="i" class="h-14 animate-pulse rounded-xl border border-white/10 bg-white/5"></div>
    </div>

    <div v-if="!error && !loading && accounts.length === 0" class="mt-6 rounded-2xl border border-white/10 bg-white/5 px-6 py-12 text-center">
      <p class="text-sm font-semibold text-white">No users found</p>
      <p v-if="search" class="mt-1 text-sm text-slate-400">Try a different search.</p>
    </div>

    <div v-if="!error && !loading && accounts.length > 0" class="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
      <table class="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead>
          <tr class="border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <th class="py-3 pl-6">Name</th>
            <th class="py-3">Email</th>
            <th class="py-3 text-center">Role</th>
            <th class="py-3 text-center">Verified</th>
            <th class="py-3 text-center">Joined</th>
            <th class="py-3 pr-6 text-center">View</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/10">
          <tr v-for="account in accounts" :key="account.id" class="transition-colors hover:bg-white/5">
            <td class="py-4 pl-6">
              <div class="flex items-center gap-3">
                <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/30 text-xs font-bold text-blue-200">
                  {{ account.firstname?.[0] ?? '?' }}
                </span>
                <div>
                  <p class="truncate font-semibold text-white">{{ account.firstname }}</p>
                  <p class="text-xs text-slate-500">ID {{ account.id }}</p>
                </div>
              </div>
            </td>

            <td class="py-4">
              <p class="truncate text-slate-300">{{ account.email }}</p>
            </td>

            <td class="py-4 text-center">
              <span class="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-semibold text-blue-300">
                {{ displayRole(account) }}
              </span>
            </td>

            <td class="py-4 text-center">
              <span
                class="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                :class="account.email_verified ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'"
              >
                {{ account.email_verified ? 'Yes' : 'No' }}
              </span>
            </td>

            <td class="py-4 text-center text-slate-500">{{ new Date(account.created_at).toLocaleDateString() }}</td>

            <td class="py-4 pr-6 text-center">
              <button
                type="button"
                class="inline-flex rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/10"
                @click="openUserProfile(account.id)"
              >
                View
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    </template>
  </div>
</template>