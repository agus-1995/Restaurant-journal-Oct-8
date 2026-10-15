import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '@/test/renderApp'
import { STORAGE_KEYS } from '@/test/testRepositories'

describe('Wishlist ("Quiero probar")', () => {
  it('lists the places to try, most recently added first, with notes and who recommended them', async () => {
    renderApp('/wishlist')
    expect(await screen.findByText('3 lugares para probar')).toBeInTheDocument()
    const names = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(names).toEqual([
      'Heladería Pistacho Roto',
      'Parrilla Lo de Chicho',
      'Bodega Casa del Cerro',
    ])
    expect(screen.getByText('Dicen que el bife de chorizo es de otro planeta')).toBeInTheDocument()
    expect(screen.getByText(/Recomendado por Cami/)).toBeInTheDocument()
  })

  it('removes an item', async () => {
    const user = userEvent.setup()
    const { repositories } = renderApp('/wishlist')
    await user.click(
      await screen.findByRole('button', { name: 'Quitar Parrilla Lo de Chicho de la lista' }),
    )
    expect(await screen.findByText('2 lugares para probar')).toBeInTheDocument()
    expect(screen.queryByText('Parrilla Lo de Chicho')).not.toBeInTheDocument()
    expect(await repositories.wishlist.getById('wish-01')).toBeNull()
  })

  it('"Ya fui" starts a log pre-filled with that place', async () => {
    const user = userEvent.setup()
    renderApp('/wishlist')
    const link = await screen.findByRole('link', {
      name: 'Ya fui a Parrilla Lo de Chicho: anotar mi visita',
    })
    expect(link).toHaveAttribute('href', '/log?wishlist=wish-01')
    await user.click(link)
    expect(await screen.findByText('Lugar elegido')).toBeInTheDocument()
    expect(screen.getByText(/Desde “Quiero probar”/)).toBeInTheDocument()
  })

  describe('adding a place', () => {
    it('adds a brand-new place with a note and a source', async () => {
      const user = userEvent.setup()
      const { repositories } = renderApp('/wishlist')
      await user.click(await screen.findByRole('button', { name: /Sumar un lugar/ }))

      await user.type(screen.getByLabelText('¿Dónde comiste?'), 'Café Nuevo')
      await user.click(screen.getByRole('button', { name: /Crear “Café Nuevo”/ }))
      expect(screen.getByLabelText('Ciudad')).toHaveValue('Buenos Aires') // smart default
      await user.type(
        screen.getByLabelText('Nota (opcional)'),
        'Dicen que el café es de otro nivel',
      )
      await user.type(screen.getByLabelText(/¿Quién te lo recomendó\?/), 'Juli')
      await user.click(screen.getByRole('button', { name: 'Agregar a la lista' }))

      expect(await screen.findByText('4 lugares para probar')).toBeInTheDocument()
      const row = screen
        .getByRole('heading', { level: 2, name: 'Café Nuevo' })
        .closest('article') as HTMLElement
      expect(within(row).getByText('Dicen que el café es de otro nivel')).toBeInTheDocument()
      expect(within(row).getByText(/Recomendado por Juli/)).toBeInTheDocument()
      expect((await repositories.places.list()).some((p) => p.name === 'Café Nuevo')).toBe(true)
    })

    it('can add a place you already have, without creating a duplicate', async () => {
      const user = userEvent.setup()
      const { repositories } = renderApp('/wishlist')
      await user.click(await screen.findByRole('button', { name: /Sumar un lugar/ }))
      await user.type(screen.getByLabelText('¿Dónde comiste?'), 'choripan')
      await user.click(await screen.findByRole('button', { name: /Choripán del Puente/ }))
      await user.click(screen.getByRole('button', { name: 'Agregar a la lista' }))
      expect(await screen.findByText('4 lugares para probar')).toBeInTheDocument()
      const places = await repositories.places.list()
      expect(places.filter((p) => p.name === 'Choripán del Puente')).toHaveLength(1)
    })

    it('asks you to choose a place first', async () => {
      const user = userEvent.setup()
      renderApp('/wishlist')
      await user.click(await screen.findByRole('button', { name: /Sumar un lugar/ }))
      await user.click(screen.getByRole('button', { name: 'Agregar a la lista' }))
      expect(await screen.findByText('Elegí un lugar o creá uno nuevo.')).toBeInTheDocument()
    })

    it('explains a failure and keeps the form', async () => {
      const user = userEvent.setup()
      const { storage } = renderApp('/wishlist')
      await user.click(await screen.findByRole('button', { name: /Sumar un lugar/ }))
      await user.type(screen.getByLabelText('¿Dónde comiste?'), 'choripan')
      await user.click(await screen.findByRole('button', { name: /Choripán del Puente/ }))
      storage.setItem(STORAGE_KEYS.failFlag, '1')
      await user.click(screen.getByRole('button', { name: 'Agregar a la lista' }))
      expect(await screen.findByText(/No pudimos agregar el lugar/)).toBeInTheDocument()
      expect(screen.getByText('Lugar elegido')).toBeInTheDocument()
    })
  })

  it('has an empty state when there is nothing to try', async () => {
    renderApp('/wishlist', { prepare: (s) => s.setItem(STORAGE_KEYS.seedMode, 'empty') })
    expect(await screen.findByText('Tu lista está vacía')).toBeInTheDocument()
  })

  it('has an error state with retry', async () => {
    const user = userEvent.setup()
    const { storage } = renderApp('/wishlist', {
      prepare: (s) => s.setItem(STORAGE_KEYS.failFlag, '1'),
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar esto')
    storage.removeItem(STORAGE_KEYS.failFlag)
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('3 lugares para probar')).toBeInTheDocument()
  })
})
