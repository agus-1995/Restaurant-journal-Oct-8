import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderApp } from '@/test/renderApp'
import { createFakeAuth } from '@/test/fakeAuth'

const ANA = { email: 'ana@example.com', password: 'secreto123' }

async function fillLogin(
  user: ReturnType<typeof userEvent.setup>,
  email: string,
  password: string,
) {
  await user.type(await screen.findByLabelText('Email'), email)
  await user.type(screen.getByLabelText('Contraseña'), password)
  await user.click(screen.getByRole('button', { name: 'Entrar' }))
}

describe('route protection', () => {
  it('sends a signed-out visitor to the login screen', async () => {
    const { router } = renderApp('/', { auth: createFakeAuth() })
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Iniciá sesión' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
    expect(
      screen.queryByRole('navigation', { name: 'Navegación principal' }),
    ).not.toBeInTheDocument()
  })

  it('protects every private screen', async () => {
    for (const path of [
      '/log',
      '/search',
      '/wishlist',
      '/entry/entry-01',
      '/entry/entry-01/edit',
    ]) {
      const { router, unmount } = renderApp(path, { auth: createFakeAuth() })
      await screen.findByRole('heading', { level: 1, name: 'Iniciá sesión' })
      expect(router.state.location.pathname).toBe('/login')
      unmount()
    }
  })

  it('after signing in, returns you to the page you were trying to open', async () => {
    const user = userEvent.setup()
    const { router } = renderApp('/entry/entry-04', { auth: createFakeAuth({ users: [ANA] }) })
    await fillLogin(user, ANA.email, ANA.password)
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Bodega Piedra Azul' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/entry/entry-04')
  })

  it('a signed-in user skips the login and sign-up screens', async () => {
    const auth = createFakeAuth({ signedInAs: ANA.email })
    const { router } = renderApp('/login', { auth })
    expect(await screen.findByRole('heading', { level: 1, name: 'Tu diario' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
    await act(() => router.navigate('/signup'))
    await screen.findByRole('heading', { level: 1, name: 'Tu diario' })
  })

  it('with local data (no accounts) there is no login and no account button', async () => {
    renderApp('/')
    expect(await screen.findByRole('heading', { level: 1, name: 'Tu diario' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cuenta' })).not.toBeInTheDocument()
  })
})

describe('login', () => {
  it('signs in with the right email and password', async () => {
    const user = userEvent.setup()
    renderApp('/login', { auth: createFakeAuth({ users: [ANA] }) })
    await fillLogin(user, ANA.email, ANA.password)
    expect(await screen.findByRole('heading', { level: 1, name: 'Tu diario' })).toBeInTheDocument()
  })

  it('asks for the missing fields', async () => {
    const user = userEvent.setup()
    renderApp('/login', { auth: createFakeAuth() })
    await user.click(await screen.findByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('Poné tu email.')).toBeInTheDocument()
    expect(screen.getByText('Poné tu contraseña.')).toBeInTheDocument()
  })

  it('rejects an email that is not an email', async () => {
    const user = userEvent.setup()
    renderApp('/login', { auth: createFakeAuth() })
    await user.type(await screen.findByLabelText('Email'), 'ana-sin-arroba')
    await user.type(screen.getByLabelText('Contraseña'), 'x')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('Ese email no parece válido.')).toBeInTheDocument()
  })

  it('says so, without revealing which part was wrong, when credentials are incorrect', async () => {
    const user = userEvent.setup()
    renderApp('/login', { auth: createFakeAuth({ users: [ANA] }) })
    await fillLogin(user, ANA.email, 'otra-contraseña')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El email o la contraseña no son correctos.',
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Iniciá sesión' })).toBeInTheDocument()
    await fillLogin(user, 'nadie@example.com', 'x')
  })

  it('explains an unconfirmed email', async () => {
    const user = userEvent.setup()
    renderApp('/login', { auth: createFakeAuth({ users: [{ ...ANA, confirmed: false }] }) })
    await fillLogin(user, ANA.email, ANA.password)
    expect(await screen.findByText(/Todavía no confirmaste tu email/)).toBeInTheDocument()
  })

  it.each([
    ['rate_limited', /Hiciste muchos intentos/],
    ['unavailable', /No pudimos conectarnos/],
  ] as const)('shows a friendly message for %s', async (code, message) => {
    const user = userEvent.setup()
    const auth = createFakeAuth({ users: [ANA] })
    renderApp('/login', { auth })
    auth.failNextWith(code)
    await fillLogin(user, ANA.email, ANA.password)
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
  })

  it('can show and hide the password', async () => {
    const user = userEvent.setup()
    renderApp('/login', { auth: createFakeAuth() })
    const input = await screen.findByLabelText('Contraseña')
    expect(input).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))
    expect(input).toHaveAttribute('type', 'text')
    await user.click(screen.getByRole('button', { name: 'Ocultar contraseña' }))
    expect(input).toHaveAttribute('type', 'password')
  })

  it('links to sign up and to password recovery', async () => {
    renderApp('/login', { auth: createFakeAuth() })
    expect(await screen.findByRole('link', { name: 'Crear una cuenta' })).toHaveAttribute(
      'href',
      '/signup',
    )
    expect(screen.getByRole('link', { name: 'Me olvidé la contraseña' })).toHaveAttribute(
      'href',
      '/forgot-password',
    )
  })

  it('works in English', async () => {
    const user = userEvent.setup()
    renderApp('/login', { auth: createFakeAuth() })
    await user.click((await screen.findAllByRole('button', { name: /English/ }))[0]!)
    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Enter your email.')).toBeInTheDocument()
  })
})

describe('sign up', () => {
  async function fillSignup(
    user: ReturnType<typeof userEvent.setup>,
    email: string,
    password: string,
    confirm = password,
  ) {
    await user.type(await screen.findByLabelText('Email'), email)
    await user.type(screen.getByLabelText('Contraseña'), password)
    await user.type(screen.getByLabelText('Repetí la contraseña'), confirm)
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))
  }

  it('creates the account and goes straight to the journal', async () => {
    const user = userEvent.setup()
    const auth = createFakeAuth()
    renderApp('/signup', { auth })
    await fillSignup(user, 'nueva@example.com', 'buenapass1')
    expect(await screen.findByRole('heading', { level: 1, name: 'Tu diario' })).toBeInTheDocument()
    expect(auth.currentUser()?.email).toBe('nueva@example.com')
  })

  it('when the project requires email confirmation, says to check the email', async () => {
    const user = userEvent.setup()
    const auth = createFakeAuth({ requireConfirmation: true })
    renderApp('/signup', { auth })
    await fillSignup(user, 'nueva@example.com', 'buenapass1')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Revisá tu email' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/nueva@example.com/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir a iniciar sesión' })).toHaveAttribute(
      'href',
      '/login',
    )
    expect(auth.currentUser()).toBeNull()
  })

  it('requires a password of at least 8 characters', async () => {
    const user = userEvent.setup()
    renderApp('/signup', { auth: createFakeAuth() })
    await fillSignup(user, 'nueva@example.com', 'corta')
    expect(await screen.findByText('Tiene que tener al menos 8 caracteres.')).toBeInTheDocument()
  })

  it('requires both passwords to match', async () => {
    const user = userEvent.setup()
    renderApp('/signup', { auth: createFakeAuth() })
    await fillSignup(user, 'nueva@example.com', 'buenapass1', 'buenapass2')
    expect(await screen.findByText('Las contraseñas no coinciden.')).toBeInTheDocument()
  })

  it('tells you when the email already has an account', async () => {
    const user = userEvent.setup()
    renderApp('/signup', { auth: createFakeAuth({ users: [ANA] }) })
    await fillSignup(user, ANA.email, 'buenapass1')
    expect(await screen.findByRole('alert')).toHaveTextContent('Ya hay una cuenta con ese email')
  })

  it('shows the password hint and a link back to login', async () => {
    renderApp('/signup', { auth: createFakeAuth() })
    expect(await screen.findByText('Mínimo 8 caracteres.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login')
  })
})

