import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { formatAmd, share } from '../../lib/format.ts'
import type { ServiceStat } from '../../lib/stats.ts'
import RankRow from './RankRow.tsx'
import ToggleChips from './ToggleChips.tsx'

const LIMIT = 6

export default function TopServices({ services, percent }: { services: ServiceStat[]; percent: number | null }) {
  const { t } = useTranslation()
  const [by, setBy] = useState<'total' | 'count'>('total')
  const sorted = [...services].sort((a, b) => b[by] - a[by] || b.total - a.total).slice(0, LIMIT)
  const max = Math.max(1, ...sorted.map((s) => s[by]))

  return (
    <div>
      <div className="mb-4">
        <ToggleChips
          value={by}
          onChange={setBy}
          options={[
            { value: 'total', label: t('stats.byRevenue') },
            { value: 'count', label: t('stats.byCount') },
          ]}
        />
      </div>
      <ol className="space-y-3.5">
        {sorted.map((service) => {
          const times = t('stats.times', { count: service.count })
          return (
            <RankRow
              key={service.name}
              title={service.name}
              primary={by === 'total' ? formatAmd(service.total) : times}
              mine={percent != null ? t('totals.mineShort', { amount: formatAmd(share(service.total, percent)) }) : null}
              secondary={by === 'total' ? times : formatAmd(service.total)}
              ratio={service[by] / max}
            />
          )
        })}
      </ol>
    </div>
  )
}
