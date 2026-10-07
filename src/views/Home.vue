<script setup lang="ts">
import skodaImg from '../assets/images/Skoda.png'
</script>

<template>
  <section class="relative z-10 mx-auto w-full max-w-7xl px-6 py-10 lg:pb-24 lg:pt-24">
    <div class="grid items-center gap-14 lg:grid-cols-2">
      <div class="flex flex-col gap-8">
        <h1 class="text-5xl font-bold leading-tight tracking-tight text-white lg:text-6xl">
          <span class="police-light-left">Emergency</span> <span class="police-light-right">lighting</span>Whatever the mission.
        </h1>
        <p class="max-w-xl text-lg text-slate-300">
          Build lighting your way. KGM-ELS gives you the freedom to create custom patterns, define your own controls and configure complete lighting setups to work exactly how you want.
        </p>

        <div class="flex flex-wrap gap-4">
          <RouterLink
            to="/products/kgm-emergency-lighting-system"
            class="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500"
          >
            Get KGM-ELS
          </RouterLink>
          <RouterLink
            to="/products"
            class="rounded-lg border border-white/15 px-6 py-3 text-sm font-semibold text-white/90 transition-colors hover:border-white/30 hover:bg-white/5"
          >
            Browse the store
          </RouterLink>
        </div>
      </div>

      <div class="relative">
        <img
          :src="skodaImg"
          alt="KGM-ELS patrol vehicle preview"
          class="w-full"
          style="filter: drop-shadow(0 0 24px rgba(26, 92, 204, 0.5)) drop-shadow(0 0 90px rgba(17, 58, 132, 0.3));"
        />
      </div>
    </div>
  </section>
</template>
