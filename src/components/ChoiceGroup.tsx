import { useId } from 'react'

export interface ChoiceOption<T> {
  value: T
  label: string
  /** Emoji or short glyph shown above/before the label (decorative). */
  icon?: string
  /** Accessible name when it should differ from the visible label. */
  ariaLabel?: string
}

interface ChoiceGroupProps<T extends string | number> {
  legend: string
  options: readonly ChoiceOption<T>[]
  value: T | undefined
  onChange: (value: T | undefined) => void
  /** Optional fields: tapping the selected option again clears it. */
  allowDeselect?: boolean
  error?: string
  /** `tall` = big stacked tap targets (used for the key "how was it" choice). */
  size?: 'compact' | 'tall'
  columns?: 2 | 3
}

/** A set of toggle buttons acting as a single-choice field (works with touch, keyboard, SR). */
export function ChoiceGroup<T extends string | number>({
  legend,
  options,
  value,
  onChange,
  allowDeselect = false,
  error,
  size = 'compact',
  columns,
}: ChoiceGroupProps<T>) {
  const errorId = useId()
  const tall = size === 'tall'
  return (
    <fieldset aria-describedby={error ? errorId : undefined} className="min-w-0">
      <legend className="mb-2 text-base font-semibold">{legend}</legend>
      <div
        className={
          columns === 3 || tall
            ? 'grid grid-cols-3 gap-2'
            : columns === 2
              ? 'grid grid-cols-2 gap-2'
              : 'flex flex-wrap gap-2'
        }
      >
        {options.map((option) => {
          const selected = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              aria-label={option.ariaLabel}
              onClick={() => onChange(selected && allowDeselect ? undefined : option.value)}
              className={`flex items-center justify-center rounded-2xl border-2 font-semibold transition-colors ${
                tall ? 'min-h-24 flex-col gap-1 px-2 text-sm' : 'min-h-12 gap-2 px-4'
              } ${
                selected
                  ? 'border-ink bg-ink text-paper'
                  : 'border-line bg-card text-ink hover:border-ink-soft'
              }`}
            >
              {option.icon && (
                <span aria-hidden="true" className={tall ? 'text-3xl' : 'text-lg'}>
                  {option.icon}
                </span>
              )}
              <span>{option.label}</span>
            </button>
          )
        })}
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-sm font-semibold text-wine">
          {error}
        </p>
      )}
    </fieldset>
  )
}
