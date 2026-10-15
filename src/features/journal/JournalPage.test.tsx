import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '@/test/renderApp'
import { STORAGE_KEYS } from '@/test/testRepositories'

describe('Journal', () => {
  it('shows a loading state, then the entries newest first, grouped by month', async () => {
    renderApp('/')
    expect(screen.getByRole('status')).toHaveTextContent('Cargando…')

    expect(await screen.findByText('14 comidas anotadas')).toBeInTheDocument()
    const months = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(months).toEqual([
      'octubre de 2026',
      'septiembre de 2026',
      'agosto de 2026',
      'julio de 2026',
    ])

    const cards = screen.getAllByRole('link', { name: /Bodegón Don Anselmo|Vermutería/ })
    expect(cards[0]).toHaveAccessibleName(/Bodegón Don Anselmo/)
  })

  it('shows the subtitle under the title (from the Figma design), in both languages', async () => {
    const user = userEvent.setup()
    renderApp('/')
    expect(await screen.findByText('Agregá las comidas que más te han gustado')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: /English/ })[0]!)
    expect(await screen.findByText("Add the meals you've liked the most")).toBeInTheDocument()
  })

  it('keeps the subtitle visible in the empty (onboarding) journal too', async () => {
    renderApp('/', { prepare: (storage) => storage.setItem(STORAGE_KEYS.seedMode, 'empty') })
    expect(
      await screen.findByText('Tu diario está esperando su primera comida'),
    ).toBeInTheDocument()
    expect(screen.getByText('Agregá las comidas que más te han gustado')).toBeInTheDocument()
  })

  it('capitalizes only the first letter of the month ("Octubre de 2026", not "Octubre De 2026")', async () => {
    renderApp('/')
    const heading = await screen.findByRole('heading', { level: 2, name: 'octubre de 2026' })
    // jsdom has no CSS, so assert on the class that does the styling: it must not title-case every word.
    expect(heading).toHaveClass('first-letter:uppercase')
    expect(heading).not.toHaveClass('capitalize')
  })

  it('each card links to its entry and describes the meal for screen readers', async () => {
    renderApp('/')
    const card = await screen.findByRole('link', { name: /Kimchi y Provoleta/ })
    expect(card).toHaveAttribute('href', '/entry/entry-03')
    expect(card).toHaveAccessibleName(/Me encantó/)
    expect(card).toHaveAccessibleName(/Hallazgo inusual/)
    expect(card).toHaveAccessibleName(/Precio: Medio/)
    expect(within(card).queryByRole('img')).not.toBeInTheDocument() // photo is decorative here
  })

  it('opens the entry when a card is clicked', async () => {
    const user = userEvent.setup()
    renderApp('/')
    await user.click(await screen.findByRole('link', { name: /Choripán del Puente/ }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Choripán del Puente' }),
    ).toBeInTheDocument()
  })

  it('welcomes a new user with an onboarding empty state that leads to the first log', async () => {
    const user = userEvent.setup()
    renderApp('/', { prepare: (storage) => storage.setItem(STORAGE_KEYS.seedMode, 'empty') })
    expect(
      await screen.findByText('Tu diario está esperando su primera comida'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Anotar mi primera comida' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Anotar una comida' }),
    ).toBeInTheDocument()
  })

  it('shows a clear error with a retry that recovers', async () => {
    const user = userEvent.setup()
    const { storage } = renderApp('/', { prepare: (s) => s.setItem(STORAGE_KEYS.failFlag, '1') })
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos cargar esto')
    expect(alert).toHaveTextContent('No pudimos conectarnos')

    storage.removeItem(STORAGE_KEYS.failFlag)
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('14 comidas anotadas')).toBeInTheDocument()
  })

  it('renders in English when the language is switched', async () => {
    const user = userEvent.setup()
    renderApp('/')
    await screen.findByText('14 comidas anotadas')
    await user.click(screen.getAllByRole('button', { name: /English/ })[0]!)
    expect(await screen.findByText('14 meals logged')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'October 2026' })).toBeInTheDocument()
  })
})
