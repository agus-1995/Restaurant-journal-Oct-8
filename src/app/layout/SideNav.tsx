import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { Icon } from '@/components/Icon'
import { AccountMenu } from '@/features/auth/AccountMenu'
import { LanguageToggle } from './LanguageToggle'
import { NAV_ITEMS } from './navItems'

/** Desktop/tablet side navigation (hidden below md, where TabBar takes over). */
export function SideNav() {
  const { t } = useTranslation()
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-line bg-paper-deep p-5 md:flex">
      <p className="font-display text-2xl font-semibold text-terracotta">{t('app.name')}</p>
      <p className="mt-1 text-sm text-ink-soft">{t('app.tagline')}</p>
      <nav aria-label={t('nav.main')} className="mt-8">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex min-h-12 items-center gap-3 rounded-xl px-3 font-semibold ${
                    isActive
                      ? 'bg-card text-terracotta shadow-sm'
                      : 'text-ink-soft hover:bg-card/60'
                  }`
                }
              >
                <Icon name={item.icon} />
                {t(item.labelKey)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-auto space-y-3">
        <AccountMenu className="-ml-3" />
        <LanguageToggle />
      </div>
    </aside>
  )
}
