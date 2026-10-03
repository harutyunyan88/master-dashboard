import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import BookingRow from '../components/BookingRow.tsx'
import DayPicker from '../components/DayPicker.tsx'
import PageHeader from '../components/PageHeader.tsx'
import { EmptyState, ErrorState, ListSkeleton } from '../components/States.tsx'
import TotalCard from '../components/TotalCard.tsx'
import { useBookings } from '../hooks/useBookings.ts'
import { isIsoDate, todayIso } from '../lib/dates.ts'

export default function Dashboard() {
  const { t } = useTranslation()
  // The day lives in the URL (?date=YYYY-MM-DD) so a refresh keeps it.
  const [params, setParams] = useSearchParams()
  const dateParam = params.get('date')
  const day = isIsoDate(dateParam) ? dateParam : todayIso()
  const setDay = (iso: string) => setParams(iso === todayIso() ? {} : { date: iso }, { replace: true })

  const { data, loading, error, reload } = useBookings(day, day)

  return (
    <>
      <PageHeader
        eyebrow={t('dashboard.eyebrow')}
        title={t(day === todayIso() ? 'dashboard.titleToday' : 'dashboard.titleOther')}
      />
      <DayPicker value={day} onChange={setDay} />
      <TotalCard
        expected={day > todayIso()}
        total={data?.total_amd}
        count={data?.count}
        commission={data?.commission_amd}
        percent={data?.commission_percent}
        loading={loading}
      />

      <h2 className="mt-7 mb-3 text-sm font-medium text-muted">{t('dashboard.bookings')}</h2>
      {loading ? (
        <ListSkeleton />
      ) : error ? (
        <ErrorState onRetry={reload} />
      ) : data && data.bookings.length > 0 ? (
        <ul className="space-y-3">
          {data.bookings.map((booking) => (
            <BookingRow key={booking.id} booking={booking} />
          ))}
        </ul>
      ) : (
        <EmptyState text={t('dashboard.empty')} />
      )}
    </>
  )
}
