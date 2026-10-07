<script setup lang="ts">
import { computed } from 'vue'
import { useAuth } from '../../composables/useAuth'
import TicketTable from '../../components/TicketTable.vue'

const { hasPermId } = useAuth()
const canView = computed(() => hasPermId(32))
</script>

<template>
  <div>
    <div v-if="!canView" class="mb-6">
      <p class="text-sm font-semibold uppercase tracking-widest text-blue-400">Product Development Team</p>
      <h2 class="mt-2 text-3xl font-bold tracking-tight text-white lg:text-4xl">Bug Reports</h2>
    </div>

    <div
      v-if="!canView"
      class="mt-8 rounded-2xl border border-white/10 bg-white/5 px-6 py-10 text-center"
    >
      <p class="text-sm font-semibold text-slate-400">You don't have access to bug reports.</p>
    </div>

    <TicketTable v-else title="Bug reports" team="Product Development Team" :teamId="2" from="bug-reports" />
  </div>
</template>