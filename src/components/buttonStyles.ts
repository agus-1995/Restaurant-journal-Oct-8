export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

const BASE =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-terracotta text-paper hover:bg-terracotta-deep',
  secondary: 'border-2 border-ink text-ink hover:bg-ink hover:text-paper',
  ghost: 'text-ink-soft hover:bg-paper-deep hover:text-ink',
  danger: 'bg-wine text-paper hover:bg-ink',
}

/** Shared by <Button> and link-styled-as-button, so both look and size identically. */
export function buttonStyles(variant: ButtonVariant = 'primary', fullWidth = false): string {
  return `${BASE} ${VARIANTS[variant]}${fullWidth ? ' w-full' : ''}`
}
