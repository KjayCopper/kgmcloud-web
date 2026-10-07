<script setup lang="ts">
import kjayCopperPhoto from '../assets/images/profiles/KjayCopper.png'
import sammyHarrisonPhoto from '../assets/images/profiles/S_Harrison.png'

const values = [
  {
    title: 'Reliable performance',
    description:
      'Products tested in real servers before release, so they hold up under heavy roleplay traffic.',
  },
  {
    title: 'Fully customisable',
    description:
      'Every system is customisable and configurable, so you can make it work exactly how you need it.',
  },
  {
    title: 'Built for the community',
    description:
      'We make tools we use ourselves and shape them around what communities actually need.',
  },
  {
    title: 'Always improving',
    description:
      'Regular updates, clear documentation and open support keep everything moving forward.',
  },
]

const team = [
  { name: 'KjayCopper', role: 'Managing Director & Lead Developer', initials: 'KC', photo: kjayCopperPhoto },
  { name: 'Sammy_Harrison', role: 'Customer Experience Team Manager', initials: 'SH', photo: sammyHarrisonPhoto },
  { name: 'Placeholder Two', role: 'UI / UX Designer', initials: 'P2', photo: null, hidden: true },
]
</script>

<template>
  <section class="mx-auto w-full max-w-7xl px-6 pb-16 pt-10 lg:pb-24 lg:pt-16">
    <div class="max-w-3xl">
      <p class="text-sm font-semibold uppercase tracking-widest text-blue-400">About KGM Cloud</p>
      <h2 class="mt-3 text-4xl font-bold tracking-tight text-white lg:text-5xl">
        Digital tools for the modern Roblox server
      </h2>
      <p class="mt-6 text-lg leading-relaxed text-slate-300">
        KGM Cloud builds digital products that keep Roblox roleplay running smoothly. From our
        customisable KGM Emergency Lighting System (KGM-ELS) to the tools and assets that help create immersive roleplay, we focus on one
        thing: giving communities the tools and assets they need to tell better stories, with less hassle
        behind the scenes.
      </p>
    </div>

    <div class="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <article
        v-for="value in values"
        :key="value.title"
        class="rounded-2xl border border-white/10 bg-white/5 p-6 transition-colors hover:border-white/20 hover:bg-white/10"
      >
        <div class="mb-4 h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500/30 to-cyan-500/30 p-0.5">
          <div class="flex h-full w-full items-center justify-center rounded-[10px] bg-black/40">
            <span class="h-2.5 w-2.5 rounded-full bg-blue-400"></span>
          </div>
        </div>
        <h3 class="text-lg font-semibold text-white">{{ value.title }}</h3>
        <p class="mt-2 text-sm leading-relaxed text-slate-300">{{ value.description }}</p>
      </article>
    </div>

    <div class="mt-24">
      <div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p class="text-sm font-semibold uppercase tracking-widest text-blue-400">The team</p>
          <h3 class="mt-3 text-3xl font-bold tracking-tight text-white lg:text-4xl">
            The people behind KGM Cloud
          </h3>
        </div>
      </div>

      <div class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <template v-for="member in team" :key="member.name">
          <article
            v-if="!member.hidden"
            class="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 transition-colors hover:bg-white/10"
          >
            <img
              v-if="member.photo"
              :src="member.photo"
              :alt="member.name"
              class="h-14 w-14 shrink-0 rounded-full border border-white/10 object-cover"
            />
            <div
              v-else
              class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-lg font-black text-white"
            >
              {{ member.initials }}
            </div>
            <div>
              <h4 class="font-semibold text-white">{{ member.name }}</h4>
              <p class="text-sm text-slate-300">{{ member.role }}</p>
            </div>
          </article>
        </template>
      </div>
    </div>
  </section>
</template>