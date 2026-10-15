import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '@/test/renderApp'
import { STORAGE_KEYS } from '@/test/testRepositories'

vi.mock('@/features/share/renderShareCard', () => ({
  renderShareCard: vi.fn(() => Promise.resolve(new Blob(['png'], { type: 'image/png' }))),
}))

describe('Share tab ("Compartir")', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'URL',
      Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:card'), revokeObjectURL: vi.fn() }),
    )
  })

  it('is a main tab, between Buscar and Quiero probar, with a share icon', async () => {
    renderApp('/')
    const nav = screen.getAllByRole('navigation', { name: 'Navegación principal' })[0]!
    const labels = within(nav)
      .getAllByRole('link')
      .map((link) => link.textContent)
    expect(labels).toEqual(['Diario', 'Buscar', 'Compartir', 'Quiero probar'])
    expect(within(nav).getByRole('link', { name: 'Compartir' })).toHaveAttribute('href', '/share')
    // its icon is the share glyph, not a second magnifier
    const icon = within(nav).getByRole('link', { name: 'Compartir' }).querySelector('svg')
    expect(icon?.innerHTML).toContain('M12 15V3')
    await screen.findByRole('heading', { level: 1, name: 'Tu diario' })
  })

  it('lists your entries newest first, each with a Share button', async () => {
    renderApp('/share')
    expect(await screen.findByRole('heading', { level: 1, name: 'Compartir' })).toBeInTheDocument()
    expect(screen.getByText('Elegí una entrada y compartila como imagen.')).toBeInTheDocument()
    const buttons = await screen.findAllByRole('button', { name: /^Compartir / })
    expect(buttons).toHaveLength(14)
    expect(buttons[0]).toHaveAccessibleName(/^Compartir Bodegón Don Anselmo del \d+ oct$/)
    // two entries share a place name: the date keeps every button's name unique
    const names = buttons.map((b) => b.getAttribute('aria-label'))
    expect(new Set(names).size).toBe(names.length)
  })

  it('opens the share card dialog for the chosen entry and closes it again', async () => {
    const user = userEvent.setup()
    renderApp('/share')
    await user.click(
      await screen.findByRole('button', { name: /^Compartir Kimchi y Provoleta del/ }),
    )
    const dialog = await screen.findByRole('dialog', { name: 'Compartir esta entrada' })
    expect(
      await within(dialog).findByAltText(
        'Vista previa de la tarjeta para compartir de Kimchi y Provoleta',
      ),
    ).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('has an empty state that leads to logging a first meal', async () => {
    renderApp('/share', { prepare: (s) => s.setItem(STORAGE_KEYS.seedMode, 'empty') })
    expect(await screen.findByText('Todavía no hay nada para compartir')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Anotar una comida' })).toHaveAttribute('href', '/log')
  })

  it('shows an error with retry', async () => {
    const user = userEvent.setup()
    const { storage } = renderApp('/share', {
      prepare: (s) => s.setItem(STORAGE_KEYS.failFlag, '1'),
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar esto')
    storage.removeItem(STORAGE_KEYS.failFlag)
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findAllByRole('button', { name: /^Compartir / })).toHaveLength(14)
  })

  it('works in English', async () => {
    const user = userEvent.setup()
    renderApp('/share')
    await screen.findAllByRole('button', { name: /^Compartir / })
    await user.click(screen.getAllByRole('button', { name: /English/ })[0]!)
    expect(await screen.findByRole('heading', { level: 1, name: 'Share' })).toBeInTheDocument()
    const both = screen.getAllByRole('button', {
      name: /^Share Bodegón Don Anselmo from [A-Z][a-z]+ \d+$/,
    })
    expect(both).toHaveLength(2)
    expect(both[0]?.getAttribute('aria-label')).not.toBe(both[1]?.getAttribute('aria-label'))
  })
})
