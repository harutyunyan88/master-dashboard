import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router'

import clsx from '../lib/clsx.ts'
import { ChartIcon, HistoryIcon, HomeIcon, UsersIcon } from './icons.tsx'

const LINKS = [
  { to: '/', key: 'nav.today', icon: <HomeIcon /> },
  { to: '/history', key: 'nav.history', icon: <HistoryIcon /> },
  { to: '/stats', key: 'nav.stats', icon: <ChartIcon /> },
  { to: '/clients', key: 'nav.clients', icon: <UsersIcon /> },
]

export default function BottomNav() {
  const { t } = useTranslation()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-md gap-1 rounded-3xl border border-line/70 bg-surface/85 p-1.5 shadow-2xl shadow-black/40 backdrop-blur-lg">
        {LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            // "/clients" stays highlighted on a client's own page (/clients/:id)
            end={link.to !== '/clients'}
            className={({ isActive }) =>
              clsx(
                'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[11px] font-medium transition-colors',
                isActive ? 'bg-accent text-white shadow-lg shadow-accent/30' : 'text-muted hover:text-ink',
              )
            }
          >
            {link.icon}
            <span className="max-w-full truncate px-1">{t(link.key)}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
