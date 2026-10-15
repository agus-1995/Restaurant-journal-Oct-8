import { joinEntriesWithPlaces } from './join'
import {
  collectCuisineTags,
  collectNeighborhoods,
  countActiveFilters,
  EMPTY_FILTERS,
  filterEntries,
  hasAnyFilter,
  parseFilters,
  serializeFilters,
  type EntryFilters,
} from './filters'
import { buildSeed, TEST_NOW } from '@/test/testRepositories'

const seed = buildSeed(TEST_NOW)
const all = joinEntriesWithPlaces(seed.entries, seed.places)

function run(overrides: Partial<EntryFilters>) {
  return filterEntries(all, { ...EMPTY_FILTERS, ...overrides })
}
const ids = (entries: { id: string }[]) => entries.map((e) => e.id).sort()

describe('filterEntries', () => {
  it('returns everything when no filter is set', () => {
    expect(run({})).toHaveLength(all.length)
  })

  describe('text search', () => {
    it('matches place names, ignoring case and accents', () => {
      expect(ids(run({ query: 'bodegon' }))).toEqual(['entry-01', 'entry-14'])
      expect(ids(run({ query: 'BODEGÓN' }))).toEqual(['entry-01', 'entry-14'])
    })

    it('matches dishes, so "empanada" finds both the empanada shop and the bulgogi empanada', () => {
      expect(ids(run({ query: 'empanada' }))).toEqual(['entry-03', 'entry-06'])
    })

    it('matches neighborhoods, cities, cuisine tags and notes', () => {
      expect(ids(run({ query: 'san telmo' }))).toEqual(['entry-01', 'entry-14'])
      expect(ids(run({ query: 'mendoza' })).length).toBe(6)
      expect(ids(run({ query: 'kimchi' }))).toEqual(['entry-03'])
      expect(ids(run({ query: 'cordillera' }))).toEqual(['entry-04'])
    })

    it('requires every word to match (in any order)', () => {
      expect(ids(run({ query: 'malbec piedra' }))).toEqual(['entry-04'])
      expect(run({ query: 'malbec kimchi' })).toEqual([])
    })

    it('ignores surrounding whitespace and finds nothing for gibberish', () => {
      expect(run({ query: '   ' })).toHaveLength(all.length)
      expect(run({ query: 'zzzzzz' })).toEqual([])
    })
  })

  describe('structured filters', () => {
    it('price tier matches any selected tier, and skips entries without a price', () => {
      expect(ids(run({ priceTiers: [3] }))).toEqual(['entry-04', 'entry-07', 'entry-10'])
      expect(run({ priceTiers: [1, 3] }).length).toBe(
        all.filter((e) => e.priceTier === 1 || e.priceTier === 3).length,
      )
    })

    it('reaction matches any selected reaction', () => {
      expect(ids(run({ reactions: ['meh'] }))).toEqual(['entry-12'])
      expect(run({ reactions: ['meh', 'loved'] }).length).toBe(7)
    })

    it('occasion matches any selected occasion', () => {
      expect(ids(run({ occasions: ['work'] }))).toEqual(['entry-09'])
    })

    it('"unusual only" keeps just the flagged finds', () => {
      expect(ids(run({ unusualOnly: true }))).toEqual(['entry-03', 'entry-11', 'entry-13'])
    })

    it('cuisine matches entries that have any selected tag (accent-insensitive)', () => {
      expect(ids(run({ cuisines: ['vino'] }))).toEqual(['entry-04', 'entry-07', 'entry-13'])
      expect(ids(run({ cuisines: ['CAFE'] }))).toEqual(['entry-09'])
    })

    it('neighborhood matches exactly (accent-insensitive)', () => {
      expect(ids(run({ neighborhood: 'Maipú' }))).toEqual(['entry-11', 'entry-13'])
      expect(ids(run({ neighborhood: 'maipu' }))).toEqual(['entry-11', 'entry-13'])
    })
  })

  it('combines different filters with AND', () => {
    expect(ids(run({ cuisines: ['vino'], reactions: ['loved'] }))).toEqual(['entry-04', 'entry-07'])
    expect(ids(run({ cuisines: ['vino'], reactions: ['loved'], priceTiers: [1] }))).toEqual([])
    expect(ids(run({ query: 'mendoza', unusualOnly: true }))).toEqual(['entry-11', 'entry-13'])
  })

  it('never mutates its input', () => {
    const before = [...all]
    run({ query: 'x', reactions: ['loved'] })
    expect(all).toEqual(before)
  })
})

describe('filter option lists', () => {
  it('collects distinct cuisine tags, most used first', () => {
    const tags = collectCuisineTags(all)
    expect(new Set(tags).size).toBe(tags.length)
    expect(tags.slice(0, 2)).toEqual(['argentina', 'vino'])
  })

  it('merges tags that differ only by case or accents', () => {
    const tagged = all.slice(0, 2).map((entry, i) => ({
      ...entry,
      cuisineTags: [i === 0 ? 'Café' : 'cafe'],
    }))
    expect(collectCuisineTags(tagged)).toEqual(['Café'])
  })

  it('collects distinct neighborhoods alphabetically', () => {
    const hoods = collectNeighborhoods(all)
    expect(hoods).toEqual([...hoods].sort((a, b) => a.localeCompare(b, 'es')))
    expect(hoods).toContain('San Telmo')
    expect(new Set(hoods).size).toBe(hoods.length)
  })
})

describe('active filter helpers', () => {
  it('counts each chip/select filter once, not the text query', () => {
    expect(countActiveFilters(EMPTY_FILTERS)).toBe(0)
    expect(
      countActiveFilters({
        ...EMPTY_FILTERS,
        query: 'x',
        priceTiers: [1, 2],
        reactions: ['loved'],
        unusualOnly: true,
      }),
    ).toBe(3)
  })

  it('hasAnyFilter includes the text query', () => {
    expect(hasAnyFilter(EMPTY_FILTERS)).toBe(false)
    expect(hasAnyFilter({ ...EMPTY_FILTERS, query: 'vino' })).toBe(true)
    expect(hasAnyFilter({ ...EMPTY_FILTERS, neighborhood: 'Palermo' })).toBe(true)
  })
})

describe('URL round trip', () => {
  const full: EntryFilters = {
    query: 'bodegón rico',
    priceTiers: [2, 3],
    reactions: ['loved', 'good'],
    occasions: ['friends'],
    cuisines: ['vino', 'cocina de autor'],
    neighborhood: 'Luján de Cuyo',
    unusualOnly: true,
  }

  it('serializes and parses back to the same filters', () => {
    expect(parseFilters(serializeFilters(full))).toEqual(full)
  })

  it('writes nothing for empty filters', () => {
    expect(serializeFilters(EMPTY_FILTERS).toString()).toBe('')
    expect(parseFilters(new URLSearchParams())).toEqual(EMPTY_FILTERS)
  })

  it('ignores unknown or invalid values instead of breaking', () => {
    const parsed = parseFilters(
      new URLSearchParams('price=1,9,abc&reaction=loved,amazing&occasion=party&unusual=yes'),
    )
    expect(parsed.priceTiers).toEqual([1])
    expect(parsed.reactions).toEqual(['loved'])
    expect(parsed.occasions).toEqual([])
    expect(parsed.unusualOnly).toBe(false)
  })
})
