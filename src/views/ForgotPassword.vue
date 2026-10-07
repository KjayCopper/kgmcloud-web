<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const { forgotPassword } = useAuth()

const email = ref('')
const loading = ref(false)
const sent = ref(false)
const error = ref('')

async function submit() {
  if (loading.value) return
  error.value = ''
  loading.value = true
  try {
    await forgotPassword(email.value.trim())
    sent.value = true
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Something went wrong'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="mx-auto w-full max-w-md px-6 pb-16 pt-10 lg:pt-16">
    <div v-if="sent" class="text-center">
      <p class="text-sm font-semibold uppercase tracking-widest text-blue-400">Check your inbox</p>
      <h2 class="mt-3 text-4xl font-bold tracking-tight text-white lg:text-5xl">Reset link sent</h2>
      <p class="mt-4 text-slate-300">
        If an account exists for
        <span class="font-semibold text-white">{{ email.trim() }}</span>, we’ve sent a reset link.
        The link expires in 15 minutes.
      </p>

      <div class="mt-10 flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/5 p-8">
        <p class="text-sm text-slate-400">
          Didn’t get the email? Check your spam folder, then try again.
        </p>
        <RouterLink
          to="/login"
          class="rounded-lg bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500"
        >
          Back to sign in
        </RouterLink>
      </div>
    </div>

    <template v-else>
      <div class="text-center">
        <p class="text-sm font-semibold uppercase tracking-widest text-blue-400">Password</p>
        <h2 class="mt-3 text-4xl font-bold tracking-tight text-white lg:text-5xl">Forgot password?</h2>
        <p class="mt-4 text-slate-300">
          Enter your email and we’ll send you a link to set a new password.
        </p>
      </div>

      <form
        class="mt-10 flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/5 p-8"
        @submit.prevent="submit"
      >
        <div class="flex flex-col gap-2">
          <label for="email" class="text-sm font-semibold text-slate-200">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            autocomplete="email"
            placeholder="you@example.com"
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
          {{ loading ? 'Sending link…' : 'Send reset link' }}
        </button>
      </form>

      <p class="mt-8 text-center text-sm text-slate-400">
        Remembered it?
        <RouterLink to="/login" class="font-semibold text-blue-400 transition-colors hover:text-blue-300">
          Sign in
        </RouterLink>
      </p>
    </template>
  </section>
</template>