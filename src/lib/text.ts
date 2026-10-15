/** Lowercases and strips accents so "empánada" matches "empanada" (essential for Spanish search). */
export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()
}

/** URL/file-name friendly version of a title. */
export function slugify(value: string): string {
  return (
    normalizeText(value)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'entrada'
  )
}
