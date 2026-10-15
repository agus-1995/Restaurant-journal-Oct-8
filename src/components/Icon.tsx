import type { ReactNode } from 'react'

export type IconName = 'journal' | 'search' | 'bookmark' | 'plus' | 'user' | 'share'

const PATHS: Record<IconName, ReactNode> = {
  journal: (
    <>
      <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v16H6.5A1.5 1.5 0 0 0 5 20.5v-16Z" />
      <path d="M5 20.5A1.5 1.5 0 0 0 6.5 22H19v-3M9 8h6M9 12h4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  bookmark: <path d="M7 3.5h10a1 1 0 0 1 1 1V21l-6-4-6 4V4.5a1 1 0 0 1 1-1Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  share: (
    <>
      <path d="M12 15V3" />
      <path d="m8 7 4-4 4 4" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
    </>
  ),
}

interface IconProps {
  name: IconName
  className?: string
}

/** Decorative icon: always hidden from assistive tech; the adjacent text carries the meaning. */
export function Icon({ name, className = 'size-6' }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {PATHS[name]}
    </svg>
  )
}
