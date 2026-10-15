import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router-dom'
import { LanguageToggle } from '@/app/layout/LanguageToggle'

/** The plain frame around login / sign-up: brand, language switch, a centered card. */
export function AuthFrame() {
  const { t } = useTranslation()
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex min-h-14 max-w-md items-center justify-between px-4 pt-2">
        <p className="font-display text-2xl font-semibold text-terracotta">{t('app.name')}</p>
        <LanguageToggle />
      </header>
      <main id="main" className="mx-auto w-full max-w-md px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
