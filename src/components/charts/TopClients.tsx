import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { useBookings } from '../../hooks/useBookings.ts'
import { addMonths, startOfMonth, todayIso } from '../../lib/dates.ts'
import { formatAmd, share } from '../../lib/format.ts'
import { clientStats } from '../../lib/stats.ts'
import { ErrorState } from '../States.tsx'
import RankRow from './RankRow.tsx'
import ToggleChips from './ToggleChips.tsx'

const LIMIT = 20

type Period = 'month' | '3m' | 'year'

/** Her clients ranked by money spent with her or by number of visits, up to today. */
export default function TopClients() {
  const { t } = useTranslation()
  const [period, setPeriod] = useState<Period>('3m')
  const [by, setBy] = useState<'total' | 'count'>('total')

  const today = todayIso()
  // A year is 12 calendar months including this one, within the API's one-year limit.
  const from = period === 'month' ? startOfMonth(today) : addMonths(today, period === 'year' ? -11 : -2)
  const { data, loading, error, reload } = useBookings(from, today)
  const percent = data?.commission_percent ?? null

  const ranked = useMemo(
    () =>
      clientStats(data?.bookings ?? [])
        .sort((a, b) => b[by] - a[by] || b.total - a.total)
        .slice(0, LIMIT),
    [data, by],
  )
  const max = Math.max(1, ...ranked.map((c) => c[by]))

  return (
    <div>
      <ToggleChips
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'month', label: t('stats.periodMonth') },
          { value: '3m', label: t('stats.period3') },
          { value: 'year', label: t('stats.periodYear') },
        ]}
      />
      <div className="mt-2 mb-5">
        <ToggleChips
          value={by}
          onChange={setBy}
          options={[
            { value: 'total', label: t('stats.byRevenue') },
            { value: 'count', label: t('stats.byVisits') },
          ]}
        />
      </div>

      {loading ? (
        <ul className="space-y-3" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="skeleton h-12 rounded-xl" />
          ))}
        </ul>
      ) : error ? (
        <ErrorState onRetry={reload} />
      ) : ranked.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted">{t('stats.noClients')}</p>
      ) : (
        <ol className="space-y-4">
          {ranked.map((client, i) => {
            const visits = t('stats.visits', { count: client.count })
            return (
              <RankRow
                key={client.id}
                rank={i + 1}
                title={
                  <Link
                    to={`/clients/${client.id}`}
                    className="font-medium underline decoration-accent-soft/40 underline-offset-4 hover:decoration-accent-soft"
                  >
                    {client.name}
                  </Link>
                }
                primary={by === 'total' ? formatAmd(client.total) : visits}
                mine={percent != null ? t('totals.mineShort', { amount: formatAmd(share(client.total, percent)) }) : null}
                secondary={by === 'total' ? visits : formatAmd(client.total)}
                ratio={client[by] / max}
              />
            )
          })}
        </ol>
      )}
    </div>
  )
}
