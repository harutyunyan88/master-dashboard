import { useTranslation } from 'react-i18next'

import TopClients from '../components/charts/TopClients.tsx'
import PageHeader from '../components/PageHeader.tsx'

export default function Clients() {
  const { t } = useTranslation()
  return (
    <>
      <PageHeader eyebrow={t('nav.clients')} title={t('stats.topClients')} />
      <section className="rounded-3xl border border-line/50 bg-surface/80 p-4">
        <TopClients />
      </section>
    </>
  )
}
