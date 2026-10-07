<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const route = useRoute()
const { verifyEmail } = useAuth()

const status = ref<'loading' | 'success' | 'error'>('loading')
const message = ref('')

onMounted(async () => {
  const email = String(route.query.email || '')
  const token = String(route.query.token || '')
  if (!email || !token) {
    status.value = 'error'
    message.value = 'This verification link is incomplete or invalid.'
    return
  }
  try {
    await verifyEmail(email, token)
    status.value = 'success'
    message.value = 'Your email is verified. You can now sign in.'
  } catch (e) {
    status.value = 'error'
    message.value = e instanceof Error ? e.message : 'Something went wrong'
  }
})
</script>

<template>
  <section class="mx-auto w-full max-w-md px-6 pb-16 pt-10 lg:pt-16">
    <div class="text-center">
      <p class="text-sm font-semibold uppercase tracking-widest text-blue-400">
        Account verification
      </p>
      <h2 class="mt-3 text-4xl font-bold tracking-tight text-white lg:text-5xl">
        {{ status === 'loading' ? 'Verifying…' : status === 'success' ? 'Email verified' : 'Verification failed' }}
      </h2>

      <div
        v-if="status !== 'loading'"
        class="mt-10 rounded-2xl border border-white/10 bg-white/5 p-8"
      >
        <p class="text-slate-300">{{ message }}</p>
        <RouterLink
          v-if="status === 'success'"
          to="/login"
          class="mt-6 inline-block rounded-lg bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500"
        >
          Sign in
        </RouterLink>
      </div>

      <div v-else class="mt-10">
        <div class="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-blue-400"></div>
      </div>
    </div>
  </section>
</template>