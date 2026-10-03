import { useTranslation } from 'react-i18next'

import { addDays, formatDayFull, isIsoDate, relativeDay, todayIso, weekday } from '../lib/dates.ts'
import { ChevronLeft, ChevronRight } from './icons.tsx'

const ARROW = 'grid size-12 shrink-0 place-items-center rounded-2xl bg-surface text-muted transition-colors hover:bg-surface-2 hover:text-ink'

export default function DayPicker({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const { t } = useTranslation()
  const relative = relativeDay(value)

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        <button type="button" className={ARROW} onClick={() => onChange(addDays(value, -1))} aria-label={t('day.previous')}>
          <ChevronLeft />
        </button>
        {/* Invisible native date input on top: tapping the label opens the phone's date picker. */}
        <label className="relative flex h-12 flex-1 cursor-pointer flex-col items-center justify-center rounded-2xl bg-surface leading-tight transition-colors hover:bg-surface-2">
          <span className="text-[11px] font-medium tracking-wide text-accent-soft uppercase">
            {relative ? t(`day.${relative}`) : weekday(value)}
          </span>
          <span className="text-sm font-semibold">{formatDayFull(value)}</span>
          <input
            type="date"
            value={value}
            onChange={(e) => isIsoDate(e.target.value) && onChange(e.target.value)}
            onClick={(e) => e.currentTarget.showPicker?.()}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
            aria-label={t('day.choose')}
          />
        </label>
        <button type="button" className={ARROW} onClick={() => onChange(addDays(value, 1))} aria-label={t('day.next')}>
          <ChevronRight />
        </button>
      </div>
      {value !== todayIso() && (
        <button
          type="button"
          onClick={() => onChange(todayIso())}
          className="mx-auto mt-2 block rounded-full px-3 py-1 text-xs font-medium text-accent-soft hover:bg-surface"
        >
          {t('day.backToToday')}
        </button>
      )}
    </div>
  )
}
