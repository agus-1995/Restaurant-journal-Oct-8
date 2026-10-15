import type { SupabaseClient } from '@supabase/supabase-js'
import { isRepositoryError } from '../repositories'
import { createSupabaseClientFromEnv, looksLikeSecretKey } from './client'
import { toRepositoryError, toStorageError, unwrap } from './errors'
import {
  entryPatchToRow,
  entryToInsertRow,
  placePatchToRow,
  placeToInsertRow,
  preferencesToRow,
  rowToEntry,
  rowToPlace,
  rowToPreferences,
  rowToWishlistItem,
  wishlistToInsertRow,
  type EntryRow,
} from './mappers'
import { createSessionProvider } from './session'
import { createSupabaseAuthService, toAuthError } from './SupabaseAuthService'
import { storagePathFromUrl } from './SupabaseImageStorage'

const jwt = (claims: object) =>
  `${btoa('{"alg":"HS256"}')}.${btoa(JSON.stringify(claims)).replace(/=+$/, '')}.signature`

describe('looksLikeSecretKey / client setup', () => {
  it('flags service_role JWTs and sb_secret_ keys, but not anon keys', () => {
    expect(looksLikeSecretKey(jwt({ role: 'service_role' }))).toBe(true)
    expect(looksLikeSecretKey('sb_secret_abc123')).toBe(true)
    expect(looksLikeSecretKey(jwt({ role: 'anon' }))).toBe(false)
    expect(looksLikeSecretKey('sb_publishable_abc123')).toBe(false)
    expect(looksLikeSecretKey('not-a-jwt')).toBe(false)
  })

  it('refuses to start with a secret key in the browser', () => {
    expect(() =>
      createSupabaseClientFromEnv({
        VITE_SUPABASE_URL: 'https://x.supabase.co',
        VITE_SUPABASE_ANON_KEY: jwt({ role: 'service_role' }),
      }),
    ).toThrow(/secret/i)
  })

  it('returns null (local mock data) when keys are missing or blank', () => {
    expect(createSupabaseClientFromEnv({})).toBeNull()
    expect(
      createSupabaseClientFromEnv({ VITE_SUPABASE_URL: '  ', VITE_SUPABASE_ANON_KEY: '' }),
    ).toBeNull()
  })

  it('warns and falls back when only the URL is set', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    expect(createSupabaseClientFromEnv({ VITE_SUPABASE_URL: 'https://x.supabase.co' })).toBeNull()
    expect(warn).toHaveBeenCalled()
  })

  it('creates a client when URL and an anon key are present', () => {
    const client = createSupabaseClientFromEnv({
      VITE_SUPABASE_URL: 'https://x.supabase.co',
      VITE_SUPABASE_ANON_KEY: jwt({ role: 'anon' }),
    })
    expect(client).not.toBeNull()
  })
})

