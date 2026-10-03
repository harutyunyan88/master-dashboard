import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router'

import CalendarHeatmap from '../components/charts/CalendarHeatmap.tsx'
import ColumnChart from '../components/charts/ColumnChart.tsx'
import StatTile from '../components/charts/StatTile.tsx'
import TopServices from '../components/charts/TopServices.tsx'
import { ChevronLeft, ChevronRight } from '../components/icons.tsx'
import PageHeader from '../components/PageHeader.tsx'
import { EmptyState, ErrorState } from '../components/States.tsx'
import { useBookings } from '../hooks/useBookings.ts'
import { addMonths, dayOfMonth, endOfMonth, formatDayFull, formatMonth, startOfMonth, todayIso } from '../lib/dates.ts'
import { formatAmd, share } from '../lib/format.ts'
import { dailyTotals, hourStats, percentChange, serviceStats, summarize, weekdayStats } from '../lib/stats.ts'

const ARROW = 'grid size-10 shrink-0 place-items-center rounded-xl bg-surface text-muted transition-colors hover:bg-surface-2 hover:text-ink'

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="mt-4 rounded-3xl border border-line/50 bg-surface/80 p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {hint && <p className="mt-0.5 text-[11px] text-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

export default function Stats() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const today = todayIso()

  // Month lives in the URL (?month=YYYY-MM); default is the current month.
  const [params, setParams] = useSearchParams()
  const monthParam = params.get('month')
  const monthStart = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? `${monthParam}-01` : startOfMonth(today)
  const monthEnd = endOfMonth(monthStart)
  const prevStart = addMonths(monthStart, -1)
  const setMonth = (iso: string) =>
    setParams(iso === startOfMonth(today) ? {} : { month: iso.slice(0, 7) }, { replace: true })

  const current = useBookings(monthStart, monthEnd)
  const previous = useBookings(prevStart, endOfMonth(prevStart))
  const percent = current.data?.commission_percent ?? null

  const stats = useMemo(() => {
    const all = current.data?.bookings ?? []
    const isCurrentMonth = monthStart === startOfMonth(today)
    // In the running month, compare what's done so far with the same days of last month.
    const done = isCurrentMonth ? all.filter((b) => b.date <= today) : all
    const prevAll = previous.data?.bookings ?? []
    const prevCompared = isCurrentMonth ? prevAll.filter((b) => dayOfMonth(b.date) <= dayOfMonth(today)) : prevAll
    return {
      isCurrentMonth,
      summary: summarize(done),
      prevSummary: summarize(prevCompared),
      expectedRest: summarize(all.filter((b) => b.date > today)).total,
      days: dailyTotals(all, monthStart, monthEnd),
      services: serviceStats(done),
      weekdays: weekdayStats(done),
      hours: hourStats(done),
    }
  }, [current.data, previous.data, monthStart, monthEnd, today])

  const loading = current.loading || previous.loading
  const { summary, prevSummary } = stats
  const weekdayNames = t('stats.weekdaysShort').split(',')
  const weekdayLong = t('stats.weekdaysLong').split(',')

  return (
    <>
      <PageHeader eyebrow={t('stats.eyebrow')} title={t('stats.title')} />

      <div className="mb-4 flex items-center gap-2">
        <button type="button" className={ARROW} onClick={() => setMonth(addMonths(monthStart, -1))} aria-label={t('stats.previousMonth')}>
          <ChevronLeft />
        </button>
        <p className="flex-1 text-center font-semibold">{formatMonth(monthStart)}</p>
        <button type="button" className={ARROW} onClick={() => setMonth(addMonths(monthStart, 1))} aria-label={t('stats.nextMonth')}>
          <ChevronRight />
        </button>
      </div>

      {current.error || previous.error ? (
        <ErrorState
          onRetry={() => {
            current.reload()
            previous.reload()
          }}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatTile label={t('stats.gross')} value={formatAmd(summary.total)} change={percentChange(summary.total, prevSummary.total)} loading={loading} />
            {percent != null && (
              <StatTile
                label={t('stats.mine', { percent })}
                value={formatAmd(share(summary.total, percent))}
                change={percentChange(summary.total, prevSummary.total)}
                loading={loading}
              />
            )}
            <StatTile label={t('stats.count')} value={String(summary.count)} change={percentChange(summary.count, prevSummary.count)} loading={loading} />
            <StatTile label={t('stats.average')} value={formatAmd(summary.average)} change={percentChange(summary.average, prevSummary.average)} loading={loading} />
          </div>
          {!loading && (
            <p className="mt-2 text-[11px] text-muted">
              {stats.isCurrentMonth ? t('stats.vsSamePeriod', { day: dayOfMonth(today) }) : t('stats.vsPreviousMonth')}
              {stats.expectedRest > 0 && (
                <span className="mt-0.5 block text-accent-soft">
                  {t('stats.expectedRest', { amount: formatAmd(stats.expectedRest) })}
                </span>
              )}
            </p>
          )}

          {loading ? (
            <div className="skeleton mt-4 h-72 rounded-3xl" />
          ) : (current.data?.count ?? 0) === 0 ? (
            <div className="mt-4">
              <EmptyState text={t('stats.empty')} />
            </div>
          ) : (
            <>
              <Section title={t('stats.calendar')} hint={t('stats.calendarHint')}>
                <CalendarHeatmap days={stats.days} today={today} onSelect={(day) => navigate(`/?date=${day}`)} />
              </Section>

              <Section title={t('stats.daily')}>
                <ColumnChart
                  columns={[...stats.days.entries()].map(([day, { total, count }]) => ({
                    key: day,
                    axisLabel: [1, 10, 20].includes(dayOfMonth(day)) || day === monthEnd ? String(dayOfMonth(day)) : '',
                    value: total,
                    muted: day > today,
                    readout: [
                      formatDayFull(day),
                      formatAmd(total),
                      percent != null ? t('totals.mineShort', { amount: formatAmd(share(total, percent)) }) : null,
                      t('totals.bookings', { count }),
                    ]
                      .filter(Boolean)
                      .join(' · '),
                  }))}
                />
                {monthEnd > today && (
                  <div className="mt-3 flex gap-4 text-[11px] text-muted">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-[3px] bg-accent-soft" />
                      {t('stats.past')}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-[3px] bg-accent-soft/35" />
                      {t('stats.expected')}
                    </span>
                  </div>
                )}
              </Section>

              {stats.services.length > 0 && (
                <>
                  <Section title={t('stats.topServices')}>
                    <TopServices services={stats.services} percent={percent} />
                  </Section>

                  <Section title={t('stats.weekdays')}>
                    <ColumnChart
                      height={110}
                      counts
                      formatTick={String}
                      columns={stats.weekdays.map((d, i) => ({
                        key: String(i),
                        axisLabel: weekdayNames[i],
                        value: d.count,
                        readout: `${weekdayLong[i]} · ${t('totals.bookings', { count: d.count })} · ${formatAmd(d.total)}`,
                      }))}
                    />
                  </Section>

                  <Section title={t('stats.hours')}>
                    <ColumnChart
                      height={110}
                      counts
                      formatTick={String}
                      columns={stats.hours.map(({ hour, count }) => ({
                        key: String(hour),
                        axisLabel: hour % 2 === 0 ? String(hour) : '',
                        value: count,
                        readout: `${String(hour).padStart(2, '0')}:00–${String(hour + 1).padStart(2, '0')}:00 · ${t('totals.bookings', { count })}`,
                      }))}
                    />
                  </Section>
                </>
              )}
            </>
          )}
        </>
      )}
    </>
  )
}
