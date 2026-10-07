<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuth } from './composables/useAuth'

const { isLoggedIn, refreshMe, logout } = useAuth()

onMounted(async () => {
  if (!isLoggedIn.value) return
  try {
    await refreshMe()
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg.includes('Invalid token') || msg.includes('Not logged in')) logout()
  }
})
</script>

<template>
  <RouterView />
</template>