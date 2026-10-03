import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'

import { ApiError } from '../api/client.ts'
import BookingRow from '../components/BookingRow.tsx'
import { ChevronLeft, PhoneIcon } from '../components/icons.tsx'
import PageHeader from '../components/PageHeader.tsx'
import { EmptyState, ErrorState, ListSkeleton } from '../components/States.tsx'
import TotalCard from '../components/TotalCard.tsx'
import { useClient } from '../hooks/useBookings.ts'
import { formatDate } from '../lib/dates.ts'

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line/50 bg-surface/80 px-4 py-3">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="tabular mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  )
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-surface-2 px-3 py-1 text-xs text-ink/90">{children}</span>
}

export default function Client() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { clientId = '' } = useParams()
  const { data, loading, error, reload } = useClient(clientId)
  const client = data?.client

  const back = (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
      aria-label={t('common.back')}
      className="-ml-2 grid size-10 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink"
    >
      <ChevronLeft />
    </button>
  )

  if (error) {
    return (
      <>
        <PageHeader eyebrow={t('client.eyebrow')} title="—" leading={back} />
        {error instanceof ApiError && error.status === 404 ? (
          <EmptyState text={t('client.notFound')} />
        ) : (
          <ErrorState onRetry={reload} />
        )}
      </>
    )
  }

  return (
    <>
      <PageHeader eyebrow={t('client.eyebrow')} title={client?.name ?? '…'} leading={back} />

      {client && (
        <section className="mb-4 rounded-3xl border border-line/50 bg-surface/80 p-4">
          {client.phone && (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] text-muted">{t('client.phone')}</p>
                <p className="tabular font-medium">{client.phone}</p>
              </div>
              {/* Altegio masks numbers (e.g. +3744XXXX083) when her role can't see client phones. */}
              {!/x/i.test(client.phone) && <a
                href={`tel:${client.phone}`}
                className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white shadow-lg shadow-accent/30"
              >
                <PhoneIcon />
                {t('client.call')}
              </a>}
            </div>
          )}
          {client.email && (
            <div className="mt-3">
              <p className="text-[11px] text-muted">{t('client.email')}</p>
              <p className="font-medium break-all">{client.email}</p>
            </div>
          )}
          {(client.is_new || client.discount > 0 || client.card || client.tags.length > 0) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {client.is_new && <Badge>✨ {t('client.new')}</Badge>}
              {client.discount > 0 && (
                <Badge>
                  {t('client.discount')} {client.discount}%
                </Badge>
              )}
              {client.card && (
                <Badge>
                  {t('client.card')} {client.card}
                </Badge>
              )}
              {client.tags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
          )}
        </section>
      )}

      <TotalCard
        total={data?.total_amd}
        count={data?.count}
        commission={data?.commission_amd}
        percent={data?.commission_percent}
        loading={loading}
      />

      {data && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {data.first_visit && <Stat label={t('client.firstVisit')} value={formatDate(data.first_visit)} />}
          {data.last_visit && <Stat label={t('client.lastVisit')} value={formatDate(data.last_visit)} />}
          {data.next_visit && <Stat label={t('client.nextVisit')} value={formatDate(data.next_visit)} />}
          <Stat label={t('client.salonVisits')} value={data.client.success_visits_count} />
          <Stat label={t('client.noShows')} value={data.client.fail_visits_count} />
        </div>
      )}

      <h2 className="mt-7 mb-3 text-sm font-medium text-muted">{t('client.history')}</h2>
      {loading ? (
        <ListSkeleton />
      ) : (
        <ul className="space-y-3">
          {data?.bookings.map((booking) => (
            <BookingRow key={booking.id} booking={booking} showDate linkClient={false} />
          ))}
        </ul>
      )}
    </>
  )
}
