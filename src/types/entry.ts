import type { EntityId, ISODate, ISODateTime } from './common'

export const REACTIONS = ['loved', 'good', 'meh'] as const
export type Reaction = (typeof REACTIONS)[number]

export const OCCASIONS = ['solo', 'friends', 'date', 'family', 'work'] as const
export type Occasion = (typeof OCCASIONS)[number]

/** 1 = $, 2 = $$, 3 = $$$. Deliberately currency-free: users live in different markets. */
export const PRICE_TIERS = [1, 2, 3] as const
export type PriceTier = (typeof PRICE_TIERS)[number]

export interface Dish {
  name: string
  note?: string
}

export interface Entry {
  id: EntityId
  placeId: EntityId
  date: ISODate
  /** Whatever `ImageStorage.upload` returned: a data URL today, a Storage URL later. */
  photos: string[]
  dishes: Dish[]
  priceTier?: PriceTier
  reaction: Reaction
  /** The "exotic find" flag. */
  isUnusual: boolean
  occasion?: Occasion
  cuisineTags: string[]
  notes?: string
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

/** Only `placeId`, `date` and `reaction` are required so logging stays fast. */
export type CreateEntryInput = Pick<Entry, 'placeId' | 'date' | 'reaction'> &
  Partial<Omit<Entry, 'id' | 'createdAt' | 'updatedAt' | 'placeId' | 'date' | 'reaction'>>

/** Passing a key with value `undefined` clears an optional field. */
export type UpdateEntryInput = Partial<Omit<Entry, 'id' | 'createdAt' | 'updatedAt'>>