describe('toRepositoryError', () => {
  const code = (c: string, context: 'read' | 'write' | 'delete' = 'read', message = 'm') =>
    toRepositoryError({ code: c, message }, context).code

  it('maps "no row" and non-UUID ids to not_found', () => {
    expect(code('PGRST116')).toBe('not_found')
    expect(code('22P02')).toBe('not_found')
  })

  it('maps a foreign-key violation by what you were doing', () => {
    expect(code('23503', 'delete')).toBe('conflict') // place still has entries
    expect(code('23503', 'write')).toBe('not_found') // pointing at a place that does not exist
  })

  it('maps a row-level-security rejection on write to not_found (the place is not yours / missing)', () => {
    expect(
      code('42501', 'write', 'new row violates row-level security policy for table "entries"'),
    ).toBe('not_found')
    expect(code('42501', 'read', 'permission denied for table entries')).toBe('unauthorized')
  })

  it.each(['23502', '23514', '22007', '22008', '22001', '22003'])('maps %s to invalid', (c) => {
    expect(code(c, 'write')).toBe('invalid')
  })

  it('maps auth failures to unauthorized', () => {
    expect(code('PGRST301')).toBe('unauthorized')
    expect(toRepositoryError({ message: 'nope', status: 401 }, 'read').code).toBe('unauthorized')
    expect(toRepositoryError({ message: 'nope', status: 403 }, 'read').code).toBe('unauthorized')
  })

  it('treats network failures and anything unknown as unavailable (retryable)', () => {
    expect(toRepositoryError({ message: 'TypeError: Failed to fetch' }, 'read').code).toBe(
      'unavailable',
    )
    expect(toRepositoryError({ message: 'boom', status: 503 }, 'read').code).toBe('unavailable')
    expect(code('XX000')).toBe('unavailable')
  })

  it('keeps the original error as the cause for debugging', () => {
    const original = { code: '23505', message: 'duplicate' }
    expect(toRepositoryError(original, 'write').cause).toBe(original)
  })

  it('unwrap returns data or throws the translated error', () => {
    expect(unwrap({ data: [1], error: null }, 'read')).toEqual([1])
    expect(() => unwrap({ data: null, error: { code: '23514', message: 'x' } }, 'write')).toThrow()
    try {
      unwrap({ data: null, error: { code: '23514', message: 'x' } }, 'write')
    } catch (error) {
      expect(isRepositoryError(error, 'invalid')).toBe(true)
    }
  })
})

describe('toStorageError', () => {
  it('maps size limits to quota_exceeded, permissions to unauthorized, bad types to invalid', () => {
    expect(
      toStorageError({ message: 'The object exceeded the maximum allowed size', status: 413 }).code,
    ).toBe('quota_exceeded')
    expect(toStorageError({ message: 'new row violates row-level security policy' }).code).toBe(
      'unauthorized',
    )
    expect(toStorageError({ message: 'mime type text/plain is not supported' }).code).toBe(
      'invalid',
    )
    expect(toStorageError({ message: 'fetch failed' }).code).toBe('unavailable')
  })
})

