import { useTranslation } from 'react-i18next'

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <ul className="space-y-3" aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="skeleton h-[84px] rounded-2xl" />
      ))}
    </ul>
  )
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      <p className="text-3xl">💅</p>
      <p className="mt-2 text-sm text-muted">{text}</p>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-6 text-center">
      <p className="text-sm text-red-200">{message ?? t('common.loadError')}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-full bg-surface-2 px-5 py-2 text-sm font-medium hover:bg-line"
      >
        {t('common.tryAgain')}
      </button>
    </div>
  )
}
