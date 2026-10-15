import type { ZodType } from 'zod'
import { buildSeed, TEST_NOW } from '@/test/testRepositories'
import { defaultCity } from './defaultCity'
import { dishesFromNames, entryToFormValues, toCreateInput, toUpdateInput } from './mapping'
import { entryDetailsSchema, isValidationKey, logFormSchema, placeSelectionSchema } from './schema'

const existingPlace = { kind: 'existing', placeId: 'place-bodegon' } as const

/** The smallest valid quick-log details: date and reaction (everything else defaults). */
const details = {
  date: '2026-10-07',
  reaction: 'loved',
  photos: [],
  dishes: [],
  isUnusual: false,
  cuisineTags: [],
}
/** ...and with a place, the smallest valid quick-log submission. */
const minimal = { place: existingPlace, ...details }

function without<T extends object>(value: T, key: keyof T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([k]) => k !== key))
}

function messagesFor(input: unknown, schema: ZodType = logFormSchema): string[] {
  const result = schema.safeParse(input)
  return result.success ? [] : result.error.issues.map((issue) => issue.message)
}

describe('quick log validation', () => {
  it('accepts a log with only place, date and reaction filled in', () => {
    expect(logFormSchema.safeParse(minimal).success).toBe(true)
  })

  it('accepts a fully filled log', () => {
    const full = {
      ...minimal,
      photos: ['data:image/jpeg;base64,abc'],
      dishes: ['Milanesa', 'Flan'],
      priceTier: 2,
      occasion: 'friends',
      isUnusual: true,
      cuisineTags: ['argentina'],
      notes: 'Muy rico',
    }
    expect(logFormSchema.safeParse(full).success).toBe(true)
  })

  describe('place', () => {
    it('is required', () => {
      expect(messagesFor(without(minimal, 'place'))).toContain('validation.placeRequired')
    })

    it('rejects an existing selection with no id', () => {
      expect(placeSelectionSchema.safeParse({ kind: 'existing', placeId: '' }).success).toBe(false)
    })

    it('a new place needs a name and a city', () => {
      const messages = messagesFor(
        { kind: 'new', name: '  ', city: '', type: 'bar' },
        placeSelectionSchema,
      )
      expect(messages).toContain('validation.nameRequired')
      expect(messages).toContain('validation.cityRequired')
    })

    it('a new place with name and city is valid, neighborhood optional', () => {
      const result = placeSelectionSchema.safeParse({
        kind: 'new',
        name: ' La Parri ',
        city: 'Rosario',
        type: 'restaurant',
      })
      expect(result.success).toBe(true)
      expect(result.success && result.data.kind === 'new' && result.data.name).toBe('La Parri')
    })

    it('rejects an unknown place type', () => {
      expect(
        placeSelectionSchema.safeParse({ kind: 'new', name: 'X', city: 'Y', type: 'food truck' })
          .success,
      ).toBe(false)
    })
  })

  describe('reaction', () => {
    it('is required', () => {
      expect(messagesFor(without(minimal, 'reaction'))).toContain('validation.reactionRequired')
    })

    it('rejects values outside loved / good / meh', () => {
      expect(messagesFor({ ...minimal, reaction: 'amazing' })).toContain(
        'validation.reactionRequired',
      )
    })
  })

  describe('date', () => {
    it.each(['2026-02-30', '07/10/2026', '', 'hoy'])('rejects "%s"', (date) => {
      expect(messagesFor({ ...minimal, date })).toContain('validation.dateInvalid')
    })
  })

  describe('optional fields', () => {
    it('price tier must be 1, 2 or 3', () => {
      expect(entryDetailsSchema.safeParse({ ...minimal, priceTier: 4 }).success).toBe(false)
      expect(entryDetailsSchema.safeParse({ ...minimal, priceTier: 0 }).success).toBe(false)
      expect(entryDetailsSchema.safeParse({ ...minimal, priceTier: 3 }).success).toBe(true)
    })

    it('occasion must be a known value', () => {
      expect(entryDetailsSchema.safeParse({ ...minimal, occasion: 'party' }).success).toBe(false)
    })

    it('limits photos, dishes, tags and notes length', () => {
      expect(entryDetailsSchema.safeParse({ ...minimal, photos: Array(5).fill('x') }).success).toBe(
        false,
      )
      expect(
        entryDetailsSchema.safeParse({ ...minimal, dishes: Array(13).fill('x') }).success,
      ).toBe(false)
      expect(
        entryDetailsSchema.safeParse({ ...minimal, cuisineTags: Array(9).fill('x') }).success,
      ).toBe(false)
      expect(messagesFor({ ...minimal, notes: 'x'.repeat(1001) })).toContain('validation.tooLong')
    })

    it('rejects blank dish names', () => {
      expect(entryDetailsSchema.safeParse({ ...minimal, dishes: ['  '] }).success).toBe(false)
    })
  })

  it('every message the schema can produce is a known, translatable key', () => {
    const bad = {
      place: { kind: 'new', name: '', city: '', type: 'bar' },
      date: 'x',
      reaction: 'x',
      photos: [],
      dishes: [],
      isUnusual: false,
      cuisineTags: [],
      notes: 'x'.repeat(2000),
    }
    const messages = messagesFor(bad)
    expect(messages.length).toBeGreaterThan(0)
    for (const message of messages) expect(isValidationKey(message)).toBe(true)
  })
})

