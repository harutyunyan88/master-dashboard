import clsx from '../../lib/clsx.ts'

interface Props<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}

export default function ToggleChips<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={clsx(
            'rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
            value === option.value ? 'bg-accent text-white' : 'bg-surface-2 text-muted hover:text-ink',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
