/** The slice of the Web Storage API the mock layer uses (real `localStorage` satisfies it). */
export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** In-memory stand-in: used when localStorage is unavailable, and by tests. */
export class MemoryStorage implements KeyValueStorage {
  private readonly data = new Map<string, string>()

  getItem(key: string): string | null {
    return this.data.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value)
  }

  removeItem(key: string): void {
    this.data.delete(key)
  }
}
