import { currentLocale } from '../i18n/index.ts'

// All dates are "YYYY-MM-DD" strings in the salon's timezone, so the phone's own timezone never matters.
export const TIMEZONE = 'Asia/Yerevan'

function parse(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase() + text.slice(1)
}

function format(iso: string, options: Intl.DateTimeFormatOptions): string {
  return capitalize(parse(iso).toLocaleDateString(currentLocale(), { timeZone: 'UTC', ...options }))
}

export function todayIso(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(new Date())
}

export function isIsoDate(value: string | null): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parse(value).getTime())
}

export function addDays(iso: string, days: number): string {
  const date = parse(iso)
  date.setUTCDate(date.getUTCDate() + days)
  return toIso(date)
}

export function startOfMonth(iso: string): string {
  return `${iso.slice(0, 8)}01`
}

export function endOfMonth(iso: string): string {
  const date = parse(startOfMonth(iso))
  date.setUTCMonth(date.getUTCMonth() + 1, 0)
  return toIso(date)
}

/** First day of the month `months` away from the month containing `iso`. */
export function addMonths(iso: string, months: number): string {
  const date = parse(startOfMonth(iso))
  date.setUTCMonth(date.getUTCMonth() + months)
  return toIso(date)
}

export function dayOfMonth(iso: string): number {
  return Number(iso.slice(8, 10))
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(iso: string): number {
  return (parse(iso).getUTCDay() + 6) % 7
}

const HY_MONTHS_NOMINATIVE = ['Հունվար', 'Փետրվար', 'Մարտ', 'Ապրիլ', 'Մայիս', 'Հունիս', 'Հուլիս', 'Օգոստոս', 'Սեպտեմբեր', 'Հոկտեմբեր', 'Նոյեմբեր', 'Դեկտեմբեր']

/** "Октябрь 2026" */
export function formatMonth(iso: string): string {
  const d = parse(iso)
  if (armenian()) return `${HY_MONTHS_NOMINATIVE[d.getUTCMonth()]} ${d.getUTCFullYear()}`
  return `${format(iso, { month: 'long' })} ${d.getUTCFullYear()}`
}

export function startOfWeek(iso: string): string {
  const mondayOffset = (parse(iso).getUTCDay() + 6) % 7
  return addDays(iso, -mondayOffset)
}

// Many browsers ship no Armenian date data and fall back to English, so Armenian names are spelled out here.
const HY_MONTHS = ['հունվարի', 'փետրվարի', 'մարտի', 'ապրիլի', 'մայիսի', 'հունիսի', 'հուլիսի', 'օգոստոսի', 'սեպտեմբերի', 'հոկտեմբերի', 'նոյեմբերի', 'դեկտեմբերի']
const HY_MONTHS_SHORT = ['հնվ', 'փտվ', 'մրտ', 'ապր', 'մյս', 'հնս', 'հլս', 'օգս', 'սեպ', 'հոկ', 'նոյ', 'դեկ']
const HY_WEEKDAYS = ['Կիրակի', 'Երկուշաբթի', 'Երեքշաբթի', 'Չորեքշաբթի', 'Հինգշաբթի', 'Ուրբաթ', 'Շաբաթ']

function armenian(): boolean {
  return currentLocale().startsWith('hy')
}

/** "4 окт." */
export function formatDay(iso: string): string {
  const d = parse(iso)
  if (armenian()) return `${d.getUTCDate()} ${HY_MONTHS_SHORT[d.getUTCMonth()]}`
  return format(iso, { day: 'numeric', month: 'short' })
}

/** "4 октября 2026 г." */
export function formatDate(iso: string): string {
  const d = parse(iso)
  if (armenian()) return `${d.getUTCDate()} ${HY_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} թ.`
  return format(iso, { day: 'numeric', month: 'long', year: 'numeric' })
}

/** "Воскресенье, 4 октября" */
export function formatDayFull(iso: string): string {
  const d = parse(iso)
  if (armenian()) return `${HY_WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${HY_MONTHS[d.getUTCMonth()]}`
  return format(iso, { weekday: 'long', day: 'numeric', month: 'long' })
}

export function weekday(iso: string): string {
  if (armenian()) return HY_WEEKDAYS[parse(iso).getUTCDay()]
  return format(iso, { weekday: 'long' })
}

/** Translation key under `day.` for today/yesterday/tomorrow, else null. */
export function relativeDay(iso: string): 'today' | 'yesterday' | 'tomorrow' | null {
  const today = todayIso()
  if (iso === today) return 'today'
  if (iso === addDays(today, -1)) return 'yesterday'
  if (iso === addDays(today, 1)) return 'tomorrow'
  return null
}
