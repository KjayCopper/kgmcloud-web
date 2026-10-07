<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<template>
  <div class="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-16 text-center">
    <h2 class="text-3xl font-bold tracking-tight text-white">{{ title }}</h2>
    <p class="mt-2 text-sm text-slate-400">This page is coming soon.</p>
  </div>
</template>