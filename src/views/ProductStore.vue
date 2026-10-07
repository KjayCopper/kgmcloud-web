<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import MediaGallery from '../components/MediaGallery.vue'
import { useAuth } from '../composables/useAuth'
import { useCart } from '../composables/useCart'
import {
  descriptionHtml as renderDescriptionHtml,
  shortDescriptionHtml as renderShortDescriptionHtml,
} from '../utils/descriptionHtml'
import { absUrl, injectJSONLD, removeJSONLD, setPageMeta, stripHtml } from '../utils/seo'

interface ProductDetail {
  id: number
  name: string
  slug: string
  category: { id: number; name: string; slug: string } | null
  short_description: string | null
  description: string | null
  disclaimer: boolean
  requires_license: boolean
  documentation_url: string | null
  demo_url: string | null
  media: { type: 'image' | 'video'; name?: string; path: string }[]
  features: string[]
  price: string
  compare_at: string | null
  price_value: number
  vat_amount: number | null
}

const route = useRoute()

const { isLoggedIn } = useAuth()
const { addItem, formatPrice } = useCart()

const product = ref<ProductDetail | null>(null)
const loading = ref(true)
const error = ref('')
const added = ref(false)

function addToCart() {
  if (!product.value) return
  addItem({
    id: product.value.id,
    slug: product.value.slug,
    name: product.value.name,
    price: product.value.price_value ?? 0,
    image_url: product.value.media?.[0]?.path ?? null,
  })
  added.value = true
  setTimeout(() => (added.value = false), 2000)
}

onMounted(async () => {
  try {
    const res = await fetch(`/api/products/${route.params.id}`)
    if (!res.ok) {
      if (res.status === 404) throw new Error('Product not found')
      throw new Error(`Request failed (${res.status})`)
    }
    const data = (await res.json()) as ProductDetail
    product.value = {
      ...data,
      features: Array.isArray(data.features) ? data.features : [],
      media: Array.isArray(data.media) ? data.media : [],
    }
    applyProductSeo(product.value)
    fetch('/api/views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: `product:${data.id}` }),
    }).catch(() => {})
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load product'
  } finally {
    loading.value = false
  }
})

function applyProductSeo(p: ProductDetail) {
  const image = p.media?.[0]?.path
  const canonical = `/products/${p.slug}`
  setPageMeta({
    title: `${p.name} | KGM Cloud`,
    description: p.short_description || stripHtml(p.description || ''),
    image,
    ogType: 'product',
    url: canonical,
  })
  injectJSONLD('product', {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    image: image ? absUrl(image) : absUrl('/og-image.png'),
    description: p.short_description || stripHtml(p.description || ''),
    category: p.category?.name,
    brand: { '@type': 'Brand', name: 'KGM Cloud' },
    url: absUrl(canonical),
    offers: {
      '@type': 'Offer',
      url: absUrl(canonical),
      price: p.price_value,
      priceCurrency: 'GBP',
      availability: 'https://schema.org/InStock',
    },
  })
}

onUnmounted(() => {
  removeJSONLD('product')
  product.value = null
})

const features = computed(() => product.value?.features ?? [])

const descriptionHtml = computed(() => renderDescriptionHtml(product.value?.description))
const shortDescHtml = computed(() => renderShortDescriptionHtml(product.value?.short_description))

const galleryMedia = computed(() =>
  (product.value?.media ?? []).map((m) => ({
    type: m.type,
    src: m.path,
    alt: m.name || `${product.value?.name} preview`,
  }))
)
</script>

