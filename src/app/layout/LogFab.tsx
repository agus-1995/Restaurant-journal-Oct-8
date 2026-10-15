import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/Icon'

/** Floating "+ Log" button, placed in the thumb zone above the mobile tab bar. */
export function LogFab() {
  const { t } = useTranslation()
  return (
    <Link
      to="/log"
      aria-label={t('actions.logAria')}
      className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 inline-flex min-h-14 items-center gap-2 rounded-none bg-terracotta px-6 text-lg font-semibold text-paper shadow-fab hover:bg-terracotta-deep md:right-8 md:bottom-8"
    >
      <Icon name="plus" className="size-6" />
      {t('actions.log')}
    </Link>
  )
}
