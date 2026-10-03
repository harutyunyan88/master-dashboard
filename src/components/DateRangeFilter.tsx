import { useTranslation } from 'react-i18next'

import clsx from '../lib/clsx.ts'
import { addDays, endOfMonth, isIsoDate, startOfMonth, startOfWeek, todayIso } from '../lib/dates.ts'

export interface Range {
  from: string
  to: string
}

function presets(): { key: string; range: Range }[] {
  const today = todayIso()
  const lastMonthDay = addDays(startOfMonth(today), -1)
  return [
    { key: 'history.thisWeek', range: { from: startOfWeek(today), to: today } },
    { key: 'history.thisMonth', range: { from: startOfMonth(today), to: today } },
    { key: 'history.lastMonth', range: { from: startOfMonth(lastMonthDay), to: endOfMonth(lastMonthDay) } },
  ]
}

const FIELD = 'mt-1 w-full rounded-xl border border-line bg-bg/60 px-3 py-2.5 text-sm text-ink outline-none focus:border-accent-soft'

export default function DateRangeFilter({ value, onChange }: { value: Range; onChange: (range: Range) => void }) {
  const { t } = useTranslation()
  // Keep from <= to by moving the other end when one passes it.
  const setFrom = (from: string) => isIsoDate(from) && onChange({ from, to: from > value.to ? from : value.to })
  const setTo = (to: string) => isIsoDate(to) && onChange({ from: to < value.from ? to : value.from, to })

  return (
    <section className="mb-4 rounded-3xl border border-line/50 bg-surface/80 p-4">
      <div className="flex gap-2 overflow-x-auto">
        {presets().map(({ key, range }) => {
          const active = range.from === value.from && range.to === value.to
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(range)}
              className={clsx(
                'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
                active ? 'bg-accent text-white' : 'bg-surface-2 text-muted hover:text-ink',
              )}
            >
              {t(key)}
            </button>
          )
        })}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="text-xs text-muted">
          {t('history.from')}
          <input type="date" value={value.from} onChange={(e) => setFrom(e.target.value)} className={FIELD} />
        </label>
        <label className="text-xs text-muted">
          {t('history.to')}
          <input type="date" value={value.to} onChange={(e) => setTo(e.target.value)} className={FIELD} />
        </label>
      </div>
    </section>
  )
}
