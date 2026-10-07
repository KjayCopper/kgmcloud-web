<script setup lang="ts">
const bases = [
  { purpose: 'Creating and managing your account', basis: 'Contract' },
  { purpose: 'Processing purchases and taking payment', basis: 'Contract' },
  { purpose: 'Delivering products, downloads and licence keys', basis: 'Contract' },
  { purpose: 'Providing customer support', basis: 'Contract / Legitimate interests' },
  { purpose: 'Keeping financial and accounting records', basis: 'Legal obligation' },
  { purpose: 'Fraud and abuse prevention', basis: 'Legitimate interests' },
  { purpose: 'Service and security logs / monitoring', basis: 'Legitimate interests' },
  { purpose: 'Responding to legal requests and regulatory obligations', basis: 'Legal obligation' },
  { purpose: 'Marketing communications', basis: 'Consent, where you have opted in' },
]

const sections = [
  {
    title: '1. Who We Are',
    body:
      'KGM Cloud (a trading name) is operated by Kieran McCrudden at 75 Norman Rise, Livingston, West Lothian EH54 6LZ. KGM Cloud is the controller responsible for the personal information described in this policy. We are a small business and do not employ a Data Protection Officer; for any data protection matter, contact us at Info@kgmcloud.co.uk.',
  },
  {
    title: '2. What Personal Information We Collect',
    body:
      'This policy lists only the information we actually collect, and why:',
    points: [
      'Account information: your name, email address, password (stored securely as a hashed credential, never in plain text), customer ID, and account preferences.',
      'Purchase information: order reference, products purchased, purchase date, amount and currency, payment status, and the payment transaction/reference ID issued by our payment provider.',
      'Licence information: licence keys issued to you, Roblox game IDs you link to a licence, licence status and your product entitlements.',
      'Support information: the content of support tickets and messages you send us, and any correspondence with KGM Cloud.',
      'Technical and security information: IP address, account sign-in records, and server access/security logs that record which requests were made to the service.',
      'Location and tax information: the country you select at checkout, and the country we detect from your IP address so we can apply the correct VAT treatment to your order. The country used for an order, and the consent and IP recorded against an order, are kept as part of that purchase record.',
    ],
  },
  {
    title: '3. How We Collect Information',
    body:
      'We collect personal information from the following sources:',
    points: [
      'From you directly: when you create an account, place an order, link a licence to a game, submit a support ticket, or otherwise contact us.',
      'Through use of the site: automatic technical and security information is generated when you visit the site, sign in or place an order.',
      'From our payment provider: SumUp sends us the payment status and the transaction reference for each payment so we can confirm and match your order.',
      'Geolocation: when you reach checkout we may detect your country from your IP address so the correct VAT rate can be applied, and we record the country treated at purchase time as evidence for tax purposes.',
    ],
  },
  {
    title: '4. How We Use Personal Information',
    body:
      'We use personal information for the following purposes:',
    points: [
      'Creating and managing your account.',
      'Processing purchases and taking payment.',
      'Delivering the digital products you bought, including downloads and licence keys.',
      'Managing licences, including linking games and tracking your entitlements.',
      'Providing customer support and responding to your messages.',
      'Sending transactional emails, such as order confirmations and delivery details.',
      'Maintaining and securing the website, and monitoring for abuse or fraud.',
      'Keeping financial and accounting records and meeting our legal and regulatory obligations.',
      'Sending marketing communications only where you have separately agreed to receive them.',
    ],
  },
  {
    title: '5. Lawful Bases for Processing',
    body:
      'We rely on the following lawful bases for the purposes described in section 4:',
    table: bases,
    tableNote:
      'Our lawful basis is matched to each purpose: contract processing for what you ask us to do, legal obligations where the law requires us to keep records, and legitimate interests for keeping the service safe and functioning. We do not use one blanket basis for everything.',
  },
  {
    title: '6. Who We Share Information With',
    body:
      'We share personal information only where necessary to run the service, and with:',
    points: [
      'SumUp, our payment provider, so a payment can be taken and matched to your order. SumUp processes the payment itself under its own terms and privacy policy.',
      'Our hosting provider, which runs the servers, email delivery and storage the service depends on.',
      'Email delivery services, to send you transactional emails such as order confirmations.',
      'Professional and legal/regulatory recipients where we are required to do so by law, or to establish and defend our legal rights, for example tax authorities or Trading Standards.',
    ],
  },
  {
    title: '7. International Data Transfers',
    body:
      'Where personal information is transferred internationally, this is handled in accordance with our International Data Transfers Policy. KGM Cloud trading details and where your information is stored are set out there.',
  },
  {
    title: '8. How Long We Keep Information',
    body:
      'We keep information only for as long as it is needed for the purposes described above, after which it is securely deleted or anonymised. We do not delete information that we are legally required to keep:',
    table: [
      { purpose: 'Account information', basis: 'For as long as your account is active, plus a reasonable period after closure.' },
      { purpose: 'Purchase and transaction records', basis: 'Retained for at least 6 years, as required for tax and accounting purposes.' },
      { purpose: 'Licence records', basis: 'For the life of the licence you hold, plus any required period in our records.' },
      { purpose: 'Support tickets and correspondence', basis: 'For a reasonable period after the matter is resolved, so we can follow up on requests.' },
      { purpose: 'Security and access logs', basis: 'A rolling period (typically months) sufficient to investigate incidents and abuse.' },
      { purpose: 'Marketing preferences', basis: 'Until you withdraw your consent or unsubscribe.' },
    ],
    tableNote:
      'Your statutory rights, including the right to erasure, apply alongside these retention rules; where the law requires us to keep records, we may keep them even where you ask us to delete them, but we will stop using them for anything beyond that legal need.',
  },
  {
    title: '9. Your Data Protection Rights',
    body:
      'Under the UK GDPR and the Data Protection Act 2018 you have rights over your personal information, where they apply to the particular processing:',
    points: [
      'Right to access: to see what personal information we hold about you and how it is used.',
      'Right to rectification: to have inaccurate information corrected.',
      'Right to erasure: to ask us to delete information, where it is not required for a legal or contractual reason to keep it.',
      'Right to restrict processing: to limit how we use information in certain circumstances.',
      'Right to object: to object to processing based on legitimate interests, or to direct marketing.',
      'Right to data portability: to receive information you provided in a structured, machine-readable form where processing is based on consent or contract.',
      'Right to withdraw consent: where we process on the basis of your consent, you can withdraw it at any time.',
    ],
  },
  {
    title: '10. How to Exercise Your Rights',
    body:
      'To exercise any of your rights, email Info@kgmcloud.co.uk or contact us through your account. To protect your information we may need to verify your identity before we act, and may ask for information that helps us confirm you are the account holder. We aim to respond within one month of a verifiable request, as required by the UK GDPR; where a request is complex we may extend this by a further two months and will tell you why. There is no charge for exercising your rights.',
  },
  {
    title: '11. Marketing',
    body:
      'KGM Cloud does not send marketing emails unless you have separately opted in to receive them. Transactional emails (for example order confirmations, delivery notifications, licence notices or replies to your support tickets) are service messages, not marketing, and are sent because they are needed for the service. If you ever receive marketing from us, every message includes a simple way to unsubscribe, and you can also ask us at any time by emailing Info@kgmcloud.co.uk.',
  },
  {
    title: '12. Cookies & Similar Technologies',
    body:
      'Our use of cookies and similar technologies is explained in our Cookie Policy, which lists each cookie we set and what it does.',
    link: '/cookies',
    linkLabel: 'Read the Cookie Policy',
  },
  {
    title: '13. Automated Decision-Making & Profiling',
    body:
      'KGM Cloud does not currently use solely automated decision-making, or profiling, that produces legal or similarly significant effects on individuals. If this ever changes, we will update this policy before the change takes effect.',
  },
  {
    title: '14. Data Security',
    body:
      'We apply appropriate technical and organisational measures to protect personal information, including access controls, authentication, encryption where appropriate, secure storage, security monitoring, and limiting staff or administrative access to the minimum needed to run the service. We do not publish our security architecture, but we review and maintain these controls against the risks the service faces.',
  },
  {
    title: '15. Complaints',
    body:
      'If you are unhappy with how we handle your personal information, please contact KGM Cloud first at Info@kgmcloud.co.uk and we will do our best to resolve the matter. You also have the right to complain to the Information Commissioner\u2019s Office (ICO), the UK\u2019s supervisory authority, at ico.org.uk or by writing to the Information Commissioner\u2019s Office, Wycliffe House, Water Lane, Wilmslow, Cheshire SK9 5AF.',
  },
  {
    title: '16. Changes to the Privacy Policy',
    body:
      'This policy was last updated on 19 September 2026. We may update it from time to time, and where a change is significant we will tell you through your account or by email. You can always find the current version of this policy on the website.',
  },
]
</script>

