import { useTranslation } from 'react-i18next'
import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom'
import { AccountMenu } from '@/features/auth/AccountMenu'
import { LanguageToggle } from './LanguageToggle'
import { LogFab } from './LogFab'
import { SideNav } from './SideNav'
import { TabBar } from './TabBar'

export function AppShell() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  // Focused flows (logging, editing) hide the tab bar and "+ Log" to leave room for their own actions.
  const focused = pathname === '/log' || pathname.endsWith('/edit')
  // "+ Log" floats over the three main tabs only; detail screens have their own actions.
  const topLevel = ['/', '/search', '/share', '/wishlist'].includes(pathname)

  return (
    <div className="min-h-dvh md:pl-60">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-ink px-4 py-2 text-paper focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        {t('a11y.skipToContent')}
      </a>
      <SideNav />
      <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between border-b border-line bg-paper/95 px-4 backdrop-blur md:hidden">
        <p className="font-display text-xl font-semibold text-terracotta">{t('app.name')}</p>
        <div className="flex items-center gap-1">
          <AccountMenu compact />
          <LanguageToggle />
        </div>
      </header>
      <ScrollRestoration />
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl px-4 pt-6 pb-40 outline-none md:px-8 md:pt-10 md:pb-24"
      >
        <Outlet />
        {/* Inside <main> so it belongs to a landmark; it is position:fixed, so it still floats. */}
        {topLevel && <LogFab />}
      </main>
      {!focused && <TabBar />}
    </div>
  )
}
