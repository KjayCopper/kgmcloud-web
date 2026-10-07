import { jsPDF } from 'jspdf'

export interface InvoiceItem {
  product_id: number
  name: string
  slug: string
  price: number
  qty: number
}

export interface Invoice {
  transactionid: string
  purchase_datetime: string
  items: InvoiceItem[]
  subtotal?: number
  discount?: number
  total: number
  currency: string
  source: string
}

export interface InvoiceCustomer {
  name: string
  email: string
  id?: number
}

const CURRENCY_SYMBOLS: Record<string, string> = { GBP: '£', USD: '$', EUR: '€' }

export function formatMoney(value: number, currency = 'GBP'): string {
  const symbol = CURRENCY_SYMBOLS[currency] || ''
  return `${symbol}${(Number(value) || 0).toFixed(2)}`
}

function formatDate(value: string): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function downloadInvoicePdf(invoice: Invoice, customer: InvoiceCustomer): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const M = 15

  const NAVY: [number, number, number] = [15, 40, 90]
  const SLATE: [number, number, number] = [110, 118, 135]
  const LIGHT: [number, number, number] = [245, 246, 250]
  const BORDER: [number, number, number] = [214, 220, 230]

  doc.setFillColor(...NAVY)
  doc.rect(0, 0, pageWidth, 8, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(...NAVY)
  doc.text('KGM CLOUD', M, 24)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...SLATE)
  doc.text('kgmcloud.co.uk', M, 29.5)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(26)
  doc.setTextColor(...NAVY)
  doc.text('INVOICE', pageWidth - M, 24, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...SLATE)
  doc.text('Status: Paid', pageWidth - M, 29.5, { align: 'right' })

  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.3)
  doc.line(M, 36, pageWidth - M, 36)

  let y = 48

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...SLATE)
  doc.text('BILLED TO', M, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(30, 40, 55)
  y += 6
  doc.text(customer.name || '-', M, y)
  y += 5
  doc.setFontSize(9)
  doc.setTextColor(...SLATE)
  doc.text(customer.email || '', M, y)

  const labelX = pageWidth - M - 55
  const valueX = pageWidth - M

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...SLATE)
  doc.text('Invoice no.', labelX, 48)
  doc.setTextColor(30, 40, 55)
  doc.text(invoice.transactionid, valueX, 48, { align: 'right' })

  doc.setTextColor(...SLATE)
  doc.text('Date', labelX, 54)
  doc.setTextColor(30, 40, 55)
  doc.text(formatDate(invoice.purchase_datetime), valueX, 54, { align: 'right' })

  y = 72

  const colItem = M
  const colQty = pageWidth - M - 65
  const colAmount = pageWidth - M

  doc.setFillColor(...LIGHT)
  doc.rect(M - 2, y - 5, pageWidth - (M * 2) + 4, 8, 'F')
  doc.setDrawColor(...BORDER)
  doc.line(M, y, pageWidth - M, y)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...SLATE)
  doc.text('ITEM', colItem, y + 0.5)
  doc.text('QTY', colQty, y + 0.5, { align: 'right' })
  doc.text('AMOUNT', colAmount, y + 0.5, { align: 'right' })

  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  for (let i = 0; i < invoice.items.length; i += 1) {
    const item = invoice.items[i]
    const wrapped = doc.splitTextToSize(item.name, colQty - colItem - 14) as string[]
    const lineHeight = 4.5

    if (i % 2 === 1) {
      doc.setFillColor(...LIGHT)
      doc.rect(M - 2, y - 5, pageWidth - (M * 2) + 4, wrapped.length * lineHeight + 7, 'F')
    }
    doc.line(M, y - 1, pageWidth - M, y - 1)

    doc.setTextColor(30, 40, 55)
    let ty = y
    for (let li = 0; li < wrapped.length; li += 1) {
      doc.text(wrapped[li] as string, colItem, ty)
      ty += lineHeight
    }

    doc.text(String(item.qty), colQty, y + (wrapped.length * lineHeight) / 2 - 1.5, { align: 'right' })
    doc.text(formatMoney(item.price * item.qty, invoice.currency), colAmount, y + (wrapped.length * lineHeight) / 2 - 1.5, { align: 'right' })

    y += wrapped.length * lineHeight + 7
  }

  doc.line(M, y, pageWidth - M, y)

  y += 10

  const discount = Math.round((Number(invoice.discount) || 0) * 100) / 100
  const hasDiscount = discount > 0
  const subtotal = Math.round((Number(invoice.subtotal) || 0) * 100) / 100

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  if (hasDiscount) {
    doc.setTextColor(...SLATE)
    doc.text('Subtotal', colQty, y)
    doc.setTextColor(30, 40, 55)
    doc.text(formatMoney(subtotal, invoice.currency), colAmount, y, { align: 'right' })
    y += 7
    doc.setTextColor(...SLATE)
    doc.text('Discount', colQty, y)
    doc.setTextColor(...[16, 150, 100])
    doc.text(`-${formatMoney(discount, invoice.currency)}`, colAmount, y, { align: 'right' })
    y += 7
  }

  doc.setTextColor(...SLATE)
  doc.text('Total', colQty, y)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...NAVY)
  doc.text(formatMoney(invoice.total, invoice.currency), colAmount, y, { align: 'right' })

  y = 280
  doc.setDrawColor(...BORDER)
  doc.line(M, y, pageWidth - M, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...SLATE)
  doc.text(`Invoice ${invoice.transactionid} · Generated by kgmcloud.co.uk`, pageWidth / 2, y, { align: 'center' })
  y += 4
  doc.text('Thank you for your purchase!', pageWidth / 2, y, { align: 'center' })

  doc.save(`KGMCloud-Invoice-${invoice.transactionid}.pdf`)
}