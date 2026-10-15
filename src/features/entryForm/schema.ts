import { z } from 'zod'
import { isValidISODate } from '@/lib/date'
import { MAX_CUISINE_TAGS, MAX_DISHES, MAX_NOTES_LENGTH, MAX_PHOTOS } from '@/lib/limits'
import { OCCASIONS, PLACE_TYPES, REACTIONS } from '@/types'

/** Validation messages are translation keys; the UI translates them (see useValidationMessage). */
export const VALIDATION_KEYS = [
  'validation.placeRequired',
  'validation.nameRequired',
  'validation.cityRequired',
  'validation.reactionRequired',
  'validation.dateInvalid',
  'validation.tooLong',
  'validation.emailRequired',
  'validation.emailInvalid',
  'validation.passwordRequired',
  'validation.passwordTooShort',
  'validation.passwordsDontMatch',
] as const
export type ValidationKey = (typeof VALIDATION_KEYS)[number]

export function isValidationKey(message: string): message is ValidationKey {
  return VALIDATION_KEYS.some((key) => key === message)
}

const message = (key: ValidationKey) => ({ error: key })

/** Everything about the meal itself (shared by quick-log and the edit screen). */
export const entryDetailsSchema = z.object({
  date: z.string().refine(isValidISODate, message('validation.dateInvalid')),
  photos: z.array(z.string()).max(MAX_PHOTOS),
  reaction: z.enum(REACTIONS, message('validation.reactionRequired')),
  dishes: z.array(z.string().trim().min(1)).max(MAX_DISHES),
  priceTier: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  occasion: z.enum(OCCASIONS).optional(),
  isUnusual: z.boolean(),
  cuisineTags: z.array(z.string().trim().min(1)).max(MAX_CUISINE_TAGS),
  notes: z.string().trim().max(MAX_NOTES_LENGTH, message('validation.tooLong')).optional(),
})

/** Either an existing place, or the details of one to create on save. */
export const placeSelectionSchema = z.discriminatedUnion(
  'kind',
  [
    z.object({ kind: z.literal('existing'), placeId: z.string().min(1) }),
    z.object({
      kind: z.literal('new'),
      name: z.string().trim().min(1, message('validation.nameRequired')),
      city: z.string().trim().min(1, message('validation.cityRequired')),
      neighborhood: z.string().trim().optional(),
      type: z.enum(PLACE_TYPES),
    }),
  ],
  message('validation.placeRequired'),
)

/** Quick log: the place plus the details. Only place, date and reaction are really required. */
export const logFormSchema = entryDetailsSchema.extend({ place: placeSelectionSchema })

export type EntryDetailsValues = z.infer<typeof entryDetailsSchema>
export type PlaceSelection = z.infer<typeof placeSelectionSchema>
export type LogFormValues = z.infer<typeof logFormSchema>
