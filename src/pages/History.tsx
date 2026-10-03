import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import type { Booking } from '../api/client.ts'
import BookingRow from '../components/BookingRow.tsx'
import DateRangeFilter, { type Range } from '../components/DateRangeFilter.tsx'
import PageHeader from '../components/PageHeader.tsx'
import { EmptyState, ErrorState, ListSkeleton } from '../components/States.tsx'
import TotalCard from '../components/TotalCard.tsx'
import { useBookings } from '../hooks/useBookings.ts'
import { formatDay, formatDayFull, isIsoDate, relativeDay, startOfMonth, todayIso } from '../lib/dates.ts'
import { formatAmd, share } from '../lib/format.ts'

/** Groups bookings by day, newest day first; bookings within a day stay in time order. */
function groupByDay(bookings: Booking[]) {
  const groups = new Map<string, Booking[]>()
  for (const booking of bookings) {
    groups.set(booking.date, [...(groups.get(booking.date) ?? []), booking])
  }
  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([day, items]) => ({ day, items, total: items.reduce((sum, b) => sum + b.price, 0) }))
}

export default function History() {
  const { t } = useTranslation()
  // Range lives in the URL (?from=&to=) so a refresh keeps it; default is the current month so far.
  const [params, setParams] = useSearchParams()
  const today = todayIso()
  const from = params.get('from')
  const to = params.get('to')
  const range: Range =
    isIsoDate(from) && isIsoDate(to) && from <= to ? { from, to } : { from: startOfMonth(today), to: today }
  const setRange = (next: Range) => setParams({ from: next.from, to: next.to }, { replace: true })

  const { data, loading, error, reload } = useBookings(range.from, range.to)
  const groups = useMemo(() => groupByDay(data?.bookings ?? []), [data])
  const percent = data?.commission_percent

  return (
    <>
      <PageHeader eyebrow={t('history.eyebrow')} title={t('history.title')} />
      <DateRangeFilter value={range} onChange={setRange} />
      <TotalCard
        caption={`${formatDay(range.from)} – ${formatDay(range.to)}`}
        total={data?.total_amd}
        count={data?.count}
        commission={data?.commission_amd}
        percent={percent}
        loading={loading}
      />

      <div className="mt-7">
        {loading ? (
          <ListSkeleton rows={4} />
        ) : error ? (
          <ErrorState onRetry={reload} />
        ) : groups.length > 0 ? (
          <div className="space-y-7">
            {groups.map(({ day, items, total }) => {
              const relative = relativeDay(day)
              return (
                <section key={day}>
                  <div className="mb-3 flex items-baseline justify-between gap-3">
                    <h2 className="text-sm font-medium">
                      {relative && <span className="mr-1.5 text-accent-soft">{t(`day.${relative}`)} ·</span>}
                      {formatDayFull(day)}
                    </h2>
                    <p className="tabular shrink-0 text-right text-xs text-muted">
                      {formatAmd(total)}
                      {percent != null && (
                        <span className="block text-accent-soft">
                          {t('totals.mineShort', { amount: formatAmd(share(total, percent)) })}
                        </span>
                      )}
                    </p>
                  </div>
                  <ul className="space-y-3">
                    {items.map((booking) => (
                      <BookingRow key={booking.id} booking={booking} />
                    ))}
                  </ul>
                </section>
              )
            })}
          </div>
        ) : (
          <EmptyState text={t('history.empty')} />
        )}
      </div>
    </>
  )
}
