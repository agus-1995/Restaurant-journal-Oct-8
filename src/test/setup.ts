import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import i18n, { DEFAULT_LANGUAGE } from '@/i18n'

beforeEach(() => {
  // jsdom doesn't implement scrolling; the router and carousel call these.
  window.scrollTo = vi.fn()
  Element.prototype.scrollTo = vi.fn()
})

afterEach(async () => {
  cleanup()
  localStorage.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  await i18n.changeLanguage(DEFAULT_LANGUAGE)
})
