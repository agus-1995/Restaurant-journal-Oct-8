/**
 * Unique id. `crypto.randomUUID` only exists in secure contexts (https / localhost), so
 * testing on a phone over `http://192.168.x.x` would crash without the fallback.
 */
export function newId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
