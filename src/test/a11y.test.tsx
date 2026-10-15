import axe, { type Result } from 'axe-core'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '@/test/renderApp'
import { createFakeAuth } from '@/test/fakeAuth'
import { STORAGE_KEYS } from '@/test/testRepositories'

vi.mock('@/features/share/renderShareCard', () => ({
  renderShareCard: vi.fn(() => Promise.resolve(new Blob(['png'], { type: 'image/png' }))),
}))

/**
 * Runs axe-core on the whole rendered page. jsdom has no CSS, so two rules can't be judged here:
 *  - `color-contrast` (checked against the palette in index.css, and in a real browser)
 *  - `landmark-unique`: the tab bar and side nav share a label, but CSS shows only one per
 *    breakpoint, so a real browser exposes a single "main navigation" landmark.
 */
async function expectNoViolations() {
  const results = await axe.run(document.body, {
    rules: {
      'color-contrast': { enabled: false },
      'landmark-unique': { enabled: false },
      region: { enabled: false },
    },
  })
  const summary = results.violations.map(
    (v: Result) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => n.html.slice(0, 140)).join('\n  ')}`,
  )
  expect(summary).toEqual([])
}

describe('accessibility (axe-core)', () => {
  beforeEach(() => {
    // axe probes canvas support; jsdom has none and would log a "not implemented" warning.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    vi.stubGlobal(
      'URL',
      Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:card'), revokeObjectURL: vi.fn() }),
    )
  })

  it('Journal', async () => {
    renderApp('/')
    await screen.findByText('14 comidas anotadas')
    await expectNoViolations()
  })

  it('Journal: empty / onboarding', async () => {
    renderApp('/', { prepare: (s) => s.setItem(STORAGE_KEYS.seedMode, 'empty') })
    await screen.findByText('Tu diario está esperando su primera comida')
    await expectNoViolations()
  })

  it('Journal: error state', async () => {
    renderApp('/', { prepare: (s) => s.setItem(STORAGE_KEYS.failFlag, '1') })
    await screen.findByRole('alert')
    await expectNoViolations()
  })

  it('Entry detail', async () => {
    renderApp('/entry/entry-04')
    await screen.findByRole('heading', { level: 1, name: 'Bodega Piedra Azul' })
    await expectNoViolations()
  })

  it('Entry detail: delete dialog', async () => {
    const user = userEvent.setup()
    renderApp('/entry/entry-04')
    await user.click(await screen.findByRole('button', { name: 'Borrar' }))
    await screen.findByRole('dialog')
    await expectNoViolations()
  })

  it('Entry detail: share dialog', async () => {
    const user = userEvent.setup()
    renderApp('/entry/entry-04')
    await user.click(await screen.findByRole('button', { name: 'Compartir' }))
    const dialog = await screen.findByRole('dialog')
    await within(dialog).findByRole('img')
    await expectNoViolations()
  })

  it('Entry edit', async () => {
    renderApp('/entry/entry-04/edit')
    await screen.findByRole('heading', { level: 1, name: 'Editar entrada' })
    await expectNoViolations()
  })

  it('Quick log: step 1, new place form, steps 2 and 3', async () => {
    const user = userEvent.setup()
    renderApp('/log')
    await screen.findByLabelText('¿Dónde comiste?')
    await expectNoViolations()

    await user.type(screen.getByLabelText('¿Dónde comiste?'), 'Lugar Nuevo')
    await user.click(screen.getByRole('button', { name: /Crear “Lugar Nuevo”/ }))
    await expectNoViolations()

    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    await screen.findByRole('heading', { level: 2, name: 'Plato, precio y reacción' })
    await user.click(screen.getByRole('button', { name: 'Guardar ahora' })) // shows the error state
    await screen.findByText('Contanos cómo estuvo.')
    await expectNoViolations()

    await user.click(screen.getByRole('button', { name: 'Me encantó' }))
    await user.type(screen.getByLabelText('¿Qué comiste?'), 'Pizza{Enter}')
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    await screen.findByRole('heading', { level: 2, name: 'Algo más para recordar' })
    await expectNoViolations()
  })

  it('Share tab', async () => {
    renderApp('/share')
    await screen.findAllByRole('button', { name: /^Compartir / })
    await expectNoViolations()
  })

  it('Share tab: dialog open', async () => {
    const user = userEvent.setup()
    renderApp('/share')
    await user.click((await screen.findAllByRole('button', { name: /^Compartir / }))[0]!)
    const dialog = await screen.findByRole('dialog')
    await within(dialog).findByRole('img')
    await expectNoViolations()
  })

  it('Search with filters open', async () => {
    const user = userEvent.setup()
    renderApp('/search?cuisine=vino')
    await user.click(await screen.findByRole('button', { name: /^Filtros/ }))
    await expectNoViolations()
  })

  it('Search: no results', async () => {
    renderApp('/search?q=zzzz')
    await screen.findByText('No hay coincidencias')
    await expectNoViolations()
  })

  it('Wishlist with the add form open', async () => {
    const user = userEvent.setup()
    renderApp('/wishlist')
    await user.click(await screen.findByRole('button', { name: /Sumar un lugar/ }))
    await screen.findByLabelText('¿Dónde comiste?')
    await expectNoViolations()
  })

  it('Not found page', async () => {
    renderApp('/nope')
    await screen.findByRole('heading', { name: 'No encontramos esa página' })
    await expectNoViolations()
  })

  it('English UI', async () => {
    const user = userEvent.setup()
    renderApp('/')
    await screen.findByText('14 comidas anotadas')
    await user.click(screen.getAllByRole('button', { name: /English/ })[0]!)
    await screen.findByText('14 meals logged')
    await expectNoViolations()
  })
  describe('account screens', () => {
    it.each([
      ['login', '/login'],
      ['sign up', '/signup'],
      ['forgot password', '/forgot-password'],
      ['reset password (invalid link)', '/reset-password'],
    ])('%s', async (_name, path) => {
      renderApp(path, { auth: createFakeAuth() })
      await screen.findByRole('heading', { level: 1 })
      await expectNoViolations()
    })

    it('login with validation errors showing', async () => {
      const user = userEvent.setup()
      renderApp('/login', { auth: createFakeAuth() })
      await user.click(await screen.findByRole('button', { name: 'Entrar' }))
      await screen.findByText('Poné tu email.')
      await expectNoViolations()
    })

    it('sign up: check-your-email confirmation', async () => {
      const user = userEvent.setup()
      renderApp('/signup', { auth: createFakeAuth({ requireConfirmation: true }) })
      await user.type(await screen.findByLabelText('Email'), 'a@b.co')
      await user.type(screen.getByLabelText('Contraseña'), 'buenapass1')
      await user.type(screen.getByLabelText('Repetí la contraseña'), 'buenapass1')
      await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))
      await screen.findByRole('heading', { level: 1, name: 'Revisá tu email' })
      await expectNoViolations()
    })

    it('the account dialog', async () => {
      const user = userEvent.setup()
      renderApp('/', { auth: createFakeAuth({ signedInAs: 'ana@example.com' }) })
      await user.click((await screen.findAllByRole('button', { name: 'Cuenta' }))[0]!)
      await screen.findByRole('dialog')
      await expectNoViolations()
    })
  })
})
