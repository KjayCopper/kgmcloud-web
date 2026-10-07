<script setup lang="ts">
const sections = [
  {
    title: '1. About KGM Cloud',
    body:
      'KGM Cloud (referred to in these Terms as \u201cwe\u201d, \u201cus\u201d or \u201cour\u201d) supplies digital products and tools for Roblox roleplay servers, led by KGM-ELS, a fully customisable emergency lighting system with Vehicle-to-Vehicle (V2V) synchronisation. Our trading details are: KGM Cloud (a trading name) operated by Kieran McCrudden at 75 Norman Rise, Livingston, West Lothian EH54 6LZ. You can contact us at Info@kgmcloud.co.uk or using the support tools inside your account. For the purposes of these Terms, KGM Cloud is a trader providing digital content to consumers.',
  },
  {
    title: '2. Definitions',
    body:
      'In these Terms the following words have these meanings:',
    points: [
      'Account: the customer account you create on the KGM Cloud website.',
      'We / Us / Our: KGM Cloud, the trader supplying the products.',
      'You / Your: the person using the website, creating an account, or purchasing a product.',
      'Product: any digital content, system, script, configuration pack, tool, documentation or licence supplied by us.',
      'Order: a request to purchase one or more Products placed by you at checkout.',
      'Digital Content: any product supplied to you in electronic form, including downloads and licence keys.',
      'Licence: the permission granted to you to use a Product in accordance with these Terms and any applicable product terms.',
      'Process, Services and Licencing: definitions are provided where they appear below.',
    ],
  },
  {
    title: '3. Your KGM Cloud Account',
    body:
      'Some Products require an account so that you can manage your purchases, downloads and licences. When creating an account you must provide accurate and complete information, and you must keep it up to date. You are responsible for keeping your login details confidential, and for all activity that happens through your account. You must be at least 13 years old to use this site or create an account; if you are under 16 you confirm that your parent or guardian has agreed to these Terms on your behalf. We may refuse to register, or suspend, an account in accordance with section 12.',
  },
  {
    title: '4. Products',
    body:
      'Our Products are digital only; no physical goods are shipped. Each Product listing describes what you are buying, its requirements, and any licence or account requirements. Prices shown are in pounds sterling (GBP) and include VAT applying to the order where required by law. Product listings and pricing may change at any time, but the price you pay is the price shown at the moment you place your Order. Following successful payment, that price is fixed for that Order.',
  },
  {
    title: '5. Orders and Payments',
    body:
      'When you place an Order you are making an offer to purchase the Products in your cart. A contract is formed when we accept your payment successfully. Payment is processed securely through our payment provider (SumUp). You must not use the Services in breach of our Acceptable Use terms. We may decline or refuse to accept an Order in certain circumstances, including where we suspect fraud, misuse or a breach of these Terms. Discount codes may be applied to Orders subject to the rules shown when the code is created; a code is only consumed on successful payment.',
  },
  {
    title: '6. Digital Delivery',
    body:
      'Once your payment is confirmed, we begin supplying the Digital Content immediately. Products are delivered to your Account: you will get access to downloads, configuration packs, documentation and, where applicable, the licence keys issued to your Account. Where a product requires a licence, the key is generated and linked to your Account during the Order. If delivery is interrupted or fails, we will re-send or restore your access without additional charge. The consent you give at checkout (see section 7) applies to every Order.',
  },
  {
    title: '7. Digital Content and Cancellation',
    body:
      'Under the Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013 you normally have 14 days from placing an Order to cancel it. Because our Products are digital content supplied immediately, that right is lost once supply begins where you have given express consent and acknowledged that you lose the right to cancel. At checkout you are asked to give that express consent and acknowledgement: by ticking the consent box you agree that supply begins immediately after payment, you consent to supply during the 14-day cooling-off period, and you waive the right to cancel once the Product has been delivered. Full details are in our Digital Products, Cancellation & Refunds policy.',
  },
  {
    title: '8. Refunds and Consumer Rights',
    body:
      'Because of the express consent in section 7, refunds are not available for Digital Content that has been supplied. This does not affect your statutory rights under the Consumer Rights Act 2015: if a Product is faulty, defective, broken or not as described, you are entitled to a repair, a replacement or a refund as provided by law, and we will honour that. Where a refund is due, it will be issued to the original payment method unless you agree otherwise. Nothing in these Terms removes or limits any rights you have as a consumer under the laws of the United Kingdom.',
  },
  {
    title: '9. Product Licences',
    body:
      'Products that require a licence are issued to you as a licence key linked to your Account. A licence is personal to you and non-transferable. Each licence key may be linked to up to the number of Roblox games shown for that product (by default a maximum of three linked games at one time); if you change games, your used slot is freed when you unlink a game. You may use a licensed Product only for your own purposes. You may not resell, redistribute, sublicense, share, publish or give away a licence key, a Product, or the files or documentation that make up a Product.',
  },
  {
    title: '10. Intellectual Property',
    body:
      'All Products, and all source code, scripts, assets, files, documentation, branding, names and trademarks associated with KGM Cloud, are owned by or licensed to KGM Cloud. Buying a Product grants you only the limited licence described in these Terms; it does not transfer ownership, and you acquire no other rights to the underlying intellectual property. You may not copy, modify, create derivative works from, reverse engineer, decompile or otherwise extract source code or assets from a Product, except where we have expressly allowed it in the Product\u2019s documentation.',
  },
  {
    title: '11. Acceptable Use',
    body:
      'When using the website, your Account or our Products you must not:',
    points: [
      'resell, redistribute, sublicense or give away our Products or files, or offer them as part of another product or service;',
      'share, publish or allow others to use your licence keys;',
      'bypass, crack, disable or interfere with any licence or DRM controls, or help others to do so;',
      'reverse engineer, decompile or extract source code from any Product;',
      'use our Products in a way that breaks the Roblox Terms of Use, or the terms of any platform your servers run on;',
      'use the website or your Account to commit fraud, misrepresent who you are, or interfere with the service. ',
    ],
  },
  {
    title: '12. Account, Licence and Service Enforcement',
    body:
      'If you breach these Terms, including the Acceptable Use rules, we may take any of the following steps, in our reasonable judgement: issue a warning; suspend or terminate your Account; revoke or suspend a licence key or access to a Product; or cancel an Order without a refund where the breach has caused the Order to be lost or misused. We are not obliged to do this in any particular order. Genuinely faulty or misdescribed Products are handled under section 8 and are not affected by this section. If you believe action has been taken against you in error, contact us and we will review it.',
  },
  {
    title: '13. Third-Party Services',
    body:
      'Our Products run on the Roblox platform. Roblox Corporation is not a party to these Terms, and the operation of your servers and games on Roblox is subject to the Roblox Terms of Use and Community Rules. If your Roblox account or a server is affected by Roblox\u2019s own enforcement, that is between you and Roblox; we are not responsible for third-party platform actions. Payments are processed by SumUp, whose terms apply to the payment transaction itself. Links to third parties on our site are not endorsements, and we are not responsible for their content.',
  },
  {
    title: '14. Website and Service Availability',
    body:
      'We aim to keep the website, checkout and Account features available and reliable, but we do not guarantee that they will be uninterrupted or error-free. We may carry out maintenance and scheduled downtime, and we may update products, documentation and features at any time. Where an interruption to our own systems prevents you from downloading a product you have bought, we will restore access as soon as reasonably possible.',
  },
  {
    title: '15. Liability',
    body:
      'Nothing in these Terms limits or excludes our liability for death or personal injury caused by our negligence, for fraud or fraudulent misrepresentation, or for anything that cannot lawfully be limited or excluded for a consumer in the United Kingdom. To the extent permitted by law, and subject to your statutory rights in section 8, our total liability to you for any loss arising out of or in connection with these Terms or an Order will not exceed the amount you paid for the Products concerned. We are not liable for indirect or consequential losses such as lost profits, lost data, or interruptions to your Roblox servers, except where that would be unlawful. Products are provided using reasonable care and skill; you are responsible for using them in line with their documentation.',
  },
  {
    title: '16. Changes to KGM Cloud and These Terms',
    body:
      'We may update the Products, the website and these Terms from time to time. Where a change to these Terms affects you, we will tell you (for example by email or an in-account announcement) before it takes effect, and you may cancel any continuing use of your Account or the service if you do not agree. The Terms in force at the time an Order is placed apply to that Order. Continuing to use the site or your Account after a change takes effect means you accept the updated Terms.',
  },
  {
    title: '17. Governing Law and Jurisdiction',
    body:
      'These Terms are governed by the laws of the United Kingdom as they apply in England and Wales, Scotland, and Northern Ireland, and they give consumers in each of those jurisdictions the same rights. Nothing removes any statutory protection that applies to you where you live. If a dispute arises, you may bring proceedings in the courts of the country in which you live, and we submit to the jurisdiction of the courts of the United Kingdom.',
  },
  {
    title: '18. Complaints and Contact',
    body:
      'If you are unhappy about anything, contact us first and we will do our best to resolve it. You can reach us at Info@kgmcloud.co.uk or through the support tools in your Account, and we will respond as soon as possible. If we cannot resolve a complaint, you can get free, independent advice from your local consumer advice service: Citizens Advice (England and Wales), Consumer Advice Scotland (Scotland), or Consumerline (Northern Ireland). These organisations may refer matters to Trading Standards where appropriate, and this does not affect any rights you have to seek a remedy through the courts.',
  },
  {
    title: '19. General Terms',
    body:
      'These Terms (together with the Digital Products, Cancellation & Refunds policy, the Cookie Policy and any product documentation) form the entire agreement between you and us about your use of the website and your Orders. If any part of these Terms is found to be invalid or unenforceable, the rest continues to apply. Our failure to enforce a term is not a waiver of it. We may transfer our rights and obligations under these Terms to another business as part of a sale or reorganisation, but that will not affect your rights. Nothing in these Terms creates rights for any third party.',
  },
]
</script>

<template>
  <section class="mx-auto w-full max-w-4xl px-6 pb-16 pt-10 lg:pb-24 lg:pt-16">
    <p class="text-sm font-semibold uppercase tracking-widest text-blue-400">Legal</p>
    <h2 class="mt-3 text-4xl font-bold tracking-tight text-white lg:text-5xl">Terms of Service</h2>
    <p class="mt-4 max-w-2xl text-slate-300">
      These Terms apply across the whole of the United Kingdom and form the contract between you and KGM Cloud when you
      use this website, create an account, or buy a digital product. Please read them alongside our
      <RouterLink to="/digital-products" class="font-semibold text-blue-300 underline decoration-blue-400/40 underline-offset-2 transition-colors hover:text-blue-200">Digital Products, Cancellation &amp; Refunds</RouterLink>
      policy and
      <RouterLink to="/cookies" class="font-semibold text-blue-300 underline decoration-blue-400/40 underline-offset-2 transition-colors hover:text-blue-200">Cookie Policy</RouterLink>.
    </p>
    <p class="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Last updated: 19 September 2026</p>

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