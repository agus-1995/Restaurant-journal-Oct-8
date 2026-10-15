import { useId, useState, type InputHTMLAttributes } from 'react'
import { useTranslation } from 'react-i18next'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
  /** Adds a show/hide button (for passwords). */
  revealable?: boolean
}

/** Labelled input with an accessible error, used by the account screens. */
export function TextField({
  label,
  error,
  hint,
  revealable = false,
  type,
  ...props
}: TextFieldProps) {
  const { t } = useTranslation()
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const [revealed, setRevealed] = useState(false)
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-base font-semibold">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={revealable && revealed ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={`min-h-14 w-full rounded-2xl border-2 border-line bg-card px-4 text-lg ${revealable ? 'pr-24' : ''}`}
          {...props}
        />
        {revealable && (
          <button
            type="button"
            aria-pressed={revealed}
            aria-label={revealed ? t('auth.hidePassword') : t('auth.showPassword')}
            onClick={() => setRevealed((current) => !current)}
            className="absolute inset-y-0 right-1 min-w-20 rounded-full px-3 text-sm font-semibold text-ink-soft hover:text-ink"
          >
            {revealed ? t('auth.hide') : t('auth.show')}
          </button>
        )}
      </div>
      {hint && !error && (
        <p id={hintId} className="mt-1 text-sm text-ink-soft">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-sm font-semibold text-wine">
          {error}
        </p>
      )}
    </div>
  )
}
