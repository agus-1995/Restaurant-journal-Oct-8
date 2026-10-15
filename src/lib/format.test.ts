import { formatEntryDate, formatMonthYear, formatPriceTier, parseISODate } from './format'
import { normalizeText, slugify } from './text'

describe('normalizeText', () => {
  it('lowercases and strips accents', () => {
    expect(normalizeText('  Empánada de Bulgogi  ')).toBe('empanada de bulgogi')
    expect(normalizeText('Luján de Cuyo')).toBe('lujan de cuyo')
  })
})

describe('slugify', () => {
  it('makes a safe file-name slug', () => {
    expect(slugify('Bodegón Don Anselmo!')).toBe('bodegon-don-anselmo')
    expect(slugify('  ¡¡¡  ')).toBe('entrada')
  })
})

describe('dates', () => {
  it('parses YYYY-MM-DD as a local date (no off-by-one from UTC)', () => {
    const date = parseISODate('2026-10-07')
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 9, 7])
  })

  it('omits the year for the current year and includes it otherwise', () => {
    const now = new Date(2026, 9, 7)
    expect(formatEntryDate('2026-09-29', 'es-AR', now)).toMatch(/29/)
    expect(formatEntryDate('2026-09-29', 'es-AR', now)).not.toMatch(/2026/)
    expect(formatEntryDate('2025-09-29', 'es-AR', now)).toMatch(/2025/)
  })

  it('formats in the requested language', () => {
    expect(formatMonthYear('2026-10-01', 'es-AR')).toBe('octubre de 2026')
    expect(formatMonthYear('2026-10-01', 'en')).toBe('October 2026')
  })
})

describe('formatPriceTier', () => {
  it('is currency-free', () => {
    expect([1, 2, 3].map((tier) => formatPriceTier(tier as 1 | 2 | 3))).toEqual(['$', '$$', '$$$'])
  })
})
