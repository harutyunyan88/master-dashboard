import type { ReactNode } from 'react'

interface Props {
  rank?: number
  title: ReactNode
  primary: string // the value being ranked, bold on the right
  mine?: string | null // her clean share, shown under the primary value
  secondary: string // the other measure, beside the bar
  ratio: number // 0..1 bar length
}

/** One row of a ranked list: name and value, a bar, and her share of the money. */
export default function RankRow({ rank, title, primary, mine, secondary, ratio }: Props) {
  return (
    <li className="flex gap-3">
      {rank != null && (
        <span className="tabular w-5 shrink-0 pt-0.5 text-right text-xs font-semibold text-muted">{rank}</span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3 text-sm">
          <div className="min-w-0">{title}</div>
          <div className="shrink-0 text-right">
            <p className="tabular font-semibold">{primary}</p>
            {mine && <p className="tabular text-xs font-medium text-accent-soft">{mine}</p>}
          </div>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-2 flex-1 rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-accent-soft" style={{ width: `${ratio * 100}%` }} />
          </div>
          <span className="tabular shrink-0 text-[11px] text-muted">{secondary}</span>
        </div>
      </div>
    </li>
  )
}
