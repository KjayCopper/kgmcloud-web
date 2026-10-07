<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const { register, resendVerification } = useAuth()

const firstname = ref('')
const surname = ref('')
const email = ref('')
const password = ref('')
const confirm = ref('')
const tos = ref(false)
const marketing = ref(false)
const error = ref('')
const loading = ref(false)

const registeredEmail = ref('')
const resending = ref(false)
const resendMsg = ref('')

async function submit() {
  if (loading.value) return
  error.value = ''
  if (!tos.value) {
    error.value = 'You must accept the Terms of Service to create an account'
    return
  }
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
    await register(firstname.value.trim(), surname.value.trim(), email.value.trim(), password.value, tos.value, marketing.value)
    registeredEmail.value = email.value.trim()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Something went wrong'
  } finally {
    loading.value = false
  }
}

async function resend() {
  if (resending.value) return
  resending.value = true
  resendMsg.value = ''
  try {
    await resendVerification(registeredEmail.value)
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
    <div v-if="registeredEmail" class="text-center">
      <p class="text-sm font-semibold uppercase tracking-widest text-blue-400">Almost there</p>
      <h2 class="mt-3 text-4xl font-bold tracking-tight text-white lg:text-5xl">Check your inbox</h2>
      <p class="mt-4 text-slate-300">
        We sent a verification link to
        <span class="font-semibold text-white">{{ registeredEmail }}</span>. Click it to activate
        your account, then sign in.
      </p>

      <div class="mt-10 flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/5 p-8">
        <p class="text-sm text-slate-400">
          Didn’t get the email? Check your spam folder, or send it again.
        </p>
        <button
          :disabled="resending"
          class="rounded-lg bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          @click="resend"
        >
          {{ resending ? 'Sending…' : 'Resend verification email' }}
        </button>
        <p v-if="resendMsg" class="text-sm text-slate-300">{{ resendMsg }}</p>
      </div>

      <p class="mt-8 text-sm text-slate-400">
        Already verified?
        <RouterLink to="/login" class="font-semibold text-blue-400 transition-colors hover:text-blue-300">
          Sign in
        </RouterLink>
      </p>
    </div>

    <template v-else>
      <div class="text-center">
        <p class="text-sm font-semibold uppercase tracking-widest text-blue-400">Join KGM Cloud</p>
        <h2 class="mt-3 text-4xl font-bold tracking-tight text-white lg:text-5xl">Create account</h2>
        <p class="mt-4 text-slate-300">One account to manage your purchases and licenses.</p>
      </div>

      <form
        class="mt-10 flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/5 p-8"
        @submit.prevent="submit"
      >
        <div class="flex flex-col gap-2">
          <label for="firstname" class="text-sm font-semibold text-slate-200">First name</label>
          <input
            id="firstname"
            v-model="firstname"
            type="text"
            required
            autocomplete="given-name"
            placeholder="Kjay"
            class="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/60"
          />
        </div>

        <div class="flex flex-col gap-2">
          <label for="surname" class="text-sm font-semibold text-slate-200">Surname</label>
          <input
            id="surname"
            v-model="surname"
            type="text"
            required
            autocomplete="family-name"
            placeholder="Smith"
            class="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-400/60"
          />
        </div>

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

        <label
          for="tos"
          class="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3"
        >
          <input
            id="tos"
            v-model="tos"
            type="checkbox"
            class="mt-0.5 h-4 w-4 shrink-0 accent-blue-600"
          />
          <span class="text-sm text-slate-400">
            I have read and agree to the
            <RouterLink to="/terms" class="font-semibold text-blue-400 transition-colors hover:text-blue-300">
              Terms of Service
            </RouterLink>.
          </span>
        </label>

        <label
          for="marketing"
          class="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3"
        >
          <input
            id="marketing"
            v-model="marketing"
            type="checkbox"
            class="mt-0.5 h-4 w-4 shrink-0 accent-blue-600"
          />
          <span class="text-sm text-slate-400">
            I'd like to receive emails about new products, offers and updates. You can opt out at any time. See our
            <RouterLink to="/privacy" class="font-semibold text-blue-400 transition-colors hover:text-blue-300">
              Privacy Policy
            </RouterLink>.
          </span>
        </label>

        <p v-if="error" class="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
          {{ error }}
        </p>

        <button
          type="submit"
          :disabled="loading"
          class="mt-2 rounded-lg bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ loading ? 'Creating account…' : 'Create account' }}
        </button>
      </form>

      <p class="mt-8 text-center text-sm text-slate-400">
        Already have an account?
        <RouterLink to="/login" class="font-semibold text-blue-400 transition-colors hover:text-blue-300">
          Sign in
        </RouterLink>
      </p>
    </template>
  </section>
</template>