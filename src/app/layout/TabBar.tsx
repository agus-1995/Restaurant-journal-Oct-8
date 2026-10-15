import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { Icon } from '@/components/Icon'
import { NAV_ITEMS } from './navItems'

/** Mobile bottom tab bar (hidden from md up, where SideNav takes over). */
export function TabBar() {
  const { t } = useTranslation()
  return (
    <nav
      aria-label={t('nav.main')}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex max-w-md">
        {NAV_ITEMS.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-semibold ${
                  isActive ? 'text-terracotta' : 'text-ink-soft'
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
  )
}
