import type { EntityId, ISODateTime } from './common'

export const PLACE_TYPES = ['restaurant', 'winery', 'cafe', 'street_food', 'bar', 'other'] as const
export type PlaceType = (typeof PLACE_TYPES)[number]

export const PLACE_STATUSES = ['open', 'closed', 'unknown'] as const
export type PlaceStatus = (typeof PLACE_STATUSES)[number]

export interface Place {
  id: EntityId
  name: string
  /** Optional so a place can be created on the fly while logging. */
  neighborhood?: string
  city: string
  type: PlaceType
  status: PlaceStatus
  address?: string
  mapsUrl?: string
  createdAt: ISODateTime
}

/** `name` and `city` are required; everything else gets a default. */
export type CreatePlaceInput = Pick<Place, 'name' | 'city'> &
  Partial<Omit<Place, 'id' | 'createdAt' | 'name' | 'city'>>

export type UpdatePlaceInput = Partial<Omit<Place, 'id' | 'createdAt'>>
