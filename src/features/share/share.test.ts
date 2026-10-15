import { canShareFile, copyText, downloadUrl, shareFile } from './shareActions'
import { wrapLines } from './wrapText'

// One character = 10px, so widths are easy to reason about.
const measure = (text: string) => text.length * 10

describe('wrapLines (share card text layout)', () => {
  it('keeps short text on one line', () => {
    expect(wrapLines('Bodegón Don Anselmo', 400, measure, 2)).toEqual(['Bodegón Don Anselmo'])
  })

  it('wraps at word boundaries', () => {
    expect(wrapLines('Vermutería La Hora Dorada', 150, measure, 3)).toEqual([
      'Vermutería La',
      'Hora Dorada',
    ])
  })

  it('cuts overflowing text with an ellipsis on the last allowed line', () => {
    const lines = wrapLines('Almazara Olivares del Este de Maipú', 150, measure, 2)
    expect(lines).toHaveLength(2)
    expect(lines[1]?.endsWith('…')).toBe(true)
    for (const line of lines) expect(measure(line)).toBeLessThanOrEqual(150)
  })

  it('never splits a single very long word into nothing', () => {
    expect(wrapLines('Supercalifragilisticoespialidoso', 100, measure, 1)[0]).toMatch(/…$/)
  })

  it('handles empty input and extra whitespace', () => {
    expect(wrapLines('', 100, measure, 2)).toEqual([])
    expect(wrapLines('  a   b  ', 100, measure, 2)).toEqual(['a b'])
  })
})

describe('share actions', () => {
  const file = new File(['png'], 'card.png', { type: 'image/png' })

  it('canShareFile is false when the browser has no Web Share API (desktop)', () => {
    expect(canShareFile(file)).toBe(false)
  })

  it('canShareFile asks the browser whether it can share this file', () => {
    const canShare = vi.fn(() => true)
    vi.stubGlobal('navigator', { share: vi.fn(), canShare })
    expect(canShareFile(file)).toBe(true)
    expect(canShare).toHaveBeenCalledWith({ files: [file] })
    vi.stubGlobal('navigator', { share: vi.fn(), canShare: () => false })
    expect(canShareFile(file)).toBe(false)
  })

  it('shareFile resolves true on success and false if the user dismisses the sheet', async () => {
    const share = vi.fn(() => Promise.resolve())
    vi.stubGlobal('navigator', { share })
    await expect(shareFile(file, 'Title', 'Text')).resolves.toBe(true)
    expect(share).toHaveBeenCalledWith({ files: [file], title: 'Title', text: 'Text' })

    vi.stubGlobal('navigator', {
      share: () => Promise.reject(new DOMException('cancelled', 'AbortError')),
    })
    await expect(shareFile(file, 'T', 'X')).resolves.toBe(false)
  })

  it('shareFile surfaces real failures', async () => {
    vi.stubGlobal('navigator', {
      share: () => Promise.reject(new DOMException('nope', 'NotAllowedError')),
    })
    await expect(shareFile(file, 'T', 'X')).rejects.toThrow('nope')
  })

  it('downloadUrl clicks a temporary download link and cleans it up', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    downloadUrl('blob:abc', 'tarjeta.png')
    expect(click).toHaveBeenCalledTimes(1)
    expect(document.querySelector('a[download]')).toBeNull()
  })

  it('copyText uses the async clipboard when available', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    await copyText('https://example.test/entry/1')
    expect(writeText).toHaveBeenCalledWith('https://example.test/entry/1')
  })

  it('copyText falls back to execCommand when there is no clipboard API', async () => {
    vi.stubGlobal('navigator', {})
    const exec = vi.fn(() => true)
    Object.defineProperty(document, 'execCommand', { value: exec, configurable: true })
    await copyText('hola')
    expect(exec).toHaveBeenCalledWith('copy')
    expect(document.querySelector('textarea')).toBeNull()
  })

  it('copyText fails loudly if the fallback is rejected', async () => {
    vi.stubGlobal('navigator', {})
    Object.defineProperty(document, 'execCommand', { value: () => false, configurable: true })
    await expect(copyText('hola')).rejects.toThrow()
  })
})
