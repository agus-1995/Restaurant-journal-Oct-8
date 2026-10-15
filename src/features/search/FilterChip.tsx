import type { ReactNode } from 'react'

interface FilterChipProps {
  pressed: boolean
  onClick: () => void
  children: ReactNode
  ariaLabel?: string
}

export function FilterChip({ pressed, onClick, children, ariaLabel }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={ariaLabel}
      onClick={onClick}
      className={`inline-flex min-h-11 items-center gap-1 rounded-full border-2 px-4 text-sm font-semibold transition-colors ${
        pressed
          ? 'border-ink bg-ink text-paper'
          : 'border-line bg-card text-ink hover:border-ink-soft'
      }`}
    >
      {children}
    </button>
  )
}
