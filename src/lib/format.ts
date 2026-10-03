const amd = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

/** 12500 -> "12 500 ֏" (no-break spaces keep the number on one line). */
export function formatAmd(value: number): string {
  return `${amd.format(value).replace(/,/g, ' ')} ֏`
}

/** Her share of an amount, rounded like the backend does. */
export function share(total: number, percent: number): number {
  return Math.round((total * percent) / 100)
}
