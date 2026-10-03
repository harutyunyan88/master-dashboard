import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import type { Booking, BookingStatus } from '../api/client.ts'
import clsx from '../lib/clsx.ts'
import { formatDay } from '../lib/dates.ts'
import { formatAmd } from '../lib/format.ts'

const STATUS_DOT: Record<BookingStatus, string> = {
  completed: 'bg-accent-soft',
  confirmed: 'border border-accent-soft',
  pending: 'border border-muted/60',
}

interface Props {
  booking: Booking
  showDate?: boolean // when rows of different days are mixed (client page)
  linkClient?: boolean
}

export default function BookingRow({ booking, showDate = false, linkClient = true }: Props) {
  const { t } = useTranslation()
  const multiple = booking.services.length > 1
  const name =
    linkClient && booking.client_id ? (
      <Link
        to={`/clients/${booking.client_id}`}
        className="font-medium underline decoration-accent-soft/40 underline-offset-4 hover:decoration-accent-soft"
      >
        {booking.client_name}
      </Link>
    ) : (
      <span className="font-medium">{booking.client_name}</span>
    )

  return (
    <li className="flex gap-3.5 rounded-2xl border border-line/50 bg-surface/80 p-4">
      <div className="w-14 shrink-0">
        {showDate && <p className="mb-0.5 text-xs font-medium text-accent-soft">{formatDay(booking.date)}</p>}
        <p className="tabular text-lg leading-tight font-semibold">{booking.time}</p>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="min-w-0 break-words">
            {name}
            {booking.client_phone && (
              <span className="tabular ml-1.5 inline-block text-sm whitespace-nowrap text-muted">
                ({booking.client_phone})
              </span>
            )}
          </p>
          <p className="tabular shrink-0 font-semibold text-accent-soft">{formatAmd(booking.price)}</p>
        </div>
        <ul className="mt-1.5 space-y-1">
          {booking.services.map((service, i) => (
            <li key={i} className="flex justify-between gap-3 text-sm text-muted">
              <span className="min-w-0">{service.name}</span>
              {multiple && <span className="tabular shrink-0">{formatAmd(service.price)}</span>}
            </li>
          ))}
        </ul>
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
          <span className={clsx('size-2 shrink-0 rounded-full', STATUS_DOT[booking.status])} />
          {t(`status.${booking.status}`)}
        </p>
      </div>
    </li>
  )
}
