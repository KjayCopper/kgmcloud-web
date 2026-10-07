<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const route = useRoute()
const { login, resendVerification } = useAuth()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const unverified = ref(false)
const resending = ref(false)
const resendMsg = ref('')

async function submit() {
  if (loading.value) return
  error.value = ''
  unverified.value = false
  loading.value = true
  try {
    await login(email.value.trim(), password.value)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
    router.push(redirect && redirect.startsWith('/') ? redirect : '/')
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Something went wrong'
    if (msg === 'Email not verified') {
      unverified.value = true
      error.value = ''
    } else {
      error.value = msg
    }
  } finally {
    loading.value = false
  }
}

async function resend() {
  if (resending.value) return
  resending.value = true
  resendMsg.value = ''
  try {
    await resendVerification(email.value.trim())
    resendMsg.value = 'Verification email sent. Check your inbox.'
  } catch (e) {
    resendMsg.value = e instanceof Error ? e.message : 'Something went wrong'
  } finally {
    resending.value = false
  }
}
</script>

<template>
  <section class="mx-auto w-full max-w-md px-6 pb-16 pt-10 lg:pt-16">
    <div class="text-center">
      <p class="text-sm font-semibold uppercase tracking-widest text-blue-400">Welcome back</p>
      <h2 class="mt-3 text-4xl font-bold tracking-tight text-white lg:text-5xl">Sign in</h2>
      <p class="mt-4 text-slate-300">Access your account, licenses and classic tools.</p>
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

      <div class="flex flex-col gap-2">
        <label for="password" class="text-sm font-semibold text-slate-200">Password</label>
        <input
          id="password"
          v-model="password"
          type="password"
          required
          autocomplete="current-password"
          placeholder="••••••••"
          class="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/60"
        />
      </div>

      <div v-if="unverified" class="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
        <p class="text-sm text-amber-300">
          Your email isn’t verified yet. Check your inbox, or send the link again.
        </p>
        <button
          type="button"
          :disabled="resending"
          class="mt-2 text-sm font-semibold text-amber-200 underline decoration-amber-400 underline-offset-2 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          @click="resend"
        >
          {{ resending ? 'Sending…' : 'Resend verification email' }}
        </button>
        <p v-if="resendMsg" class="mt-1 text-sm text-amber-200/80">{{ resendMsg }}</p>
      </div>

      <p v-if="error" class="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
        {{ error }}
      </p>

      <button
        type="submit"
        :disabled="loading"
        class="mt-2 rounded-lg bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ loading ? 'Signing in…' : 'Sign in' }}
      </button>
    </form>

    <div class="mt-8 flex flex-col items-center gap-1 text-center text-sm text-slate-400">
      <p>
        Don’t have an account?
        <RouterLink to="/register" class="font-semibold text-blue-400 transition-colors hover:text-blue-300">
          Create one
        </RouterLink>
      </p>
      <RouterLink to="/forgot-password" class="font-semibold text-slate-500 transition-colors hover:text-slate-300">
        Forgot password?
      </RouterLink>
    </div>
  </section>
</template>