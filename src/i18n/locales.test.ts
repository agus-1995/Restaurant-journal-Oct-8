import en from './en.json'
import es from './es-AR.json'

function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? flattenKeys(value as Record<string, unknown>, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  )
}

describe('locales', () => {
  it('English and Spanish define exactly the same keys', () => {
    expect(flattenKeys(en).sort()).toEqual(flattenKeys(es).sort())
  })

  it('has no empty translations', () => {
    const empty = (obj: Record<string, unknown>): string[] =>
      Object.entries(obj).flatMap(([k, v]) =>
        typeof v === 'object' && v !== null
          ? empty(v as Record<string, unknown>).map((p) => `${k}.${p}`)
          : v === ''
            ? [k]
            : [],
      )
    expect(empty(en)).toEqual([])
    expect(empty(es)).toEqual([])
  })
})