describe('row <-> domain mapping', () => {
  const entryRow: EntryRow = {
    id: 'e1',
    place_id: 'p1',
    date: '2026-10-07',
    photos: ['https://x/a.jpg'],
    dishes: [
      { name: 'Flan', note: 'con dulce de leche' },
      { name: 'Café' },
      { nope: 1 },
      { name: '' },
    ],
    price_tier: 2,
    reaction: 'loved',
    is_unusual: true,
    occasion: 'friends',
    cuisine_tags: ['argentina'],
    notes: 'Rico',
    created_at: '2026-10-07T12:00:00+00:00',
    updated_at: '2026-10-07T13:30:00.123+00:00',
  }

  it('turns an entry row into a domain entry, normalising timestamps and dropping junk dishes', () => {
    expect(rowToEntry(entryRow)).toEqual({
      id: 'e1',
      placeId: 'p1',
      date: '2026-10-07',
      photos: ['https://x/a.jpg'],
      dishes: [{ name: 'Flan', note: 'con dulce de leche' }, { name: 'Café' }],
      priceTier: 2,
      reaction: 'loved',
      isUnusual: true,
      occasion: 'friends',
      cuisineTags: ['argentina'],
      notes: 'Rico',
      createdAt: '2026-10-07T12:00:00.000Z',
      updatedAt: '2026-10-07T13:30:00.123Z',
    })
  })

  it('maps nulls to absent optional fields', () => {
    const entry = rowToEntry({
      ...entryRow,
      price_tier: null,
      occasion: null,
      notes: null,
      dishes: null,
    })
    expect(entry.priceTier).toBeUndefined()
    expect(entry.occasion).toBeUndefined()
    expect(entry.notes).toBeUndefined()
    expect(entry.dishes).toEqual([])
  })

  it('builds an insert row with defaults for everything optional', () => {
    expect(entryToInsertRow({ placeId: 'p1', date: '2026-10-07', reaction: 'good' })).toEqual({
      place_id: 'p1',
      date: '2026-10-07',
      reaction: 'good',
      photos: [],
      dishes: [],
      price_tier: null,
      is_unusual: false,
      occasion: null,
      cuisine_tags: [],
      notes: null,
    })
  })

  describe('update patches', () => {
    it('only writes the keys that were passed', () => {
      expect(entryPatchToRow({ reaction: 'meh' })).toEqual({ reaction: 'meh' })
      expect(entryPatchToRow({})).toEqual({})
    })

    it('an explicit undefined clears optional columns (null) but never required ones', () => {
      expect(
        entryPatchToRow({ priceTier: undefined, occasion: undefined, notes: undefined }),
      ).toEqual({
        price_tier: null,
        occasion: null,
        notes: null,
      })
      expect(entryPatchToRow({ reaction: undefined, date: undefined })).toEqual({})
    })

    it("rejects dates Postgres would accept but the app does not ('yesterday', 'infinity', 2026-02-31)", () => {
      for (const date of ['yesterday', 'today', 'infinity', '2026-02-31', '07/10/2026', '']) {
        expect(() => entryPatchToRow({ date })).toThrowError(/Invalid date/)
        expect(() => entryToInsertRow({ placeId: 'p', date, reaction: 'good' })).toThrowError(
          /Invalid date/,
        )
      }
      expect(() => entryPatchToRow({ date: '2026-10-07' })).not.toThrow()
    })

    it('translates camelCase keys to columns', () => {
      expect(entryPatchToRow({ isUnusual: true, cuisineTags: ['a'], placeId: 'p2' })).toEqual({
        is_unusual: true,
        cuisine_tags: ['a'],
        place_id: 'p2',
      })
      expect(placePatchToRow({ mapsUrl: undefined, neighborhood: 'Palermo' })).toEqual({
        maps_url: null,
        neighborhood: 'Palermo',
      })
    })
  })

  it('maps places both ways', () => {
    const place = rowToPlace({
      id: 'p1',
      name: 'La Parri',
      neighborhood: null,
      city: 'Rosario',
      type: 'bar',
      status: 'open',
      address: null,
      maps_url: 'https://maps.example/x',
      created_at: '2026-10-07T12:00:00+00:00',
    })
    expect(place).toMatchObject({
      name: 'La Parri',
      city: 'Rosario',
      mapsUrl: 'https://maps.example/x',
    })
    expect(place.neighborhood).toBeUndefined()
    expect(
      placeToInsertRow({ name: '  La Parri ', city: ' Rosario ', neighborhood: '  ' }),
    ).toEqual({
      name: 'La Parri',
      city: 'Rosario',
      neighborhood: null,
      type: 'restaurant',
      status: 'open',
      address: null,
      maps_url: null,
    })
  })

  it('maps wishlist items and preferences', () => {
    expect(
      rowToWishlistItem({
        id: 'w1',
        place_id: 'p1',
        note: null,
        source: 'Cami',
        added_at: '2026-10-01T10:00:00+00:00',
      }),
    ).toEqual({
      id: 'w1',
      placeId: 'p1',
      note: undefined,
      source: 'Cami',
      addedAt: '2026-10-01T10:00:00.000Z',
    })
    expect(wishlistToInsertRow({ placeId: 'p1' })).toEqual({
      place_id: 'p1',
      note: null,
      source: null,
    })

    expect(rowToPreferences(null)).toEqual({ onboardingSeen: false })
    const current = rowToPreferences({
      user_id: 'u',
      last_occasion: 'solo',
      last_city: 'Mendoza',
      onboarding_seen: true,
    })
    expect(current).toEqual({ lastOccasion: 'solo', lastCity: 'Mendoza', onboardingSeen: true })
    // Merging then writing whole: an explicit undefined clears, like the mock does.
    expect(
      preferencesToRow(current, { lastOccasion: undefined, lastCity: 'Rosario' }, 'u'),
    ).toEqual({
      user_id: 'u',
      last_occasion: null,
      last_city: 'Rosario',
      onboarding_seen: true,
    })
  })
})