describe('form <-> entry mapping', () => {
  const seed = buildSeed(TEST_NOW)
  const entry = seed.entries.find((e) => e.id === 'entry-04')!

  it('dishesFromNames keeps the note of dishes that already had one', () => {
    expect(dishesFromNames(['Almuerzo de 3 pasos', 'Postre'], entry.dishes)).toEqual([
      { name: 'Almuerzo de 3 pasos', note: 'Cordero lento' },
      { name: 'Postre' },
    ])
  })

  it('toCreateInput maps values to a repository input, dropping blank notes', () => {
    const input = toCreateInput(
      {
        ...details,
        reaction: 'good',
        dishes: ['Flan'],
        notes: '   ',
        priceTier: 1,
      },
      'place-x',
    )
    expect(input).toMatchObject({
      placeId: 'place-x',
      date: '2026-10-07',
      reaction: 'good',
      dishes: [{ name: 'Flan' }],
      priceTier: 1,
    })
    expect(input.notes).toBeUndefined()
  })

  it('an unchanged edit round-trips: entry -> form values -> update patch', () => {
    const patch = toUpdateInput(entryToFormValues(entry), entry)
    expect(patch).toMatchObject({
      date: entry.date,
      reaction: entry.reaction,
      photos: entry.photos,
      dishes: entry.dishes,
      priceTier: entry.priceTier,
      occasion: entry.occasion,
      isUnusual: entry.isUnusual,
      cuisineTags: entry.cuisineTags,
      notes: entry.notes,
    })
  })

  it('an edit can clear optional fields', () => {
    const values = {
      ...entryToFormValues(entry),
      priceTier: undefined,
      occasion: undefined,
      notes: '',
    }
    const patch = toUpdateInput(values, entry)
    expect(patch.priceTier).toBeUndefined()
    expect(patch.occasion).toBeUndefined()
    expect(patch.notes).toBeUndefined()
  })
})

describe('defaultCity (smart default for new places)', () => {
  const { places, entries } = buildSeed(TEST_NOW)

  it('prefers the last city used', () => {
    expect(defaultCity(places, entries, { lastCity: 'Rosario' })).toBe('Rosario')
  })

  it('falls back to the city with the most entries', () => {
    expect(defaultCity(places, entries, {})).toBe('Buenos Aires')
    expect(defaultCity(places, entries, undefined)).toBe('Buenos Aires')
  })

  it('is blank when there is nothing to go on', () => {
    expect(defaultCity([], [], {})).toBe('')
  })
})