<template>
  <section class="mx-auto w-full max-w-4xl px-6 pb-16 pt-10 lg:pb-24 lg:pt-16">
    <p class="text-sm font-semibold uppercase tracking-widest text-blue-400">Legal</p>
    <h2 class="mt-3 text-4xl font-bold tracking-tight text-white lg:text-5xl">Privacy Policy</h2>
    <p class="mt-4 max-w-2xl text-slate-300">
      This policy explains what personal information KGM Cloud collects, why we collect it, and the rights you have over
      it. It applies across the whole of the United Kingdom.
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
        <div v-if="s.table" class="mt-4 overflow-hidden rounded-xl border border-white/10">
          <table class="w-full text-sm">
            <tbody class="divide-y divide-white/10">
              <tr v-for="row in s.table" :key="row.purpose" class="align-top">
                <td class="w-2/5 px-4 py-3 font-semibold text-slate-200">{{ row.purpose }}</td>
                <td class="px-4 py-3 text-slate-300">{{ row.basis }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="s.tableNote" class="mt-3 text-xs text-slate-500">{{ s.tableNote }}</p>
        <RouterLink
          v-if="s.link"
          :to="s.link"
          class="mt-3 inline-block text-sm font-semibold text-blue-300 underline decoration-blue-400/40 underline-offset-2 transition-colors hover:text-blue-200"
        >
          {{ s.linkLabel }}
        </RouterLink>
      </div>
    </div>
  </section>
</template>