describe('storagePathFromUrl', () => {
  it('extracts the object path from a public Storage URL', () => {
    expect(
      storagePathFromUrl(
        'https://abc.supabase.co/storage/v1/object/public/entry-photos/u1/p%201.jpg?t=1',
      ),
    ).toBe('u1/p 1.jpg')
  })

  it('ignores URLs that are not in our bucket (like old data URLs)', () => {
    expect(storagePathFromUrl('data:image/jpeg;base64,abc')).toBeNull()
    expect(
      storagePathFromUrl('https://abc.supabase.co/storage/v1/object/public/other/x.jpg'),
    ).toBeNull()
  })
})

describe('session', () => {
  const clientWith = (getSession: () => Promise<unknown>) =>
    ({ auth: { getSession: vi.fn(getSession) } }) as unknown as SupabaseClient

  it('resolves the signed-in user id', async () => {
    const client = clientWith(() =>
      Promise.resolve({ data: { session: { user: { id: 'u1' } } }, error: null }),
    )
    await expect(createSessionProvider(client)()).resolves.toBe('u1')
  })

  it('throws "unauthorized" when nobody is signed in (no silent anonymous accounts)', async () => {
    const client = clientWith(() => Promise.resolve({ data: { session: null }, error: null }))
    await expect(createSessionProvider(client)()).rejects.toMatchObject({ code: 'unauthorized' })
  })

  it('throws "unavailable" when the session cannot be read', async () => {
    const client = clientWith(() =>
      Promise.resolve({ data: { session: null }, error: { message: 'boom' } }),
    )
    await expect(createSessionProvider(client)()).rejects.toMatchObject({ code: 'unavailable' })
  })
})

describe('toAuthError', () => {
  const code = (c?: string, status?: number) =>
    toAuthError({ message: 'm', code: c, status } as never).code

  it.each([
    ['invalid_credentials', 'invalid_credentials'],
    ['email_not_confirmed', 'email_not_confirmed'],
    ['user_already_exists', 'email_taken'],
    ['email_exists', 'email_taken'],
    ['weak_password', 'weak_password'],
    ['same_password', 'weak_password'],
    ['over_request_rate_limit', 'rate_limited'],
    ['over_email_send_rate_limit', 'rate_limited'],
    ['validation_failed', 'invalid'],
    ['session_expired', 'unauthorized'],
  ])('maps %s to %s', (from, to) => {
    expect(code(from)).toBe(to)
  })

  it('treats HTTP 429 as rate limiting, and anything unknown or offline as unavailable', () => {
    expect(code(undefined, 429)).toBe('rate_limited')
    expect(code('something_new', 500)).toBe('unavailable')
    expect(code(undefined, 0)).toBe('unavailable')
  })
})

