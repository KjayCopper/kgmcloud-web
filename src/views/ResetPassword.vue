<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const route = useRoute()
const { resetPassword, checkResetToken } = useAuth()

const token = String(route.query.token || '')

const status = ref<'checking' | 'invalid' | 'ready'>('checking')
const checkError = ref('')

const password = ref('')
const confirm = ref('')
const loading = ref(false)
const error = ref('')
const done = ref(false)

onMounted(async () => {
  if (!token) {
    status.value = 'invalid'
    return
  }
  try {
    const valid = await checkResetToken(token)
    status.value = valid ? 'ready' : 'invalid'
  } catch (e) {
    checkError.value = e instanceof Error ? e.message : 'Something went wrong'
    status.value = 'invalid'
  }
})

async function submit() {
  if (loading.value) return
  error.value = ''
  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters'
    return
  }
  if (password.value !== confirm.value) {
    error.value = 'Passwords do not match'
    return
  }
  loading.value = true
  try {
    await resetPassword(token, password.value)
    done.value = true
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Something went wrong'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="mx-auto w-full max-w-md px-6 pb-16 pt-10 lg:pt-16">
    <div v-if="done" class="text-center">
      <p class="text-sm font-semibold uppercase tracking-widest text-blue-400">Done</p>
      <h2 class="mt-3 text-4xl font-bold tracking-tight text-white lg:text-5xl">Password updated</h2>
      <p class="mt-4 text-slate-300">Your password has been changed. You can now sign in.</p>
      <RouterLink
        to="/login"
        class="mt-10 inline-block rounded-lg bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500"
      >
        Sign in
      </RouterLink>
    </div>

    <div v-else-if="status === 'checking'" class="text-center">
      <p class="text-sm font-semibold uppercase tracking-widest text-blue-400">Password</p>
      <h2 class="mt-3 text-4xl font-bold tracking-tight text-white lg:text-5xl">Checking link…</h2>
      <div class="mt-10">
        <div class="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-blue-400"></div>
      </div>
    </div>

    <div v-else-if="status === 'invalid'" class="text-center">
      <p class="text-sm font-semibold uppercase tracking-widest text-blue-400">Password</p>
      <h2 class="mt-3 text-4xl font-bold tracking-tight text-white lg:text-5xl">Invalid or expired link</h2>
      <div class="mt-10 flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/5 p-8">
        <p class="text-slate-300">
          {{ checkError || 'This reset link is invalid, expired, or has already been used.' }}
        </p>
        <RouterLink to="/forgot-password" class="rounded-lg bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500">
          Request a new link
        </RouterLink>
      </div>
    </div>

    <template v-else>
      <div class="text-center">
        <p class="text-sm font-semibold uppercase tracking-widest text-blue-400">Password</p>
        <h2 class="mt-3 text-4xl font-bold tracking-tight text-white lg:text-5xl">Set a new password</h2>
        <p class="mt-4 text-slate-300">Choose a new password for your account.</p>
      </div>

      <form
        class="mt-10 flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/5 p-8"
        @submit.prevent="submit"
      >
        <div class="flex flex-col gap-2">
          <label for="password" class="text-sm font-semibold text-slate-200">New password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            autocomplete="new-password"
            placeholder="At least 8 characters"
            class="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/60"
          />
        </div>

        <div class="flex flex-col gap-2">
          <label for="confirm" class="text-sm font-semibold text-slate-200">Confirm password</label>
          <input
            id="confirm"
            v-model="confirm"
            type="password"
            required
            autocomplete="new-password"
            placeholder="Repeat your password"
            class="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/60"
          />
        </div>

        <p v-if="error" class="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
          {{ error }}
        </p>

        <button
          type="submit"
          :disabled="loading"
          class="mt-2 rounded-lg bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ loading ? 'Updating…' : 'Update password' }}
        </button>
      </form>
    </template>
  </section>
</template>