import type { SupabaseClient } from '@supabase/supabase-js'
import { compressImageToBlob } from '@/lib/image'
import { newId } from '@/lib/id'
import { RepositoryError, type ImageStorage } from '../repositories'
import { toStorageError } from './errors'

export const PHOTO_BUCKET = 'entry-photos'

/** `https://<ref>.supabase.co/storage/v1/object/public/entry-photos/<uid>/<id>.jpg` → `<uid>/<id>.jpg` */
export function storagePathFromUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${PHOTO_BUCKET}/`
  const index = url.indexOf(marker)
  return index === -1
    ? null
    : decodeURIComponent(url.slice(index + marker.length).split('?')[0] ?? '')
}

/**
 * Deletes stored photos for the given URLs, best effort. URLs that are not in our bucket (for
 * example data URLs from before the switch) are skipped, and failures never block the caller:
 * an orphaned file is better than a failed "delete entry".
 */
export async function removeStoredPhotos(
  client: SupabaseClient,
  urls: readonly string[],
): Promise<void> {
  const paths = urls.map(storagePathFromUrl).filter((path): path is string => path !== null)
  if (paths.length === 0) return
  try {
    const { data, error } = await client.storage.from(PHOTO_BUCKET).remove(paths)
    if (error || (data?.length ?? 0) < paths.length) {
      // Storage reports success even when it deleted nothing (e.g. a missing policy), so say so.
      console.warn('[Mi Diario] Some photos could not be removed from Storage.', error ?? '')
    }
  } catch {
    // ignore: an orphaned file is better than a failed "delete entry"
  }
}

/** Uploads compressed JPEGs to the `entry-photos` bucket, under the user's own folder. */
export function createSupabaseImageStorage(
  client: SupabaseClient,
  ensureSession: () => Promise<string>,
): ImageStorage {
  return {
    async upload(file) {
      if (!file.type.startsWith('image/')) {
        throw new RepositoryError('invalid', `Expected an image but got "${file.type}"`)
      }
      const userId = await ensureSession()
      const blob = await compressImageToBlob(file)
      const path = `${userId}/${newId()}.jpg`
      const bucket = client.storage.from(PHOTO_BUCKET)
      const { error } = await bucket.upload(path, blob, {
        contentType: 'image/jpeg',
        cacheControl: '31536000', // the file name is unique, so it can be cached for a year
      })
      if (error) throw toStorageError(error)
      return bucket.getPublicUrl(path).data.publicUrl
    },

    async remove(url) {
      await ensureSession()
      await removeStoredPhotos(client, [url])
    },
  }
}