describe('SupabaseAuthService', () => {
  function authClient(overrides: Record<string, unknown>) {
    return { auth: overrides } as unknown as SupabaseClient
  }
  const ok = { data: {}, error: null }

  it('is a real-accounts service', () => {
    expect(createSupabaseAuthService(authClient({})).required).toBe(true)
  })

  it('getUser returns the session user, or null', async () => {
    const withSession = authClient({
      getSession: () =>
        Promise.resolve({
          data: { session: { user: { id: 'u1', email: 'a@b.co' } } },
          error: null,
        }),
    })
    expect(await createSupabaseAuthService(withSession).getUser()).toEqual({
      id: 'u1',
      email: 'a@b.co',
    })
    const without = authClient({
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    })
    expect(await createSupabaseAuthService(without).getUser()).toBeNull()
  })

  it('signUp tells the app whether the user is signed in or must confirm the email', async () => {
    const signUp = vi.fn()
    const service = createSupabaseAuthService(authClient({ signUp }), () => 'https://app.test')
    signUp.mockResolvedValueOnce({ data: { session: { user: {} } }, error: null })
    expect(await service.signUp('a@b.co', 'pw123456')).toBe('signed_in')
    signUp.mockResolvedValueOnce({ data: { session: null }, error: null })
    expect(await service.signUp('a@b.co', 'pw123456')).toBe('confirm_email')
    // The confirmation link comes back to the app's login page.
    expect(signUp).toHaveBeenLastCalledWith({
      email: 'a@b.co',
      password: 'pw123456',
      options: { emailRedirectTo: 'https://app.test/login' },
    })
  })

  it('signUp / signIn translate Supabase errors', async () => {
    const service = createSupabaseAuthService(
      authClient({
        signUp: () =>
          Promise.resolve({ data: {}, error: { message: 'x', code: 'user_already_exists' } }),
        signInWithPassword: () =>
          Promise.resolve({
            data: {},
            error: { message: 'x', code: 'invalid_credentials', status: 400 },
          }),
      }),
    )
    await expect(service.signUp('a@b.co', 'pw123456')).rejects.toMatchObject({
      code: 'email_taken',
    })
    await expect(service.signIn('a@b.co', 'bad')).rejects.toMatchObject({
      code: 'invalid_credentials',
    })
  })

  it('requestPasswordReset sends the user back to /reset-password, and never reveals unknown emails', async () => {
    const resetPasswordForEmail = vi.fn().mockResolvedValue(ok)
    const service = createSupabaseAuthService(
      authClient({ resetPasswordForEmail }),
      () => 'https://app.test',
    )
    await service.requestPasswordReset('a@b.co')
    expect(resetPasswordForEmail).toHaveBeenCalledWith('a@b.co', {
      redirectTo: 'https://app.test/reset-password',
    })

    const rejecting = createSupabaseAuthService(
      authClient({
        resetPasswordForEmail: () =>
          Promise.resolve({ data: {}, error: { message: 'x', code: 'validation_failed' } }),
      }),
    )
    await expect(rejecting.requestPasswordReset('nobody@b.co')).resolves.toBeUndefined()

    const limited = createSupabaseAuthService(
      authClient({
        resetPasswordForEmail: () =>
          Promise.resolve({
            data: {},
            error: { message: 'x', code: 'over_email_send_rate_limit' },
          }),
      }),
    )
    await expect(limited.requestPasswordReset('a@b.co')).rejects.toMatchObject({
      code: 'rate_limited',
    })
  })

  it('updatePassword and signOut surface errors', async () => {
    const service = createSupabaseAuthService(
      authClient({
        updateUser: () =>
          Promise.resolve({ data: {}, error: { message: 'x', code: 'weak_password' } }),
        signOut: () => Promise.resolve({ error: { message: 'x', status: 500 } }),
      }),
    )
    await expect(service.updatePassword('123')).rejects.toMatchObject({ code: 'weak_password' })
    await expect(service.signOut()).rejects.toMatchObject({ code: 'unavailable' })
  })

  it('onChange forwards sign in / out / recovery events, ignores the noise, and can unsubscribe', () => {
    const unsubscribe = vi.fn()
    let handler: (event: string, session: unknown) => void = () => undefined
    const service = createSupabaseAuthService(
      authClient({
        onAuthStateChange: (h: typeof handler) => {
          handler = h
          return { data: { subscription: { unsubscribe } } }
        },
      }),
    )
    const listener = vi.fn()
    const stop = service.onChange(listener)
    const session = { user: { id: 'u1', email: 'a@b.co' } }
    handler('SIGNED_IN', session)
    handler('TOKEN_REFRESHED', session)
    handler('USER_UPDATED', session)
    handler('PASSWORD_RECOVERY', session)
    handler('SIGNED_OUT', null)
    expect(listener.mock.calls).toEqual([
      ['signed_in', { id: 'u1', email: 'a@b.co' }],
      ['password_recovery', { id: 'u1', email: 'a@b.co' }],
      ['signed_out', null],
    ])
    stop()
    expect(unsubscribe).toHaveBeenCalled()
  })
})
