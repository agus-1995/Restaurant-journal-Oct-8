import type { AuthService } from './AuthService'
import type { EntryRepository } from './EntryRepository'
import type { ImageStorage } from './ImageStorage'
import type { PlaceRepository } from './PlaceRepository'
import type { PreferencesRepository } from './PreferencesRepository'
import type { WishlistRepository } from './WishlistRepository'

export type { AuthEvent, AuthService, AuthUser, SignUpOutcome } from './AuthService'
export type { EntryRepository } from './EntryRepository'
export type { ImageStorage } from './ImageStorage'
export type { PlaceRepository } from './PlaceRepository'
export type { PreferencesRepository } from './PreferencesRepository'
export type { WishlistRepository } from './WishlistRepository'
export { isRepositoryError, RepositoryError, type RepositoryErrorCode } from './errors'

/** Everything the app needs from "the back end". One implementation set = one data source. */
export interface Repositories {
  entries: EntryRepository
  places: PlaceRepository
  wishlist: WishlistRepository
  preferences: PreferencesRepository
  images: ImageStorage
  auth: AuthService
}