describe('forgot password', () => {
  it('sends the reset link and confirms, without saying whether the account exists', async () => {
    const user = userEvent.setup()
    const auth = createFakeAuth({ users: [ANA] })
    renderApp('/forgot-password', { auth })
    await user.type(await screen.findByLabelText('Email'), 'desconocido@example.com')
    await user.click(screen.getByRole('button', { name: 'Mandar el link' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Listo, revisá tu email' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Si hay una cuenta con ese email/)).toBeInTheDocument()
    expect(auth.resetRequests).toEqual(['desconocido@example.com'])
  })

  it('validates the email first', async () => {
    const user = userEvent.setup()
    const auth = createFakeAuth()
    renderApp('/forgot-password', { auth })
    await user.click(await screen.findByRole('button', { name: 'Mandar el link' }))
    expect(await screen.findByText('Poné tu email.')).toBeInTheDocument()
    expect(auth.resetRequests).toEqual([])
  })

  it('reports a failure to send', async () => {
    const user = userEvent.setup()
    const auth = createFakeAuth()
    renderApp('/forgot-password', { auth })
    await user.type(await screen.findByLabelText('Email'), 'ana@example.com')
    auth.failNextWith('rate_limited')
    await user.click(screen.getByRole('button', { name: 'Mandar el link' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Hiciste muchos intentos')
  })
})

describe('reset password (arriving from the email link)', () => {
  it('without a valid link, explains and offers a new one', async () => {
    renderApp('/reset-password', { auth: createFakeAuth() })
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Este link ya no sirve' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Pedir un link nuevo' })).toHaveAttribute(
      'href',
      '/forgot-password',
    )
  })

  it('lets you choose a new password and then enter the app', async () => {
    const user = userEvent.setup()
    const auth = createFakeAuth({ users: [ANA] })
    renderApp('/reset-password', { auth })
    await screen.findByRole('heading', { level: 1, name: 'Este link ya no sirve' })
    act(() => auth.openRecoveryLink(ANA.email)) // the user clicks the link in the email

    await user.type(await screen.findByLabelText('Contraseña nueva'), 'nuevisima99')
    await user.type(screen.getByLabelText('Repetí la contraseña'), 'nuevisima99')
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Tu diario' })).toBeInTheDocument()
    expect(auth.passwordOf(ANA.email)).toBe('nuevisima99')
  })

  it('checks the new password like sign-up does', async () => {
    const user = userEvent.setup()
    const auth = createFakeAuth({ users: [ANA] })
    renderApp('/reset-password', { auth })
    act(() => auth.openRecoveryLink(ANA.email))
    await user.type(await screen.findByLabelText('Contraseña nueva'), 'nuevisima99')
    await user.type(screen.getByLabelText('Repetí la contraseña'), 'distinta')
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
    expect(await screen.findByText('Las contraseñas no coinciden.')).toBeInTheDocument()
    expect(auth.passwordOf(ANA.email)).toBe(ANA.password)
  })
})

describe('account menu and sign out', () => {
  it('shows who is signed in and signs out, returning to the login screen', async () => {
    const user = userEvent.setup()
    const auth = createFakeAuth({ signedInAs: ANA.email })
    const { router } = renderApp('/', { auth })
    await user.click((await screen.findAllByRole('button', { name: 'Cuenta' }))[0]!)
    const dialog = screen.getByRole('dialog', { name: 'Tu cuenta' })
    expect(dialog).toHaveTextContent(ANA.email)
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Iniciá sesión' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
    expect(auth.currentUser()).toBeNull()
  })

  it('after signing out, private screens are closed again', async () => {
    const user = userEvent.setup()
    const auth = createFakeAuth({ signedInAs: ANA.email })
    const { router } = renderApp('/', { auth })
    await user.click((await screen.findAllByRole('button', { name: 'Cuenta' }))[0]!)
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    await screen.findByRole('heading', { level: 1, name: 'Iniciá sesión' })
    await act(() => router.navigate('/search'))
    await screen.findByRole('heading', { level: 1, name: 'Iniciá sesión' })
    expect(router.state.location.pathname).toBe('/login')
  })

  it('reports a failed sign-out and stays signed in', async () => {
    const user = userEvent.setup()
    const auth = createFakeAuth({ signedInAs: ANA.email })
    renderApp('/', { auth })
    await user.click((await screen.findAllByRole('button', { name: 'Cuenta' }))[0]!)
    auth.failNextWith('unavailable')
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos conectarnos')
    expect(auth.currentUser()?.email).toBe(ANA.email)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeEnabled())
  })
})
