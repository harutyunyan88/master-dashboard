import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate } from 'react-router'

import { ApiError, getToken, login, setToken } from '../api/client.ts'
import { LanguageSwitch } from '../components/PageHeader.tsx'

export default function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (getToken()) return <Navigate to="/" replace />

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { token } = await login(password)
      setToken(token)
      navigate('/', { replace: true })
    } catch (e) {
      setError(e instanceof ApiError && e.status === 401 ? t('login.wrong') : t('common.loadError'))
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <div className="absolute top-[max(1.25rem,env(safe-area-inset-top))] right-4">
        <LanguageSwitch />
      </div>
      <img src="/icon.svg" alt="" className="mx-auto size-20 rounded-3xl shadow-2xl shadow-accent/40" />
      <h1 className="mt-6 text-center text-2xl font-semibold tracking-tight">{t('login.title')}</h1>
      <p className="mt-1 text-center text-sm text-muted">{t('login.subtitle')}</p>

      <form onSubmit={submit} className="mt-8 space-y-3">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('login.password')}
          autoComplete="current-password"
          autoFocus
          className="w-full rounded-2xl border border-line bg-surface px-4 py-3.5 text-ink outline-none placeholder:text-muted/60 focus:border-accent-soft"
        />
        {error && <p className="text-sm text-red-300">{error}</p>}
        <button
          type="submit"
          disabled={busy || !password}
          className="w-full rounded-2xl bg-accent py-3.5 font-medium text-white shadow-lg shadow-accent/30 transition-opacity disabled:opacity-50"
        >
          {busy ? t('login.submitting') : t('login.submit')}
        </button>
      </form>
    </main>
  )
}
