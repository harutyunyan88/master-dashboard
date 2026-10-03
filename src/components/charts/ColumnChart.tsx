import { useState } from 'react'

import clsx from '../../lib/clsx.ts'
import { compactAmount, niceMax } from '../../lib/stats.ts'

export interface Column {
  key: string
  axisLabel?: string
  value: number
  readout: string // shown above the chart when the column is selected
  muted?: boolean // e.g. days still ahead
}

interface Props {
  columns: Column[]
  height?: number
  formatTick?: (value: number) => string
  counts?: boolean // whole-number values: keep both gridlines on integers
}

/**
 * Single-series column chart. Tap (or hover) a column to read its value in the line above —
 * works the same on phones, where there is no hover. Starts on the largest column.
 */
export default function ColumnChart({ columns, height = 140, formatTick = compactAmount, counts = false }: Props) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const top = Math.max(0, ...columns.map((c) => c.value))
  const max = counts ? Math.max(2, Math.ceil(top / 2) * 2) : niceMax(top)
  const largest = columns.reduce<Column | undefined>((best, c) => (!best || c.value > best.value ? c : best), undefined)
  const selected = columns.find((c) => c.key === selectedKey) ?? largest

  return (
    <div>
      <p className="min-h-5 text-sm font-medium text-ink" aria-live="polite">
        {selected?.readout}
      </p>
      <div className="relative mt-3" style={{ height }}>
        {[1, 0.5].map((f) => (
          <div key={f} className="absolute inset-x-0 border-t border-line/60" style={{ top: `${(1 - f) * 100}%` }}>
            <span className="tabular absolute -top-4 right-0 text-[10px] text-muted">{formatTick(max * f)}</span>
          </div>
        ))}
        <div className="absolute inset-x-0 bottom-0 border-t border-line" />
        <div className="absolute inset-0 flex items-end gap-[2px]">
          {columns.map((column) => {
            const isSelected = column.key === selected?.key
            return (
              <button
                key={column.key}
                type="button"
                aria-label={column.readout}
                aria-pressed={isSelected}
                onClick={() => setSelectedKey(column.key)}
                onMouseEnter={() => setSelectedKey(column.key)}
                className="flex h-full min-w-0 flex-1 cursor-pointer items-end justify-center"
              >
                <span
                  className={clsx(
                    'block w-full max-w-6 rounded-t-[4px] transition-colors',
                    isSelected ? 'bg-[#ddd6fe]' : column.muted ? 'bg-accent-soft/35' : 'bg-accent-soft',
                  )}
                  style={{ height: `${(column.value / max) * 100}%` }}
                />
              </button>
            )
          })}
        </div>
      </div>
      <div className="mt-1.5 flex gap-[2px]">
        {columns.map((column) => (
          <span key={column.key} className="tabular min-w-0 flex-1 text-center text-[10px] text-muted">
            {column.axisLabel}
          </span>
        ))}
      </div>
    </div>
  )
}
