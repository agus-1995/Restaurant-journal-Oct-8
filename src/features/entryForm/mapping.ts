import type { CreateEntryInput, Dish, Entry, UpdateEntryInput } from '@/types'
import type { EntryDetailsValues } from './schema'

/** Form holds dish names; keep any per-dish note the entry already had (matched by name). */
export function dishesFromNames(names: readonly string[], original: readonly Dish[] = []): Dish[] {
  return names.map((name) => {
    const note = original.find((dish) => dish.name === name)?.note
    return note ? { name, note } : { name }
  })
}

function blankToUndefined(value: string | undefined): string | undefined {
  return value === undefined || value.trim() === '' ? undefined : value.trim()
}

export function toCreateInput(values: EntryDetailsValues, placeId: string): CreateEntryInput {
  return {
    placeId,
    date: values.date,
    reaction: values.reaction,
    photos: values.photos,
    dishes: dishesFromNames(values.dishes),
    priceTier: values.priceTier,
    occasion: values.occasion,
    isUnusual: values.isUnusual,
    cuisineTags: values.cuisineTags,
    notes: blankToUndefined(values.notes),
  }
}

export function toUpdateInput(values: EntryDetailsValues, original: Entry): UpdateEntryInput {
  return {
    date: values.date,
    reaction: values.reaction,
    photos: values.photos,
    dishes: dishesFromNames(values.dishes, original.dishes),
    priceTier: values.priceTier,
    occasion: values.occasion,
    isUnusual: values.isUnusual,
    cuisineTags: values.cuisineTags,
    notes: blankToUndefined(values.notes),
  }
}

export function entryToFormValues(entry: Entry): EntryDetailsValues {
  return {
    date: entry.date,
    photos: entry.photos,
    reaction: entry.reaction,
    dishes: entry.dishes.map((dish) => dish.name),
    priceTier: entry.priceTier,
    occasion: entry.occasion,
    isUnusual: entry.isUnusual,
    cuisineTags: entry.cuisineTags,
    notes: entry.notes ?? '',
  }
}
