import type { IconName } from '@/components/Icon'

export const NAV_ITEMS = [
  { to: '/', labelKey: 'nav.journal', icon: 'journal', end: true },
  { to: '/search', labelKey: 'nav.search', icon: 'search', end: false },
  { to: '/share', labelKey: 'nav.share', icon: 'share', end: false },
  { to: '/wishlist', labelKey: 'nav.wishlist', icon: 'bookmark', end: false },
] as const satisfies readonly {
  to: string
  labelKey: string
  icon: IconName
  end: boolean
}[]
