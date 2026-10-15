/// <reference types="node" />
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { describeRepositoryContract, emptyRepositories } from '../contract/repositoryContract'
import { createSupabaseRepositories } from '.'

/**
 * Runs the shared contract against a REAL Supabase project. Skipped unless ALL of these are set:
 *
 *   SUPABASE_TEST_URL=https://<ref>.supabase.co
 *   SUPABASE_TEST_ANON_KEY=<anon / publishable key>
 *   SUPABASE_TEST_EMAIL / SUPABASE_TEST_PASSWORD   a DEDICATED, already-confirmed test account
 *   SUPABASE_TEST_ALLOW_WIPE=yes                   because the tests DELETE ALL of that account's data
 *
 * Never point this at an account you use for real: it empties places, entries, wishlist, preferences.
 */
const { SUPABASE_TEST_URL: url, SUPABASE_TEST_ANON_KEY: key } = process.env
const { SUPABASE_TEST_EMAIL: email, SUPABASE_TEST_PASSWORD: password } = process.env
const allowed = process.env.SUPABASE_TEST_ALLOW_WIPE === 'yes'

let shared:
  | Promise<{ repositories: ReturnType<typeof createSupabaseRepositories>; client: SupabaseClient }>
  | undefined

function connect() {
  shared ??= (async () => {
    const client = createClient(url ?? '', key ?? '', {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { error } = await client.auth.signInWithPassword({
      email: email ?? '',
      password: password ?? '',
    })
    if (error) throw new Error(`Could not sign in the test account: ${error.message}`)
    return { repositories: createSupabaseRepositories(client), client }
  })()
  return shared
}

const enabled = Boolean(url && key && email && password && allowed)

describeRepositoryContract(
  'supabase (live project)',
  async () => {
    const { repositories } = await connect()
    return { repositories, cleanup: () => emptyRepositories(repositories) }
  },
  { skip: !enabled },
)

describe.skipIf(!enabled)('supabase photo storage (live project)', () => {
  const BUCKET = 'entry-photos'

  async function uploadPhoto(client: SupabaseClient): Promise<string> {
    const { data } = await client.auth.getUser()
    const path = `${data.user?.id}/${crypto.randomUUID()}.jpg`
    // Raw bytes (a minimal JPEG) with an explicit type: jsdom's Blob would be sent as text/plain.
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9])
    const { error } = await client.storage
      .from(BUCKET)
      .upload(path, jpeg, { contentType: 'image/jpeg' })
    if (error) throw error
    return client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
  }
  const isPublic = async (photoUrl: string) => (await fetch(photoUrl, { method: 'HEAD' })).ok

  beforeEach(async () => {
    const { repositories } = await connect()
    await emptyRepositories(repositories)
  })

  it('deleting an entry deletes its photos from Storage (no orphaned files)', async () => {
    const { repositories, client } = await connect()
    const place = await repositories.places.create({ name: 'Foto', city: 'X' })
    const photo = await uploadPhoto(client)
    const entry = await repositories.entries.create({
      placeId: place.id,
      date: '2026-10-07',
      reaction: 'good',
      photos: [photo],
    })
    expect(await isPublic(photo)).toBe(true)
    await repositories.entries.remove(entry.id)
    expect(await isPublic(photo)).toBe(false)
  })

  it('removing a photo while editing deletes just that file', async () => {
    const { repositories, client } = await connect()
    const place = await repositories.places.create({ name: 'Foto', city: 'X' })
    const [keep, drop] = [await uploadPhoto(client), await uploadPhoto(client)]
    const entry = await repositories.entries.create({
      placeId: place.id,
      date: '2026-10-07',
      reaction: 'good',
      photos: [keep, drop],
    })
    await repositories.entries.update(entry.id, { photos: [keep] })
    expect(await isPublic(keep)).toBe(true)
    expect(await isPublic(drop)).toBe(false)
  })

  it("another user can neither see nor delete someone else's photo", async () => {
    const { client } = await connect()
    const photo = await uploadPhoto(client)
    const stranger = createClient(url ?? '', key ?? '', {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { error } = await stranger.auth.signUp({
      email: `qa-stranger-${Date.now()}@example.com`,
      password: `Qa-${crypto.randomUUID()}`, // throwaway: generated per run, never reused
    })
    if (error) throw error
    const path = photo.split(`/${BUCKET}/`)[1] ?? ''
    const removed = await stranger.storage.from(BUCKET).remove([path])
    expect(removed.data).toHaveLength(0)
    expect(await isPublic(photo)).toBe(true)
    await client.storage.from(BUCKET).remove([path]) // tidy up
  })
})
