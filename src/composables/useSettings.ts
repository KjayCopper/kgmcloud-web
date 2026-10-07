import { ref } from 'vue'

const vatRate = ref<number | null>(null)
const vatEnabled = ref<boolean>(false)
const vatRates = ref<Record<string, number>>({})
const staffDiscountPercent = ref<number>(0)
let loaded = false

export function useSettings() {
  async function load() {
    if (loaded) return
    try {
      const res = await fetch('/api/settings')
      const data = res.ok ? await res.json() : {}
      vatRate.value = Number(data.vat_rate) || 20
      vatEnabled.value = data.vat_enabled !== false
      vatRates.value = data && typeof data.vat_rates === 'object' && data.vat_rates ? data.vat_rates : {}
      staffDiscountPercent.value = Number(data.staff_discount_percent) || 0
    } catch {
      vatRate.value = 20
      vatEnabled.value = false
      vatRates.value = {}
      staffDiscountPercent.value = 0
    } finally {
      loaded = true
    }
  }

  function rateFor(country: string): number {
    if (!vatEnabled.value) return 0
    const mapped = Number((vatRates.value || {})[country])
    if (mapped >= 0) return mapped
    return country === 'GB' ? (vatRate.value ?? 20) : 0
  }

  return { vatRate, vatEnabled, vatRates, rateFor, staffDiscountPercent, load }
}