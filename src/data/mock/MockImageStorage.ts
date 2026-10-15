import { RepositoryError, type ImageStorage } from '../repositories'
import type { MockContext } from './context'

/**
 * Stores photos as compressed data URLs that live inside the entry itself. The interface is
 * what matters: a Supabase version would upload to Storage and return the object's URL.
 */
export function createMockImageStorage(ctx: MockContext): ImageStorage {
  return {
    upload: (file) =>
      ctx.request(() => {
        if (!file.type.startsWith('image/')) {
          throw new RepositoryError('invalid', `Expected an image but got "${file.type}"`)
        }
        return ctx.compressImage(file)
      }),
    // Data URLs are stored inside the entry, so there is nothing separate to clean up.
    remove: () => ctx.request(() => undefined),
  }
}
