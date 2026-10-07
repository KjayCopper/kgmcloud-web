<script setup lang="ts">
const cookies = [
  {
    name: 'kgm_basket',
    purpose: 'Strictly necessary. Stores a reference for your checkout so your order can be matched and receipted correctly while you are redirected to the payment provider.',
    lifetime: '6 hours',
  },
  {
    name: 'kgm_consent',
    purpose: 'Records your acceptance of this cookie policy so the consent banner is not shown again.',
    lifetime: '1 year',
  },
]
</script>

<template>
  <section class="mx-auto w-full max-w-4xl px-6 pb-16 pt-10 lg:pb-24 lg:pt-16">
    <p class="text-sm font-semibold uppercase tracking-widest text-blue-400">Legal</p>
    <h2 class="mt-3 text-4xl font-bold tracking-tight text-white lg:text-5xl">Cookie Policy</h2>
    <p class="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Last updated: 19 September 2026</p>

    <div class="mt-8 flex flex-col gap-4 rounded-2xl border border-amber-400/40 bg-amber-500/10 p-6 sm:flex-row sm:items-center" role="region" aria-label="Cookie consent">
      <i class="fa-solid fa-cookie-bite text-2xl text-amber-300" aria-hidden="true"></i>
      <div class="min-w-0 flex-1">
        <h3 class="text-lg font-semibold text-white">Strictly necessary only</h3>
        <p class="mt-1 text-sm text-slate-300">
          This site uses cookies only to run the store and remember whether you have accepted this policy. No advertising
          or tracking cookies are used. If you do not accept cookies, please do not use the site.
        </p>
      </div>
    </div>

    <div class="mt-10 flex flex-col gap-8">
      <div>
        <h3 class="text-lg font-semibold text-white">How we use cookies</h3>
        <p class="mt-2 text-sm leading-relaxed text-slate-300">
          KGM Cloud uses a small number of cookies so the store works properly. We do not use cookies for advertising,
          analytics, or to track you across other websites.
        </p>
      </div>

      <div>
        <h3 class="text-lg font-semibold text-white">Cookies on this site</h3>
        <div class="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          <div class="hidden grid-cols-[auto_1fr_auto] gap-4 border-b border-white/10 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 sm:grid">
            <span class="w-36">Cookie</span>
            <span>Purpose</span>
            <span class="w-24 text-right">Lifetime</span>
          </div>
          <ul class="divide-y divide-white/10">
            <li v-for="c in cookies" :key="c.name" class="grid grid-cols-1 gap-1 px-6 py-4 sm:grid-cols-[auto_1fr_auto] sm:items-start sm:gap-4">
              <code class="font-mono text-xs font-bold text-white sm:w-36">{{ c.name }}</code>
              <p class="text-sm text-slate-300">{{ c.purpose }}</p>
              <span class="text-xs text-slate-500 sm:w-24 sm:text-right">{{ c.lifetime }}</span>
            </li>
          </ul>
        </div>
      </div>

      <div>
        <h3 class="text-lg font-semibold text-white">Storage in your browser</h3>
        <p class="mt-2 text-sm leading-relaxed text-slate-300">
          When you sign in, your session and account details are stored locally in your browser (localStorage) and used to
          keep you signed in. Your cart is also stored locally so it survives page refreshes. This data stays on your
          device and is not read by third parties.
        </p>
      </div>

      <div>
        <h3 class="text-lg font-semibold text-white">Withdrawing consent</h3>
        <p class="mt-2 text-sm leading-relaxed text-slate-300">
          You can withdraw consent at any time by clearing your browser cookies and localStorage. If you do not accept
          cookies, you should not use this site, and its checkout will not work without the strictly necessary
          <code class="font-mono text-xs text-slate-200">kgm_basket</code> cookie.
        </p>
      </div>
    </div>
  </section>
</template>