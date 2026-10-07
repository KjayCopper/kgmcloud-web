<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useAuth } from '../../composables/useAuth'
import { loadRoleTitles } from '../../lib/roles'

const { hasPermId, request } = useAuth()

const pendingOrders = ref(0)
let pendingTimer: ReturnType<typeof setInterval> | null = null

async function loadPendingOrders() {
  try {
    const res = await request<{ ok: boolean; pending?: number }>('/api/staff/order-requests/pending-count')
    if (res && typeof res.pending === 'number') pendingOrders.value = res.pending
  } catch { /* ignore — permission or network error */ }
}

interface NavItem {
  label: string
  to: string
  show: boolean
  badge?: number
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const groups = computed<NavGroup[]>(() => {
  const result: NavGroup[] = [
    {
      title: 'General',
      items: [
        { label: 'Dashboard', to: '/staff', show: true },
      ],
    },
  ]

  if (hasPermId(7)) {
    result.push({
      title: 'Customer Experience Team',
      items: [
        { label: 'Customer Experience Dashboard', to: '/staff/cx-dashboard', show: true },
        { label: 'Tickets', to: '/staff/tickets', show: true },
        { label: 'Customers', to: '/staff/customers', show: true },
        { label: 'Order Requests', to: '/staff/order-requests', show: hasPermId(24), badge: pendingOrders.value || undefined },
        { label: 'Discounts', to: '/staff/discounts', show: hasPermId(34) },
      ],
    })
  }

  if (hasPermId(25)) {
    result.push({
      title: 'Product Development Team',
      items: [
        { label: 'Categories', to: '/staff/categories', show: true },
        { label: 'Products', to: '/staff/products', show: true },
        { label: 'Bug Reports', to: '/staff/bug-reports', show: true },
      ],
    })
  }

  if (hasPermId(33)) {
    result.push({
      title: 'Administration',
      items: [
        { label: 'Staff', to: '/staff/staff', show: true },
        { label: 'Roles', to: '/staff/roles', show: true },
        { label: 'Teams', to: '/staff/teams', show: true },
        { label: 'Settings', to: '/staff/settings', show: true },
        { label: 'View Stats', to: '/staff/view-stats', show: true },
        { label: 'Disputes', to: '/staff/disputes', show: true },
      ],
    })
  }

  return result
    .map((g) => ({ ...g, items: g.items.filter((item) => item.show) }))
    .filter((g) => g.items.length > 0)
})

onMounted(async () => {
  await loadRoleTitles(request)
  if (hasPermId(24)) {
    await loadPendingOrders()
    pendingTimer = setInterval(loadPendingOrders, 30000)
  }
})

onBeforeUnmount(() => {
  if (pendingTimer) clearInterval(pendingTimer)
})
</script>

<template>
  <section class="mx-auto w-full max-w-7xl px-6 pb-16 pt-8 lg:pb-20">
    <div class="flex flex-col gap-6 lg:flex-row lg:gap-10">
      <aside class="lg:w-60 lg:shrink-0">
        <nav class="flex flex-col gap-6">
          <div v-for="group in groups" :key="group.title">
            <p class="px-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">{{ group.title }}</p>
            <div class="mt-1 flex flex-col gap-1">
              <RouterLink
                v-for="item in group.items"
                :key="item.to"
                :to="item.to"
                class="flex items-center justify-between gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                active-class="bg-white/10 text-white"
              >
                <span>{{ item.label }}</span>
                <span
                  v-if="item.badge"
                  class="shrink-0 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white"
                >
                  {{ item.badge }}
                </span>
              </RouterLink>
            </div>
          </div>
        </nav>
      </aside>

      <main class="min-w-0 flex-1">
        <RouterView />
      </main>
    </div>
  </section>
</template>