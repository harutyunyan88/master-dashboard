import { useTranslation } from 'react-i18next'

import clsx from '../../lib/clsx.ts'
import { formatDayFull, weekdayIndex } from '../../lib/dates.ts'
import { formatAmd } from '../../lib/format.ts'
import { compactAmount, type DayTotal } from '../../lib/stats.ts'

// Sequential violet ramp on the dark surface: dim = little, bright = a lot.
const STEPS = ['#3b2470', '#53289e', '#6d32d0', '#8b5cf6', '#b9a2fb']
const DARK_TEXT_FROM = 4 // the brightest step needs dark text

interface Props {
  days: Map<string, DayTotal>
  today: string
  onSelect: (day: string) => void
}

export default function CalendarHeatmap({ days, today, onSelect }: Props) {
  const { t } = useTranslation()
  const entries = [...days.entries()]
  const max = Math.max(0, ...entries.map(([, d]) => d.total))
  const leadingBlanks = entries.length ? weekdayIndex(entries[0][0]) : 0

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5">
        {t('stats.weekdaysShort')
          .split(',')
          .map((name) => (
            <span key={name} className="pb-1 text-center text-[10px] font-medium text-muted">
              {name}
            </span>
          ))}
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {entries.map(([day, { total, count }]) => {
          const step = total > 0 ? Math.min(STEPS.length - 1, Math.floor((total / max) * STEPS.length)) : -1
          const future = day > today
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelect(day)}
              aria-label={`${formatDayFull(day)}: ${formatAmd(total)}, ${t('totals.bookings', { count })}`}
              className={clsx(
                'flex aspect-square flex-col justify-between rounded-xl p-1.5 text-left transition-transform active:scale-95',
                step < 0 && 'bg-surface/70',
                step >= DARK_TEXT_FROM ? 'text-[#1e1038]' : 'text-ink',
                future && total > 0 && 'border border-dashed border-white/60',
                day === today && 'ring-2 ring-white/80',
              )}
              style={step >= 0 ? { background: STEPS[step], opacity: future ? 0.7 : 1 } : undefined}
            >
              <span className="text-[11px] leading-none font-semibold">{Number(day.slice(8))}</span>
              {total > 0 && <span className="tabular text-[10px] leading-none opacity-90">{compactAmount(total)}</span>}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-muted">
        {t('stats.less')}
        {STEPS.map((color) => (
          <span key={color} className="size-3 rounded-[4px]" style={{ background: color }} />
        ))}
        {t('stats.more')}
      </div>
    </div>
  )
}
