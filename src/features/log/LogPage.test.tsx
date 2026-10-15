import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { STORAGE_KEYS } from '@/test/testRepositories'
import { renderApp } from '@/test/renderApp'

const DRAFT_KEY = 'mi-diario:draft:log'

const emptyJournal = (storage: { setItem(k: string, v: string): void }) =>
  storage.setItem(STORAGE_KEYS.seedMode, 'empty')

async function chooseRecentPlace(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(await screen.findByRole('button', { name }))
}

describe('quick log', () => {
  it('starts on step 1 with recent places as one-tap choices', async () => {
    renderApp('/log')
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Lugar y foto' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Paso 1 de 3')).toBeInTheDocument()
    // Newest entries first: the most recently visited places lead.
    expect(screen.getByRole('button', { name: 'Bodegón Don Anselmo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Vermutería La Hora Dorada' })).toBeInTheDocument()
  })

  it('will not move on without a place, and says why', async () => {
    const user = userEvent.setup()
    const { router } = renderApp('/log')
    await user.click(await screen.findByRole('button', { name: 'Siguiente' }))
    expect(await screen.findByText('Elegí un lugar o creá uno nuevo.')).toBeInTheDocument()
    expect(router.state.location.search).not.toContain('step=2')
  })

  it('logs a meal in the minimum number of steps: place, reaction, save', async () => {
    const user = userEvent.setup()
    const { repositories, router } = renderApp('/log')

    await chooseRecentPlace(user, 'Vermutería La Hora Dorada')
    expect(screen.getByText('Lugar elegido')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Plato, precio y reacción' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Me encantó' }))
    await user.click(screen.getByRole('button', { name: 'Guardar ahora' }))

    // Lands on the new entry's detail page.
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Vermutería La Hora Dorada' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toMatch(/^\/entry\/.+/)

    const entries = await repositories.entries.list()
    expect(entries).toHaveLength(15)
    const created = entries.find((e) => !e.id.startsWith('entry-'))
    expect(created).toMatchObject({ placeId: 'place-vermut', reaction: 'loved', isUnusual: false })
    expect(created?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('does not celebrate when the journal already had entries', async () => {
    const user = userEvent.setup()
    renderApp('/log')
    await chooseRecentPlace(user, 'Bodegón Don Anselmo')
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    await user.click(await screen.findByRole('button', { name: 'Estuvo bien' }))
    await user.click(screen.getByRole('button', { name: 'Guardar ahora' }))
    await screen.findByRole('heading', { level: 1, name: 'Bodegón Don Anselmo' })
    expect(screen.queryByText(/Tu diario ya empezó/)).not.toBeInTheDocument()
  })

  it('requires a reaction before saving', async () => {
    const user = userEvent.setup()
    renderApp('/log')
    await chooseRecentPlace(user, 'Bodegón Don Anselmo')
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    await user.click(await screen.findByRole('button', { name: 'Guardar ahora' }))
    expect(await screen.findByText('Contanos cómo estuvo.')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Plato, precio y reacción' }),
    ).toBeInTheDocument()
  })

  it('collects dishes, price and optional extras, and saves them all', async () => {
    const user = userEvent.setup()
    const { repositories } = renderApp('/log')
    await chooseRecentPlace(user, 'Choripán del Puente')
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))

    await user.type(await screen.findByLabelText('¿Qué comiste?'), 'Choripán completo{Enter}')
    await user.click(screen.getByRole('button', { name: '$$: Medio' }))
    await user.click(screen.getByRole('button', { name: 'Me encantó' }))
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Algo más para recordar' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Con amigos' }))
    await user.click(screen.getByRole('checkbox', { name: /Hallazgo inusual/ }))
    await user.type(screen.getByLabelText('Tipo de cocina'), 'parrilla{Enter}')
    await user.type(screen.getByLabelText('Notas'), 'Con chimichurri casero')
    await user.click(screen.getByRole('button', { name: 'Guardar entrada' }))

    await screen.findByRole('heading', { level: 1, name: 'Choripán del Puente' })
    const created = (await repositories.entries.list()).find((e) => !e.id.startsWith('entry-'))
    expect(created).toMatchObject({
      dishes: [{ name: 'Choripán completo' }],
      priceTier: 2,
      occasion: 'friends',
      isUnusual: true,
      cuisineTags: ['parrilla'],
      notes: 'Con chimichurri casero',
    })
  })

  it('adds a half-typed dish when the field loses focus (nothing is lost on "Next")', async () => {
    const user = userEvent.setup()
    renderApp('/log')
    await chooseRecentPlace(user, 'Bodegón Don Anselmo')
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    await user.type(await screen.findByLabelText('¿Qué comiste?'), 'Flan casero')
    await user.click(screen.getByRole('button', { name: 'Me encantó' }))
    expect(screen.getByText('Flan casero')).toBeInTheDocument()
  })

  it('the Back button returns to the previous step with the choices intact', async () => {
    const user = userEvent.setup()
    renderApp('/log')
    await chooseRecentPlace(user, 'Bodegón Don Anselmo')
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    await user.click(await screen.findByRole('button', { name: 'Atrás' }))
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Lugar y foto' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Bodegón Don Anselmo')).toBeInTheDocument()
  })

  it('does not let you skip ahead by editing the URL when no place is chosen', async () => {
    renderApp('/log?step=3')
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Lugar y foto' }),
    ).toBeInTheDocument()
  })

  describe('creating a new place on the fly', () => {
    it('needs a city when there is no smart default (first ever log)', async () => {
      const user = userEvent.setup()
      renderApp('/log', { prepare: emptyJournal })
      await user.type(await screen.findByLabelText('¿Dónde comiste?'), 'La Parri')
      await user.click(screen.getByRole('button', { name: /Crear “La Parri”/ }))
      expect(screen.getByLabelText('Nombre')).toHaveValue('La Parri')
      expect(screen.getByLabelText('Ciudad')).toHaveValue('')
      await user.click(screen.getByRole('button', { name: 'Siguiente' }))
      expect(await screen.findByText('Poné la ciudad.')).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 2, name: 'Lugar y foto' })).toBeInTheDocument()
    })

    it('pre-fills the city with where you log most, and the first log celebrates', async () => {
      const user = userEvent.setup()
      const { repositories } = renderApp('/log')
      await user.type(await screen.findByLabelText('¿Dónde comiste?'), 'Pizzería Nueva')
      await user.click(screen.getByRole('button', { name: /Crear “Pizzería Nueva”/ }))
      expect(screen.getByLabelText('Ciudad')).toHaveValue('Buenos Aires')
      await user.type(screen.getByLabelText('Barrio (opcional)'), 'Flores')
      await user.click(screen.getByRole('button', { name: 'Siguiente' }))
      await user.click(await screen.findByRole('button', { name: 'Estuvo bien' }))
      await user.click(screen.getByRole('button', { name: 'Guardar ahora' }))
      await screen.findByRole('heading', { level: 1, name: 'Pizzería Nueva' })

      const place = (await repositories.places.list()).find((p) => p.name === 'Pizzería Nueva')
      expect(place).toMatchObject({
        city: 'Buenos Aires',
        neighborhood: 'Flores',
        type: 'restaurant',
      })
      expect(await repositories.preferences.get()).toMatchObject({
        lastCity: 'Buenos Aires',
        onboardingSeen: true,
      })
    })

    it('celebrates the very first entry in an empty journal', async () => {
      const user = userEvent.setup()
      renderApp('/log', { prepare: emptyJournal })
      await user.type(await screen.findByLabelText('¿Dónde comiste?'), 'Mi primer lugar')
      await user.click(screen.getByRole('button', { name: /Crear “Mi primer lugar”/ }))
      await user.type(screen.getByLabelText('Ciudad'), 'Córdoba')
      await user.click(screen.getByRole('button', { name: 'Siguiente' }))
      await user.click(await screen.findByRole('button', { name: 'Me encantó' }))
      await user.click(screen.getByRole('button', { name: 'Guardar ahora' }))

      expect(await screen.findByText('¡Tu diario ya empezó!')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Entendido' }))
      expect(screen.queryByText('¡Tu diario ya empezó!')).not.toBeInTheDocument()
    })

    it('suggests existing matches (accent-insensitive) before offering to create', async () => {
      const user = userEvent.setup()
      renderApp('/log')
      await user.type(await screen.findByLabelText('¿Dónde comiste?'), 'bodegon')
      expect(screen.getByText('Coincidencias')).toBeInTheDocument()
      const match = screen.getByRole('button', { name: /Bodegón Don Anselmo/ })
      await user.click(match)
      expect(screen.getByText('Lugar elegido')).toBeInTheDocument()
    })
  })

  describe('photos', () => {
    it('adds and removes photos', async () => {
      const user = userEvent.setup()
      renderApp('/log')
      const file = new File(['pixels'], 'plato.png', { type: 'image/png' })
      await user.upload(await screen.findByTestId('photo-input'), file)
      expect(await screen.findByAltText('Foto 1 elegida')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Quitar foto 1' }))
      expect(screen.queryByAltText('Foto 1 elegida')).not.toBeInTheDocument()
    })

    it('shows a friendly error for a file that is not an image', async () => {
      const user = userEvent.setup({ applyAccept: false })
      renderApp('/log')
      await user.upload(
        await screen.findByTestId('photo-input'),
        new File(['x'], 'nota.txt', { type: 'text/plain' }),
      )
      expect(await screen.findByText(/Hay datos que no son válidos/)).toBeInTheDocument()
    })
  })

  describe('draft: progress survives leaving the screen', () => {
    it('restores the place and the step after navigating away and back', async () => {
      const user = userEvent.setup()
      const first = renderApp('/log')
      await chooseRecentPlace(user, 'Vermutería La Hora Dorada')
      await user.click(screen.getByRole('button', { name: 'Siguiente' }))
      await user.click(await screen.findByRole('button', { name: '$$$: Caro' }))
      await waitFor(() => expect(localStorage.getItem(DRAFT_KEY)).toContain('"priceTier":3'))
      first.unmount()

      renderApp('/log')
      expect(await screen.findByText('Retomamos tu borrador.')).toBeInTheDocument()
      // Resumes where they left off (step 2), with the price still selected.
      expect(
        await screen.findByRole('heading', { level: 2, name: 'Plato, precio y reacción' }),
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '$$$: Caro' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
    })

    it('"start over" discards the draft', async () => {
      const user = userEvent.setup()
      const first = renderApp('/log')
      await chooseRecentPlace(user, 'Choripán del Puente')
      await waitFor(() => expect(localStorage.getItem(DRAFT_KEY)).not.toBeNull())
      first.unmount()

      renderApp('/log')
      await user.click(await screen.findByRole('button', { name: 'Empezar de nuevo' }))
      expect(await screen.findByLabelText('¿Dónde comiste?')).toBeInTheDocument()
      expect(screen.queryByText('Retomamos tu borrador.')).not.toBeInTheDocument()
      expect(localStorage.getItem(DRAFT_KEY)).toBeNull()
    })

    it('clears the draft once the entry is saved', async () => {
      const user = userEvent.setup()
      renderApp('/log')
      await chooseRecentPlace(user, 'Bodegón Don Anselmo')
      await waitFor(() => expect(localStorage.getItem(DRAFT_KEY)).not.toBeNull())
      await user.click(screen.getByRole('button', { name: 'Siguiente' }))
      await user.click(await screen.findByRole('button', { name: 'Me encantó' }))
      await user.click(screen.getByRole('button', { name: 'Guardar ahora' }))
      await screen.findByRole('heading', { level: 1, name: 'Bodegón Don Anselmo' })
      await new Promise((resolve) => setTimeout(resolve, 400)) // past the autosave debounce
      expect(localStorage.getItem(DRAFT_KEY)).toBeNull()
    })

    it('ignores a corrupt draft instead of crashing', async () => {
      localStorage.setItem(DRAFT_KEY, '{"step":"two","values":{"reaction":"amazing","place":42}}')
      renderApp('/log')
      expect(await screen.findByLabelText('¿Dónde comiste?')).toBeInTheDocument()
    })
  })

  describe('when saving fails', () => {
    it('keeps the draft, explains the problem, and succeeds on retry', async () => {
      const user = userEvent.setup()
      const { storage } = renderApp('/log')
      await chooseRecentPlace(user, 'Bodegón Don Anselmo')
      await user.click(screen.getByRole('button', { name: 'Siguiente' }))
      await user.click(await screen.findByRole('button', { name: 'Me encantó' }))

      storage.setItem(STORAGE_KEYS.failFlag, '1')
      await user.click(screen.getByRole('button', { name: 'Guardar ahora' }))
      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('No pudimos guardar la entrada. Tu borrador sigue acá.')
      expect(alert).toHaveTextContent('No pudimos conectarnos')
      expect(screen.getByRole('button', { name: 'Me encantó' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )

      storage.removeItem(STORAGE_KEYS.failFlag)
      await user.click(screen.getByRole('button', { name: 'Guardar ahora' }))
      expect(
        await screen.findByRole('heading', { level: 1, name: 'Bodegón Don Anselmo' }),
      ).toBeInTheDocument()
    })
  })

  describe('from the wishlist', () => {
    it('pre-fills the place and removes the wishlist item once logged', async () => {
      const user = userEvent.setup()
      const { repositories } = renderApp('/log?wishlist=wish-01')
      expect(
        await screen.findByText(/Desde “Quiero probar”: Parrilla Lo de Chicho/),
      ).toBeInTheDocument()
      const chosen = screen.getByText('Lugar elegido').parentElement as HTMLElement
      expect(within(chosen).getByText('Parrilla Lo de Chicho')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Siguiente' }))
      await user.click(await screen.findByRole('button', { name: 'Me encantó' }))
      await user.click(screen.getByRole('button', { name: 'Guardar ahora' }))
      await screen.findByRole('heading', { level: 1, name: 'Parrilla Lo de Chicho' })

      expect(await repositories.wishlist.getById('wish-01')).toBeNull()
      expect(await repositories.wishlist.list()).toHaveLength(2)
    })
  })
})
