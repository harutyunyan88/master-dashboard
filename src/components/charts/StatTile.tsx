import clsx from '../../lib/clsx.ts'

interface Props {
  label: string
  value: string
  change: number | null // percent vs the comparison period
  loading: boolean
}

export default function StatTile({ label, value, change, loading }: Props) {
  return (
    <div className="rounded-2xl border border-line/50 bg-surface/80 p-3.5">
      <p className="text-[11px] text-muted">{label}</p>
      {loading ? (
        <div className="skeleton mt-1.5 h-6 w-24 rounded-lg" />
      ) : (
        <p className="mt-1 text-lg leading-tight font-semibold">{value}</p>
      )}
      {!loading && change != null && (
        <p
          className={clsx(
            'tabular mt-1 text-xs font-medium',
            change > 0 ? 'text-emerald-300' : change < 0 ? 'text-rose-300' : 'text-muted',
          )}
        >
          {change > 0 ? '▲' : change < 0 ? '▼' : '■'} {change > 0 ? '+' : ''}
          {change}%
        </p>
      )}
    </div>
  )
}
