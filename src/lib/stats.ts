import type { Booking } from '../api/client.ts'
import { addDays } from './dates.ts'

export interface DayTotal {
  total: number
  count: number
}

export interface Summary {
  total: number
  count: number
  average: number
}

export function summarize(bookings: Booking[]): Summary {
  const total = bookings.reduce((sum, b) => sum + b.price, 0)
  return { total, count: bookings.length, average: bookings.length ? Math.round(total / bookings.length) : 0 }
}

/** Every day from `from` to `to` (inclusive), with its total — days without bookings are zero. */
export function dailyTotals(bookings: Booking[], from: string, to: string): Map<string, DayTotal> {
  const days = new Map<string, DayTotal>()
  for (let day = from; day <= to; day = addDays(day, 1)) days.set(day, { total: 0, count: 0 })
  for (const b of bookings) {
    const day = days.get(b.date)
    if (day) {
      day.total += b.price
      day.count += 1
    }
  }
  return days
}

export interface ServiceStat {
  name: string
  count: number
  total: number
}

export function serviceStats(bookings: Booking[]): ServiceStat[] {
  const byName = new Map<string, ServiceStat>()
  for (const b of bookings) {
    for (const s of b.services) {
      const stat = byName.get(s.name) ?? { name: s.name, count: 0, total: 0 }
      stat.count += 1
      stat.total += s.price
      byName.set(s.name, stat)
    }
  }
  return [...byName.values()]
}

export interface ClientStat {
  id: number
  name: string
  phone: string | null
  count: number
  total: number
}

export function clientStats(bookings: Booking[]): ClientStat[] {
  const byId = new Map<number, ClientStat>()
  for (const b of bookings) {
    if (b.client_id == null) continue
    const stat = byId.get(b.client_id) ?? { id: b.client_id, name: b.client_name, phone: b.client_phone, count: 0, total: 0 }
    stat.count += 1
    stat.total += b.price
    byId.set(b.client_id, stat)
  }
  return [...byId.values()]
}

/** Index 0 = Monday … 6 = Sunday. */
export function weekdayStats(bookings: Booking[]): DayTotal[] {
  const stats = Array.from({ length: 7 }, () => ({ total: 0, count: 0 }))
  for (const b of bookings) {
    const [y, m, d] = b.date.split('-').map(Number)
    const stat = stats[(new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7]
    stat.total += b.price
    stat.count += 1
  }
  return stats
}

/** Bookings per starting hour, covering the hours she actually works (at least 9–20). */
export function hourStats(bookings: Booking[]): { hour: number; count: number }[] {
  const counts = new Map<number, number>()
  for (const b of bookings) {
    const hour = Number(b.time.slice(0, 2))
    counts.set(hour, (counts.get(hour) ?? 0) + 1)
  }
  const hours = [...counts.keys()]
  const first = Math.min(9, ...hours)
  const last = Math.max(20, ...hours)
  return Array.from({ length: last - first + 1 }, (_, i) => ({ hour: first + i, count: counts.get(first + i) ?? 0 }))
}

/** Percent change, or null when there is nothing to compare against. */
export function percentChange(current: number, previous: number): number | null {
  if (!previous) return null
  return Math.round(((current - previous) / previous) * 100)
}

/** 64000 -> "64k", 1250 -> "1.3k", 500 -> "500" — for tight spaces like calendar cells and axes. */
export function compactAmount(value: number): string {
  if (value < 1000) return String(value)
  const thousands = value / 1000
  return `${thousands >= 10 ? Math.round(thousands) : Math.round(thousands * 10) / 10}k`
}

/** A round axis maximum just above `max` (1, 2, 2.5, 5 × 10ⁿ). */
export function niceMax(max: number): number {
  if (max <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(max))
  const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude >= max) ?? 10
  return step * magnitude
}
