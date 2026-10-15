import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '@/test/renderApp'
import { STORAGE_KEYS } from '@/test/testRepositories'

vi.mock('@/features/share/renderShareCard', () => ({
  renderShareCard: vi.fn(() => Promise.resolve(new Blob(['png'], { type: 'image/png' }))),
}))

describe('Entry detail', () => {
  it('shows photos, place, reaction, price, dishes, notes and tags', async () => {
    renderApp('/entry/entry-04')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Bodega Piedra Azul' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Luján de Cuyo, Mendoza · Bodega')).toBeInTheDocument()
    expect(screen.getByText('Me encantó')).toBeInTheDocument()
    expect(screen.getByText('Precio: Caro')).toBeInTheDocument()
    expect(screen.getByText('Cita')).toBeInTheDocument()
    expect(screen.getByText('Degustación de 4 Malbec')).toBeInTheDocument()
    expect(screen.getByText(/Cordero lento/)).toBeInTheDocument()
    expect(screen.getByText(/Malbec de altura/)).toBeInTheDocument()
    expect(screen.getAllByRole('img').length).toBe(2) // two photos, each with alt text
    expect(screen.getAllByRole('img')[0]).toHaveAccessibleName(
      /Degustación de 4 Malbec en Bodega Piedra Azul/,
    )
  })

  it('lets you jump between photos with the dots', async () => {
    const user = userEvent.setup()
    renderApp('/entry/entry-04')
    const dots = await screen.findAllByRole('button', { name: /Foto \d de 2/ })
    expect(dots).toHaveLength(2)
    expect(dots[0]).toHaveAttribute('aria-current', 'true')
    await user.click(dots[1]!)
    expect(Element.prototype.scrollTo).toHaveBeenCalled()
  })

  it('flags a closed place and an unusual find', async () => {
    renderApp('/entry/entry-13')
    expect(await screen.findByText('Este lugar cerró')).toBeInTheDocument()
    expect(screen.getByText('Hallazgo inusual')).toBeInTheDocument()
  })

  it('cuisine tags link into search, pre-filtered', async () => {
    renderApp('/entry/entry-04')
    const tag = await screen.findByRole('link', { name: 'Buscar más de malbec' })
    expect(tag).toHaveAttribute('href', '/search?cuisine=malbec')
  })

  it('invites you to add details when an entry is bare', async () => {
    const { repositories, router } = renderApp('/entry/entry-05')
    await screen.findByRole('heading', { level: 1, name: 'Choripán del Puente' })
    const bare = await repositories.entries.create({
      placeId: 'place-cafe',
      date: '2026-10-07',
      reaction: 'good',
    })
    await act(() => router.navigate(`/entry/${bare.id}`))
    expect(await screen.findByText('Todavía no agregaste platos ni notas.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Agregar detalles' })).toHaveAttribute(
      'href',
      `/entry/${bare.id}/edit`,
    )
  })

  it('has a friendly not-found state', async () => {
    renderApp('/entry/does-not-exist')
    expect(await screen.findByText('No encontramos esta entrada')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver al diario' })).toHaveAttribute('href', '/')
  })

  it('shows an error with retry when the entry cannot be loaded', async () => {
    const { storage } = renderApp('/entry/entry-04', {
      prepare: (s) => s.setItem(STORAGE_KEYS.failFlag, '1'),
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar esto')
    storage.removeItem(STORAGE_KEYS.failFlag)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Bodega Piedra Azul' }),
    ).toBeInTheDocument()
  })

  describe('delete', () => {
    it('asks for confirmation, and Cancel keeps the entry', async () => {
      const user = userEvent.setup()
      const { repositories } = renderApp('/entry/entry-12')
      await user.click(await screen.findByRole('button', { name: 'Borrar' }))
      const dialog = screen.getByRole('dialog', { name: '¿Borrar esta entrada?' })
      expect(dialog).toHaveTextContent('Sanguchería El Cuyano')
      await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(await repositories.entries.getById('entry-12')).not.toBeNull()
    })

    it('Escape closes the dialog and focus returns to the Delete button', async () => {
      const user = userEvent.setup()
      renderApp('/entry/entry-12')
      const trigger = await screen.findByRole('button', { name: 'Borrar' })
      await user.click(trigger)
      await user.keyboard('{Escape}')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(trigger).toHaveFocus()
    })

    it('traps keyboard focus inside the dialog', async () => {
      const user = userEvent.setup()
      renderApp('/entry/entry-12')
      await user.click(await screen.findByRole('button', { name: 'Borrar' }))
      const dialog = screen.getByRole('dialog')
      for (let i = 0; i < 6; i += 1) {
        await user.tab()
        expect(dialog).toContainElement(document.activeElement as HTMLElement)
      }
    })

    it('confirming deletes the entry and returns to the journal', async () => {
      const user = userEvent.setup()
      const { repositories, router } = renderApp('/entry/entry-12')
      await user.click(await screen.findByRole('button', { name: 'Borrar' }))
      await user.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'Sí, borrar' }),
      )
      await waitFor(() => expect(router.state.location.pathname).toBe('/'))
      expect(await screen.findByText('13 comidas anotadas')).toBeInTheDocument()
      expect(await repositories.entries.getById('entry-12')).toBeNull()
    })

    it('explains a failed delete and keeps the entry', async () => {
      const user = userEvent.setup()
      const { storage, repositories } = renderApp('/entry/entry-12')
      await user.click(await screen.findByRole('button', { name: 'Borrar' }))
      storage.setItem(STORAGE_KEYS.failFlag, '1')
      await user.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'Sí, borrar' }),
      )
      expect(await screen.findByText(/No pudimos borrar la entrada/)).toBeInTheDocument()
      storage.removeItem(STORAGE_KEYS.failFlag)
      expect(await repositories.entries.getById('entry-12')).not.toBeNull()
    })
  })

  describe('edit', () => {
    it('loads the current values, saves changes and returns to the detail page', async () => {
      const user = userEvent.setup()
      const { repositories } = renderApp('/entry/entry-12')
      await user.click(await screen.findByRole('link', { name: 'Editar' }))
      expect(
        await screen.findByRole('heading', { level: 1, name: 'Editar entrada' }),
      ).toBeInTheDocument()
      expect(screen.getByText('Lugar: Sanguchería El Cuyano')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Meh' })).toHaveAttribute('aria-pressed', 'true')

      await user.click(screen.getByRole('button', { name: 'Estuvo bien' }))
      await user.type(screen.getByLabelText('¿Qué comiste?'), 'Papas fritas{Enter}')
      await user.click(screen.getByRole('button', { name: '$$: Medio' }))
      await user.click(screen.getByRole('button', { name: 'Guardar' }))

      expect(
        await screen.findByRole('heading', { level: 1, name: 'Sanguchería El Cuyano' }),
      ).toBeInTheDocument()
      const saved = await repositories.entries.getById('entry-12')
      expect(saved).toMatchObject({ reaction: 'good', priceTier: 2 })
      expect(saved?.dishes.map((d) => d.name)).toEqual([
        'Sándwich de lomo con huevo y tomate seco',
        'Papas fritas',
      ])
    })

    it('keeps existing dish notes when you edit other things', async () => {
      const user = userEvent.setup()
      const { repositories } = renderApp('/entry/entry-04/edit')
      await user.click(await screen.findByRole('button', { name: 'Estuvo bien' }))
      await user.click(screen.getByRole('button', { name: 'Guardar' }))
      await screen.findByRole('heading', { level: 1, name: 'Bodega Piedra Azul' })
      const saved = await repositories.entries.getById('entry-04')
      expect(saved?.dishes).toContainEqual({ name: 'Almuerzo de 3 pasos', note: 'Cordero lento' })
    })

    it('can clear the price and occasion', async () => {
      const user = userEvent.setup()
      const { repositories } = renderApp('/entry/entry-04/edit')
      await user.click(await screen.findByRole('button', { name: '$$$: Caro' }))
      await user.click(screen.getByRole('button', { name: 'Cita' }))
      await user.click(screen.getByRole('button', { name: 'Guardar' }))
      await screen.findByRole('heading', { level: 1, name: 'Bodega Piedra Azul' })
      const saved = await repositories.entries.getById('entry-04')
      expect(saved?.priceTier).toBeUndefined()
      expect(saved?.occasion).toBeUndefined()
    })

    it('rejects an invalid date with a message', async () => {
      const user = userEvent.setup()
      renderApp('/entry/entry-04/edit')
      const date = await screen.findByLabelText('Fecha')
      await user.clear(date)
      await user.click(screen.getByRole('button', { name: 'Guardar' }))
      expect(await screen.findByText('Esa fecha no es válida.')).toBeInTheDocument()
    })

    it('Cancel goes back without saving', async () => {
      const user = userEvent.setup()
      const { repositories } = renderApp('/entry/entry-12/edit')
      await user.click(await screen.findByRole('button', { name: 'Estuvo bien' }))
      await user.click(screen.getByRole('link', { name: 'Cancelar' }))
      expect(
        await screen.findByRole('heading', { level: 1, name: 'Sanguchería El Cuyano' }),
      ).toBeInTheDocument()
      expect((await repositories.entries.getById('entry-12'))?.reaction).toBe('meh')
    })

    it('hides the tab bar and floating button while editing', async () => {
      renderApp('/entry/entry-12/edit')
      await screen.findByRole('heading', { level: 1, name: 'Editar entrada' })
      // Only the (desktop) side nav remains; the mobile tab bar is gone.
      expect(screen.getAllByRole('navigation', { name: 'Navegación principal' })).toHaveLength(1)
      expect(screen.queryByRole('link', { name: 'Anotar una nueva comida' })).toBeNull()
    })
  })

  describe('share', () => {
    beforeEach(() => {
      vi.stubGlobal(
        'URL',
        Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:card'), revokeObjectURL: vi.fn() }),
      )
    })

    it('opens a dialog with a preview of the generated card', async () => {
      const user = userEvent.setup()
      renderApp('/entry/entry-04')
      await user.click(await screen.findByRole('button', { name: 'Compartir' }))
      const dialog = screen.getByRole('dialog', { name: 'Compartir esta entrada' })
      expect(
        await within(dialog).findByAltText(
          'Vista previa de la tarjeta para compartir de Bodega Piedra Azul',
        ),
      ).toBeInTheDocument()
      expect(within(dialog).getByRole('button', { name: 'Descargar imagen' })).toBeEnabled()
      expect(within(dialog).getByRole('button', { name: 'Copiar link' })).toBeInTheDocument()
      // No Web Share API here (like most desktop browsers): the fallbacks are the only options.
      expect(within(dialog).queryByRole('button', { name: 'Compartir…' })).not.toBeInTheDocument()
      expect(dialog).toHaveTextContent('solo abre la entrada en este dispositivo')
    })

    it('copies the entry link', async () => {
      const user = userEvent.setup()
      renderApp('/entry/entry-04')
      await user.click(await screen.findByRole('button', { name: 'Compartir' }))
      await user.click(await screen.findByRole('button', { name: 'Copiar link' }))
      expect(await screen.findByText('Link copiado.')).toBeInTheDocument()
      expect(await navigator.clipboard.readText()).toBe(`${window.location.origin}/entry/entry-04`)
    })

    it('downloads the image', async () => {
      const user = userEvent.setup()
      const click = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => undefined)
      renderApp('/entry/entry-04')
      await user.click(await screen.findByRole('button', { name: 'Compartir' }))
      const download = await screen.findByRole('button', { name: 'Descargar imagen' })
      await waitFor(() => expect(download).toBeEnabled())
      await user.click(download)
      expect(click).toHaveBeenCalled()
      expect(await screen.findByText('Imagen descargada.')).toBeInTheDocument()
    })

    it('offers the native share sheet when the browser supports sharing files', async () => {
      const user = userEvent.setup()
      const share = vi.fn(() => Promise.resolve())
      vi.stubGlobal(
        'navigator',
        Object.assign(Object.create(navigator), { share, canShare: () => true }),
      )
      renderApp('/entry/entry-04')
      await user.click(await screen.findByRole('button', { name: 'Compartir' }))
      await user.click(await screen.findByRole('button', { name: 'Compartir…' }))
      expect(share).toHaveBeenCalledTimes(1)
      const [payload] = share.mock.calls[0] as unknown as [{ files: File[]; title: string }]
      expect(payload.files[0]?.name).toBe('mi-diario-bodega-piedra-azul.png')
      expect(payload.title).toBe('Bodega Piedra Azul')
    })

    it('closes with the Close button', async () => {
      const user = userEvent.setup()
      renderApp('/entry/entry-04')
      await user.click(await screen.findByRole('button', { name: 'Compartir' }))
      await user.click(await screen.findByRole('button', { name: 'Cerrar' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })
})
