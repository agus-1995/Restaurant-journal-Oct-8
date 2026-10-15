import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { MAX_NOTES_LENGTH } from '@/lib/limits'

interface ValueProps<T> {
  value: T
  onChange: (value: T) => void
  error?: string
}

export function DateField({ value, onChange, error }: ValueProps<string>) {
  const { t } = useTranslation()
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-base font-semibold">
        {t('form.date')}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        className="min-h-12 w-full rounded-2xl border-2 border-line bg-card px-4 text-base"
      />
      {error && (
        <p role="alert" className="mt-1 text-sm font-semibold text-wine">
          {error}
        </p>
      )}
    </div>
  )
}

export function UnusualField({ value, onChange }: ValueProps<boolean>) {
  const { t } = useTranslation()
  const helpId = useId()
  return (
    <label className="grid min-h-14 cursor-pointer grid-cols-[auto_1fr] items-center gap-x-3 rounded-2xl border-2 border-line bg-card px-4 py-2">
      <input
        type="checkbox"
        checked={value}
        aria-describedby={helpId}
        onChange={(event) => onChange(event.target.checked)}
        className="row-span-2 size-6 accent-terracotta"
      />
      <span className="font-semibold">
        <span aria-hidden="true">✨ </span>
        {t('form.unusual')}
      </span>
      <span id={helpId} className="text-sm text-ink-soft">
        {t('form.unusualHelp')}
      </span>
    </label>
  )
}

export function NotesField({ value, onChange, error }: ValueProps<string>) {
  const { t } = useTranslation()
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-base font-semibold">
        {t('form.notes')}
      </label>
      <textarea
        id={id}
        rows={4}
        value={value}
        maxLength={MAX_NOTES_LENGTH + 100}
        placeholder={t('form.notesPlaceholder')}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        className="w-full rounded-2xl border-2 border-line bg-card px-4 py-3 text-base"
      />
      {error && (
        <p role="alert" className="mt-1 text-sm font-semibold text-wine">
          {error}
        </p>
      )}
    </div>
  )
}
