import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '@/test/renderApp'

describe('AppShell', () => {
  it('renders the Spanish (es-AR) UI by default with all three nav destinations', async () => {
    renderApp('/')
    // Two navs exist in the DOM (tab bar + side nav); CSS shows one per breakpoint.
    const navs = screen.getAllByRole('navigation', { name: 'Navegación principal' })
    expect(navs).toHaveLength(2)
    for (const nav of navs) {
      expect(within(nav).getByRole('link', { name: 'Diario' })).toHaveAttribute('href', '/')
      expect(within(nav).getByRole('link', { name: 'Buscar' })).toHaveAttribute('href', '/search')
      expect(within(nav).getByRole('link', { name: 'Quiero probar' })).toHaveAttribute(
        'href',
        '/wishlist',
      )
    }
    expect(await screen.findByRole('heading', { level: 1, name: 'Tu diario' })).toBeInTheDocument()
  })

  it('navigates between the three main tabs', async () => {
    const user = userEvent.setup()
    renderApp('/')
    const tabBar = screen.getAllByRole('navigation', { name: 'Navegación principal' })[0]!
    await user.click(within(tabBar).getByRole('link', { name: 'Buscar' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Buscar' })).toBeInTheDocument()
    await user.click(within(tabBar).getByRole('link', { name: 'Quiero probar' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Quiero probar' }),
    ).toBeInTheDocument()
    await user.click(within(tabBar).getByRole('link', { name: 'Diario' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Tu diario' })).toBeInTheDocument()
  })

  it('marks the current tab for assistive tech', async () => {
    renderApp('/search')
    const nav = screen.getAllByRole('navigation', { name: 'Navegación principal' })[0]!
    expect(within(nav).getByRole('link', { name: 'Buscar' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(nav).getByRole('link', { name: 'Diario' })).not.toHaveAttribute('aria-current')
  })

  it('has a working floating Log button on the main tabs that goes to /log', async () => {
    const user = userEvent.setup()
    renderApp('/')
    await user.click(screen.getByRole('link', { name: 'Anotar una nueva comida' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Anotar una comida' }),
    ).toBeInTheDocument()
  })

  it.each(['/', '/search', '/share', '/wishlist'])(
    'shows the floating Log button on %s',
    (path) => {
      renderApp(path)
      expect(screen.getByRole('link', { name: 'Anotar una nueva comida' })).toBeInTheDocument()
    },
  )

  it('the floating Log button has square corners (radius 0, as in the design)', () => {
    renderApp('/')
    const fab = screen.getByRole('link', { name: 'Anotar una nueva comida' })
    expect(fab).toHaveClass('rounded-none')
    expect(fab).not.toHaveClass('rounded-full')
  })

  it.each(['/log', '/entry/entry-01', '/entry/entry-01/edit'])(
    'hides the floating Log button on %s',
    (path) => {
      renderApp(path)
      expect(
        screen.queryByRole('link', { name: 'Anotar una nueva comida' }),
      ).not.toBeInTheDocument()
    },
  )

  it('hides the tab bar during the focused log flow', () => {
    renderApp('/log')
    expect(screen.getAllByRole('navigation', { name: 'Navegación principal' })).toHaveLength(1)
  })

  it('has a skip link to the main content', () => {
    renderApp('/')
    expect(screen.getByRole('link', { name: 'Saltar al contenido' })).toHaveAttribute(
      'href',
      '#main',
    )
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
  })

  it('switches language, updates <html lang>, and remembers the choice', async () => {
    const user = userEvent.setup()
    renderApp('/')
    await user.click(screen.getAllByRole('button', { name: /English/ })[0]!)
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Your journal' }),
    ).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('en')
    expect(localStorage.getItem('mi-diario:lang')).toBe('en')
    expect(screen.getAllByRole('button', { name: /English/ })[0]).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('shows the not-found page for unknown routes, with a way home', () => {
    renderApp('/nope/nothing')
    expect(screen.getByRole('heading', { name: 'No encontramos esa página' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver al diario' })).toHaveAttribute('href', '/')
  })
})
