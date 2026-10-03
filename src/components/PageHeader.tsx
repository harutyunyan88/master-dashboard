import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import { clearToken } from '../api/client.ts'
import { LANGUAGES } from '../i18n/index.ts'
import clsx from '../lib/clsx.ts'
import { LogoutIcon } from './icons.tsx'

export function LanguageSwitch() {
  const { i18n } = useTranslation()
  return (
    <div className="flex rounded-full bg-surface p-0.5 text-[11px] font-semibold">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          type="button"
          onClick={() => void i18n.changeLanguage(lang.code)}
          className={clsx(
            'rounded-full px-2.5 py-1.5 transition-colors',
            i18n.language === lang.code ? 'bg-accent text-white' : 'text-muted hover:text-ink',
          )}
        >
          {lang.label}
        </button>
      ))}
    </div>
  )
}

export default function PageHeader({ eyebrow, title, leading }: { eyebrow: string; title: string; leading?: ReactNode }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const logout = () => {
    clearToken()
    navigate('/login', { replace: true })
  }

  return (
    <header className="mb-5 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2">
        {leading}
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-[0.18em] text-accent-soft uppercase">{eyebrow}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight break-words">{title}</h1>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <LanguageSwitch />
        <button
          type="button"
          onClick={logout}
          aria-label={t('common.logout')}
          title={t('common.logout')}
          className="rounded-full p-2.5 text-muted transition-colors hover:bg-surface hover:text-ink"
        >
          <LogoutIcon />
        </button>
      </div>
    </header>
  )
}
