import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { normalizeText } from '@/lib/text'
import { Button } from './Button'

interface TagInputProps {
  label: string
  values: string[]
  onChange: (values: string[]) => void
  placeholder: string
  hint: string
  addLabel: string
  removeLabel: (tag: string) => string
  max?: number
}

/**
 * Type a value, then Enter / comma / Add / leaving the field to turn it into a removable chip.
 * Committing on blur means a half-typed value is never lost when the user taps "Next".
 */
export function TagInput({
  label,
  values,
  onChange,
  placeholder,
  hint,
  addLabel,
  removeLabel,
  max = 10,
}: TagInputProps) {
  const { t } = useTranslation()
  const inputId = useId()
  const hintId = useId()
  const [draft, setDraft] = useState('')

  function commit() {
    const value = draft.trim()
    setDraft('')
    if (value === '' || values.length >= max) return
    if (values.some((existing) => normalizeText(existing) === normalizeText(value))) return
    onChange([...values, value])
  }

  return (
    <div>
      <label htmlFor={inputId} className="mb-2 block text-base font-semibold">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={inputId}
          type="text"
          value={draft}
          placeholder={placeholder}
          aria-describedby={hintId}
          enterKeyHint="done"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault()
              commit()
            }
          }}
          className="min-h-12 min-w-0 flex-1 rounded-2xl border-2 border-line bg-card px-4 text-base"
        />
        <Button
          variant="secondary"
          aria-label={addLabel}
          onClick={commit}
          disabled={values.length >= max}
          className="px-5"
        >
          {t('actions.add')}
        </Button>
      </div>
      <p id={hintId} className="mt-1 text-sm text-ink-soft">
        {hint}
      </p>
      {values.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {values.map((value) => (
            <li
              key={value}
              className="inline-flex min-h-11 items-center gap-1 rounded-full bg-paper-deep pl-4 text-sm font-semibold"
            >
              {value}
              <button
                type="button"
                aria-label={removeLabel(value)}
                onClick={() => onChange(values.filter((v) => v !== value))}
                className="flex size-11 items-center justify-center rounded-full text-ink-soft hover:text-ink"
              >
                <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
