<script setup lang="ts">
const sections = [
  {
    title: '1. What you are buying',
    body:
      'All products supplied by KGM Cloud are digital content: downloadable software, scripts, systems, configuration packs, licences and other electronic files delivered to your account. No physical goods are shipped.',
  },
  {
    title: '2. Immediate supply of digital content',
    body:
      'Once we have successfully received your payment, we begin supplying the digital content immediately. Download access, unless it is already available to you, is made available in your account as soon as practical after payment is confirmed. Because of this, the following express consent applies to every order.',
  },
  {
    title: '3. Express consent and waiver of the right to cancel',
    body:
      'Under the Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013 you normally have 14 days from placing an order to cancel it (the \u201ccooling-off period\u201d). For digital content, that right is lost once supply begins if you have given express consent to supply starting immediately and you acknowledge that you lose the right to cancel.',
  },
  {
    title: '4. What your consent means in practice',
    body:
      'By ticking the consent box at checkout you confirm, on every order: (a) you agree that supply of the digital content begins immediately after your payment is accepted; (b) you give your express consent to the supply beginning during the 14-day cooling-off period; and (c) you acknowledge that, because you do so, you waive your right to cancel the order under the 14-day cooling-off provisions once supply has begun.',
  },
  {
    title: '5. Cancellation before supply begins',
    body:
      'A cancellation request made before your purchase has been fully processed and the digital content supplied may be honoured where possible. Because supply of digital content happens automatically on successful payment, the practical window for this is very short. Once download access, a licence key or the digital files have been made available to you, supply is treated as having begun.',
  },
  {
    title: '6. No refunds after delivery',
    body:
      'Refunds are therefore not available for orders for digital content that has been supplied, because the 14-day right to cancel has been expressly waived as described above. This does not affect your statutory rights under the Consumer Rights Act 2015: if digital content is faulty, defective or not as described, you remain entitled to a repair, replacement or a refund as provided by law.',
  },
  {
    title: '7. Faulty or misdescribed content',
    body:
      'If a product is broken, incomplete, or does not match its listing, contact us and we will investigate. Where the issue is confirmed, we will repair or replace the content, or provide a refund, in accordance with the Consumer Rights Act 2015. Nothing in this policy removes your statutory rights.',
  },
  {
    title: '8. How to contact us',
    body:
      'For any enquiry about this policy, or to report a problem with a purchase, use the account tools or contact our support team. We will respond as soon as possible.',
  },
  {
    title: '9. How the law applies across the United Kingdom',
    body:
      'Consumer protection law for digital content applies across the whole of the United Kingdom. The Consumer Rights Act 2015 and the Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013 give you the same rights in every part of the UK, whether you live in:',
    points: [
      'England and Wales, enforced through the County Court;',
      'Scotland, enforceable through the Sheriff Court, with independent consumer advice available from Consumer Advice Scotland;',
      'Northern Ireland, enforced through the County Court, with consumer advice available from Consumerline.',
    ],
  },
  {
    title: '10. Governing law',
    body:
      'This policy is governed by the laws of the United Kingdom as they apply in England and Wales, Scotland, and Northern Ireland. Nothing in this policy limits or removes any of your statutory rights in any part of the United Kingdom.',
  },
]
</script>

<template>
  <section class="mx-auto w-full max-w-4xl px-6 pb-16 pt-10 lg:pb-24 lg:pt-16">
    <p class="text-sm font-semibold uppercase tracking-widest text-blue-400">Legal</p>
    <h2 class="mt-3 text-4xl font-bold tracking-tight text-white lg:text-5xl">
      Digital Products, Cancellation &amp; Refunds
    </h2>
    <p class="mt-4 max-w-2xl text-slate-300">
      This policy explains when digital content is supplied, how the 14-day right to cancel works for digital products,
      and how we handle waivers and refunds. It applies across the whole of the United Kingdom (England and Wales,
      Scotland, and Northern Ireland), alongside our Terms of Service.
    </p>
    <p class="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Last updated: 19 September 2026</p>

    <div class="mt-8 rounded-2xl border border-amber-400/40 bg-amber-500/10 p-6">
      <h3 class="text-sm font-bold uppercase tracking-wider text-amber-200">In short</h3>
      <p class="mt-1.5 text-sm leading-relaxed text-slate-200">
        You will be asked to tick a box at checkout confirming that you want your digital product supplied immediately
        after payment and that you consent to the 14-day statutory cooling-off period starting now, waiving your right to
        cancel once the product has been delivered. So digital products are <strong>non-refundable after delivery</strong>,
        except where they are faulty, defective or not as described.
      </p>
    </div>

    <div class="mt-10 flex flex-col gap-6">
      <div v-for="s in sections" :key="s.title" class="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 class="text-lg font-semibold text-white">{{ s.title }}</h3>
        <p class="mt-2 text-sm leading-relaxed text-slate-300">{{ s.body }}</p>
        <ul v-if="s.points" class="mt-2 flex flex-col gap-1.5 text-sm text-slate-300">
          <li v-for="p in s.points" :key="p" class="flex items-start gap-2">
            <i class="fa-solid fa-check mt-0.5 text-xs text-blue-400" aria-hidden="true"></i>
            <span>{{ p }}</span>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>