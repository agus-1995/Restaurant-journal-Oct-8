import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '@/test/renderApp'
import { STORAGE_KEYS } from '@/test/testRepositories'

async function openFilters(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: /^Filtros/ }))
}

const resultNames = () =>
  screen
    .getAllByRole('heading', { level: 2 })
    .map((heading) => heading.textContent)
    .sort()

describe('Search', () => {
  it('lists everything before any search, with a result count', async () => {
    renderApp('/search')
    expect(await screen.findByText('14 resultados')).toBeInTheDocument()
  })

  it('finds entries by text, ignoring accents and case', async () => {
    const user = userEvent.setup()
    renderApp('/search')
    await user.type(await screen.findByLabelText('Buscar en tu diario'), 'BODEGON')
    expect(await screen.findByText('2 resultados')).toBeInTheDocument()
    expect(resultNames()).toEqual(['Bodegón Don Anselmo', 'Bodegón Don Anselmo'])
  })

  it('searches dishes, not just place names', async () => {
    const user = userEvent.setup()
    renderApp('/search')
    await user.type(await screen.findByLabelText('Buscar en tu diario'), 'empanada')
    expect(await screen.findByText('2 resultados')).toBeInTheDocument()
    expect(resultNames()).toEqual(['Empanadas Tía Rosa', 'Kimchi y Provoleta'])
  })

  it('shows a helpful empty result and lets you clear the search', async () => {
    const user = userEvent.setup()
    renderApp('/search')
    await user.type(await screen.findByLabelText('Buscar en tu diario'), 'zzzz')
    expect(await screen.findByText('No hay coincidencias')).toBeInTheDocument()
    expect(screen.getByText('0 resultados')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(await screen.findByText('14 resultados')).toBeInTheDocument()
  })

  describe('filters', () => {
    it('keeps the filter panel collapsed until asked, and says how many are active', async () => {
      const user = userEvent.setup()
      renderApp('/search')
      const toggle = await screen.findByRole('button', { name: 'Filtros' })
      expect(toggle).toHaveAttribute('aria-expanded', 'false')
      await user.click(toggle)
      expect(toggle).toHaveAttribute('aria-expanded', 'true')
      await user.click(screen.getByRole('button', { name: '$$$: Caro' }))
      expect(screen.getByRole('button', { name: 'Filtros (1)' })).toBeInTheDocument()
    })

    it('filters by price tier', async () => {
      const user = userEvent.setup()
      renderApp('/search')
      await openFilters(user)
      await user.click(screen.getByRole('button', { name: '$$$: Caro' }))
      expect(await screen.findByText('3 resultados')).toBeInTheDocument()
      expect(resultNames()).toEqual([
        'Asador Las Acequias',
        'Bodega Piedra Azul',
        'Finca Los Cerrillos',
      ])
    })

    it('filters by reaction, and a second chip widens the match (OR within a filter)', async () => {
      const user = userEvent.setup()
      renderApp('/search')
      await openFilters(user)
      await user.click(screen.getByRole('button', { name: /Meh/ }))
      expect(await screen.findByText('1 resultado')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: /Me encantó/ }))
      expect(await screen.findByText('7 resultados')).toBeInTheDocument()
    })

    it('filters by occasion', async () => {
      const user = userEvent.setup()
      renderApp('/search')
      await openFilters(user)
      await user.click(screen.getByRole('button', { name: 'Trabajo' }))
      expect(await screen.findByText('1 resultado')).toBeInTheDocument()
      expect(resultNames()).toEqual(['Café Tostado Sur'])
    })

    it('filters by cuisine', async () => {
      const user = userEvent.setup()
      renderApp('/search')
      await openFilters(user)
      await user.click(screen.getByRole('button', { name: 'vino' }))
      expect(await screen.findByText('3 resultados')).toBeInTheDocument()
    })

    it('filters by neighborhood', async () => {
      const user = userEvent.setup()
      renderApp('/search')
      await openFilters(user)
      await user.selectOptions(screen.getByLabelText('Barrio'), 'Maipú')
      expect(await screen.findByText('2 resultados')).toBeInTheDocument()
      expect(resultNames()).toEqual(['Almazara Olivares del Este', 'Bodega Antigua Maipú'])
    })

    it('filters to unusual finds only', async () => {
      const user = userEvent.setup()
      renderApp('/search')
      await openFilters(user)
      await user.click(screen.getByRole('checkbox', { name: /Solo hallazgos inusuales/ }))
      expect(await screen.findByText('3 resultados')).toBeInTheDocument()
    })

    it('combines filters (AND) and the text query', async () => {
      const user = userEvent.setup()
      renderApp('/search')
      await user.type(await screen.findByLabelText('Buscar en tu diario'), 'mendoza')
      await openFilters(user)
      await user.click(screen.getByRole('checkbox', { name: /Solo hallazgos inusuales/ }))
      expect(await screen.findByText('2 resultados')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: '$: Económico' }))
      expect(await screen.findByText('0 resultados')).toBeInTheDocument()
    })

    it('"Clear filters" resets everything at once', async () => {
      const user = userEvent.setup()
      renderApp('/search?q=vino&price=3&unusual=1')
      expect(await screen.findByText('0 resultados')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
      expect(await screen.findByText('14 resultados')).toBeInTheDocument()
      expect(screen.getByLabelText('Buscar en tu diario')).toHaveValue('')
    })
  })

  describe('filters live in the URL', () => {
    it('arriving from a cuisine tag link shows that filter already applied', async () => {
      renderApp('/search?cuisine=vino')
      expect(await screen.findByText('3 resultados')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Filtros (1)' })).toBeInTheDocument()
    })

    it('typing updates the URL (without piling up history entries)', async () => {
      const user = userEvent.setup()
      const { router } = renderApp('/search')
      await user.type(await screen.findByLabelText('Buscar en tu diario'), 'vino')
      expect(router.state.location.search).toBe('?q=vino')
      expect(router.state.historyAction).toBe('REPLACE')
    })

    it('restores the query from the URL', async () => {
      renderApp('/search?q=kimchi')
      expect(await screen.findByLabelText('Buscar en tu diario')).toHaveValue('kimchi')
      expect(await screen.findByText('1 resultado')).toBeInTheDocument()
    })
  })

  it('opens an entry from a result', async () => {
    const user = userEvent.setup()
    renderApp('/search?q=kimchi')
    await user.click(await screen.findByRole('link', { name: /Kimchi y Provoleta/ }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Kimchi y Provoleta' }),
    ).toBeInTheDocument()
  })

  it('shows each result with reaction, price and date', async () => {
    renderApp('/search?q=kimchi')
    const result = await screen.findByRole('link', { name: /Kimchi y Provoleta/ })
    expect(within(result).getByText('Me encantó')).toBeInTheDocument()
    expect(within(result).getByText('Precio: Medio')).toBeInTheDocument()
  })

  it('invites you to log something when the journal is empty', async () => {
    renderApp('/search', { prepare: (s) => s.setItem(STORAGE_KEYS.seedMode, 'empty') })
    expect(await screen.findByText('Todavía no hay nada para buscar')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Anotar una comida' })).toHaveAttribute('href', '/log')
  })

  it('shows an error state with retry', async () => {
    const user = userEvent.setup()
    const { storage } = renderApp('/search', {
      prepare: (s) => s.setItem(STORAGE_KEYS.failFlag, '1'),
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar esto')
    storage.removeItem(STORAGE_KEYS.failFlag)
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('14 resultados')).toBeInTheDocument()
  })
})
