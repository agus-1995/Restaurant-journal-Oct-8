import type { ButtonHTMLAttributes } from 'react'
import { buttonStyles, type ButtonVariant } from './buttonStyles'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  fullWidth?: boolean
}

export function Button({
  variant = 'primary',
  fullWidth = false,
  type = 'button',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${buttonStyles(variant, fullWidth)} ${className}`.trim()}
      {...props}
    />
  )
}
