import { useTranslation } from 'react-i18next'

import { formatAmd } from '../lib/format.ts'

interface Props {
  caption?: string
  expected?: boolean
  total?: number
  count?: number
  commission?: number | null
  percent?: number | null
  loading: boolean
}

/** Gross total (before her %) and her clean earnings, side by side in one card. */
export default function TotalCard({ caption, expected, total, count, commission, percent, loading }: Props) {
  const { t } = useTranslation()

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#5b21b6] via-[#4c1d95] to-[#2e1065] p-5 shadow-xl shadow-[#4c1d95]/30">
      <div className="pointer-events-none absolute -top-16 -right-10 size-44 rounded-full bg-accent-soft/25 blur-2xl" />
      <div className="relative">
        {caption && <p className="mb-3 text-xs font-medium text-white/60">{caption}</p>}

        <p className="text-xs font-medium text-white/70">{t(expected ? 'totals.expected' : 'totals.gross')}</p>
        {loading ? (
          <div className="mt-2 h-8 w-40 rounded-xl bg-white/15" />
        ) : (
          <p className="tabular mt-1 text-3xl font-semibold tracking-tight text-white">{formatAmd(total ?? 0)}</p>
        )}

        {percent != null && (
          <div className="mt-4 border-t border-white/15 pt-4">
            <p className="text-xs font-medium text-[#ddd6fe]">{t('totals.mine', { percent })}</p>
            {loading ? (
              <div className="mt-2 h-8 w-32 rounded-xl bg-white/15" />
            ) : (
              <p className="tabular mt-1 text-3xl font-semibold tracking-tight text-[#ddd6fe]">
                {formatAmd(commission ?? 0)}
              </p>
            )}
          </div>
        )}

        <span className="mt-4 inline-block rounded-full bg-white/12 px-3 py-1 text-xs text-white/85">
          {loading ? '…' : t('totals.bookings', { count: count ?? 0 })}
        </span>
      </div>
    </section>
  )
}