<template>
  <section class="mx-auto w-full max-w-7xl px-6 pb-16 pt-10 lg:pb-20 lg:pt-16">
    <RouterLink
      to="/products"
      class="text-sm font-semibold text-slate-400 transition-colors hover:text-white"
    >
      ← Back to store
    </RouterLink>

    <div v-if="loading" class="mt-8 grid gap-12 lg:grid-cols-2">
      <div class="h-96 animate-pulse rounded-2xl border border-white/10 bg-white/5"></div>
      <div class="flex flex-col gap-6">
        <div class="h-5 w-24 animate-pulse rounded bg-white/10"></div>
        <div class="h-10 w-3/4 animate-pulse rounded bg-white/10"></div>
        <div class="h-4 w-full animate-pulse rounded bg-white/5"></div>
        <div class="h-4 w-2/3 animate-pulse rounded bg-white/5"></div>
      </div>
    </div>

    <div
      v-else-if="error"
      class="mt-8 flex flex-col items-center gap-4 py-16 text-center"
    >
      <h2 class="text-3xl font-bold tracking-tight text-white">Product not found</h2>
      <p class="text-slate-300">{{ error }}</p>
      <RouterLink
        to="/products"
        class="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500"
      >
        Back to store
      </RouterLink>
    </div>

    <template v-else-if="product">
      <div class="mt-8 grid min-w-0 grid-cols-1 items-start gap-10 lg:grid-cols-5">
        <MediaGallery v-if="galleryMedia.length" :media="galleryMedia" :alt="`${product.name} preview`" class="min-w-0 lg:col-span-3" />

        <div class="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <div class="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <span v-if="product.category" class="uppercase tracking-wider text-blue-400">
              {{ product.category.name }}
            </span>
            <span
              v-if="product.compare_at"
              class="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-400"
            >
              On sale
            </span>
          </div>

          <h2 class="text-4xl font-bold tracking-tight text-white lg:text-5xl">
            {{ product.name }}
          </h2>

          <p v-if="product.short_description" class="short-desc max-w-xl text-lg text-slate-300" v-html="shortDescHtml"></p>

          <p v-if="product.requires_license" class="max-w-xl text-sm italic text-slate-400">
            Disclaimer: A KGM Cloud account is required to manage this product.
          </p>

          <div class="flex flex-wrap items-center justify-between gap-4 pt-2">
            <span class="flex items-baseline gap-2">
              <span v-if="product.price" class="text-3xl font-bold text-white">{{ product.price }}</span>
              <span v-if="product.compare_at" class="text-xl font-medium text-slate-500 line-through">
                {{ product.compare_at }}
              </span>
            </span>
            <RouterLink
              v-if="!isLoggedIn"
              :to="`/login?redirect=/products/${product.slug}`"
              class="rounded-lg border border-white/15 bg-white/5 px-8 py-3 text-sm font-semibold text-white transition-colors hover:border-white/25 hover:bg-white/10"
            >
              Sign in to add to cart
            </RouterLink>
            <button
              v-else
              class="rounded-lg bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-colors hover:bg-blue-500"
              @click="addToCart"
            >
              {{ added ? 'Added to cart ✓' : 'Add to cart' }}
            </button>
          </div>
          <p v-if="product.vat_amount != null" class="text-sm text-slate-400">
            Price includes {{ formatPrice(product.vat_amount) }} VAT
          </p>
          <a
            v-if="product.documentation_url"
            :href="product.documentation_url"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-8 py-3 text-sm font-semibold text-white transition-colors hover:border-blue-400/40 hover:bg-blue-500/10 hover:text-blue-200"
          >
            <i class="fa-solid fa-book-open text-xs" aria-hidden="true"></i>
            View documentation
          </a>
          <a
            v-if="product.demo_url"
            :href="product.demo_url"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-8 py-3 text-sm font-semibold text-white transition-colors hover:border-blue-400/40 hover:bg-blue-500/10 hover:text-blue-200"
          >
            <i class="fa-solid fa-play text-xs" aria-hidden="true"></i>
            Play demo
          </a>
        </div>
      </div>

      <div v-if="product.description && product.description !== product.short_description" class="mt-16 max-w-3xl">
        <h3 class="text-2xl font-semibold tracking-tight text-white lg:text-3xl">
          Product information
        </h3>
        <div class="product-desc mt-4 text-base leading-relaxed text-slate-300" v-html="descriptionHtml"></div>

        <h3 v-if="features.length" class="mt-12 text-2xl font-semibold tracking-tight text-white lg:text-3xl">
          Features
        </h3>
        <ul class="mt-4 grid gap-3 sm:grid-cols-2">
          <li
            v-for="feature in features"
            :key="feature"
            class="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white"
          >
            <span class="h-2 w-2 shrink-0 rounded-full bg-blue-400"></span>
            {{ feature }}
          </li>
        </ul>
      </div>
    </template>
  </section>
</template>

<style>
.short-desc strong {
  color: #fff;
  font-weight: 600;
}

.short-desc a {
  color: #60a5fa;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.product-desc > p + p {
  margin-top: 1rem;
}

.product-desc h2,
.product-desc h3,
.product-desc h4 {
  color: #fff;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.product-desc h2 {
  margin-top: 2.5rem;
  margin-bottom: 0.75rem;
  font-size: 1.5rem;
  line-height: 2rem;
}

.product-desc h3 {
  margin-top: 2.5rem;
  margin-bottom: 0.75rem;
  border-bottom: 1px solid rgb(255 255 255 / 0.12);
  padding-bottom: 0.5rem;
  font-size: 1.4rem;
  line-height: 1.75rem;
}

.product-desc h4 {
  margin-top: 1.75rem;
  margin-bottom: 0.5rem;
  font-size: 1.125rem;
  line-height: 1.5rem;
}

.product-desc ul,
.product-desc ol {
  margin: 1rem 0 0;
  padding-left: 1.25rem;
  display: grid;
  gap: 0.5rem;
}

.product-desc ul {
  list-style: disc;
}

.product-desc ol {
  list-style: decimal;
}

.product-desc ul li,
.product-desc ol li {
  padding-left: 0.25rem;
  line-height: 1.6;
}

.product-desc strong {
  color: #fff;
  font-weight: 600;
}

.product-desc a {
  color: #60a5fa;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.product-desc a:hover {
  color: #93c5fd;
}

.product-desc blockquote {
  margin-top: 1rem;
  border-left: 3px solid #64748b;
  padding-left: 1rem;
  color: #cbd5e1;
}

.product-desc code {
  border-radius: 0.375rem;
  background: rgb(255 255 255 / 0.08);
  padding: 0.125rem 0.375rem;
  font-size: 0.875em;
}

.product-desc pre {
  margin-top: 1rem;
  overflow-x: auto;
  border-radius: 0.75rem;
  border: 1px solid rgb(255 255 255 / 0.1);
  background: rgb(0 0 0 / 0.3);
  padding: 1rem;
}
</style>