import { toISODate } from '@/lib/date'
import type { Entry, Place, WishlistItem } from '@/types'
import { placeholderPhoto } from './placeholderPhotos'

export interface SeedData {
  places: Place[]
  entries: Entry[]
  wishlist: WishlistItem[]
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * First-run demo data: 14 entries across Buenos Aires and Mendoza (bodegones, wineries,
 * street food, "unusual" finds), 3 wishlist items. Place names are fictional.
 * Dates are relative to `now` so the journal always looks current.
 */
export function buildSeed(now: Date): SeedData {
  const at = (daysAgo: number) => new Date(now.getTime() - daysAgo * DAY_MS)

  const place = (
    id: string,
    name: string,
    neighborhood: string,
    city: string,
    type: Place['type'],
    status: Place['status'] = 'open',
    daysAgo = 90,
  ): Place => ({
    id,
    name,
    neighborhood,
    city,
    type,
    status,
    createdAt: at(daysAgo).toISOString(),
  })

  const places: Place[] = [
    place(
      'place-bodegon',
      'Bodegón Don Anselmo',
      'San Telmo',
      'Buenos Aires',
      'restaurant',
      'open',
      86,
    ),
    place(
      'place-vermut',
      'Vermutería La Hora Dorada',
      'Villa Crespo',
      'Buenos Aires',
      'bar',
      'open',
      3,
    ),
    place(
      'place-kimchi',
      'Kimchi y Provoleta',
      'Chacarita',
      'Buenos Aires',
      'restaurant',
      'open',
      6,
    ),
    place(
      'place-choripan',
      'Choripán del Puente',
      'Costanera Sur',
      'Buenos Aires',
      'street_food',
      'open',
      14,
    ),
    place(
      'place-empanadas',
      'Empanadas Tía Rosa',
      'Almagro',
      'Buenos Aires',
      'street_food',
      'open',
      18,
    ),
    place('place-pasta', 'Fideos de la Nonna', 'Boedo', 'Buenos Aires', 'restaurant', 'open', 31),
    place('place-cafe', 'Café Tostado Sur', 'Barracas', 'Buenos Aires', 'cafe', 'open', 38),
    place(
      'place-piedra-azul',
      'Bodega Piedra Azul',
      'Luján de Cuyo',
      'Mendoza',
      'winery',
      'open',
      9,
    ),
    place(
      'place-cerrillos',
      'Finca Los Cerrillos',
      'Valle de Uco',
      'Mendoza',
      'winery',
      'open',
      24,
    ),
    place('place-asador', 'Asador Las Acequias', 'Ciudad', 'Mendoza', 'restaurant', 'open', 47),
    place('place-almazara', 'Almazara Olivares del Este', 'Maipú', 'Mendoza', 'other', 'open', 55),
    place(
      'place-cuyano',
      'Sanguchería El Cuyano',
      'Godoy Cruz',
      'Mendoza',
      'street_food',
      'unknown',
      63,
    ),
    place('place-antigua', 'Bodega Antigua Maipú', 'Maipú', 'Mendoza', 'winery', 'closed', 72),
    // Wishlist-only places (not visited yet)
    place(
      'place-chicho',
      'Parrilla Lo de Chicho',
      'Palermo',
      'Buenos Aires',
      'restaurant',
      'open',
      12,
    ),
    place(
      'place-casa-cerro',
      'Bodega Casa del Cerro',
      'Tupungato',
      'Mendoza',
      'winery',
      'open',
      20,
    ),
    place(
      'place-pistacho',
      'Heladería Pistacho Roto',
      'Colegiales',
      'Buenos Aires',
      'cafe',
      'open',
      5,
    ),
  ]

  const entry = (
    n: number,
    daysAgo: number,
    placeId: string,
    photos: string[],
    rest: Omit<Entry, 'id' | 'placeId' | 'date' | 'photos' | 'createdAt' | 'updatedAt'>,
  ): Entry => ({
    id: `entry-${String(n).padStart(2, '0')}`,
    placeId,
    date: toISODate(at(daysAgo)),
    photos,
    createdAt: at(daysAgo).toISOString(),
    updatedAt: at(daysAgo).toISOString(),
    ...rest,
  })

  const entries: Entry[] = [
    entry(1, 1, 'place-bodegon', [placeholderPhoto('🥩', 18)], {
      dishes: [
        { name: 'Milanesa napolitana', note: 'Enorme, para compartir' },
        { name: 'Flan mixto' },
      ],
      priceTier: 2,
      reaction: 'loved',
      isUnusual: false,
      occasion: 'friends',
      cuisineTags: ['argentina', 'bodegón', 'milanesa'],
      notes:
        'Mozos de toda la vida y mesas de madera. El flan con dulce de leche y crema, un mimo.',
    }),
    entry(2, 3, 'place-vermut', [placeholderPhoto('🥃', 32)], {
      dishes: [{ name: 'Vermut con sifón' }, { name: 'Picada de quesos y fiambres' }],
      priceTier: 2,
      reaction: 'good',
      isUnusual: false,
      occasion: 'date',
      cuisineTags: ['vermut', 'picada'],
      notes: 'Lindo para ir sin apuro después del trabajo.',
    }),
    entry(3, 6, 'place-kimchi', [placeholderPhoto('🥟', 345)], {
      dishes: [
        { name: 'Provoleta con kimchi', note: 'Mejor de lo que suena' },
        { name: 'Empanada de bulgogi' },
      ],
      priceTier: 2,
      reaction: 'loved',
      isUnusual: true,
      occasion: 'friends',
      cuisineTags: ['fusión', 'coreana', 'argentina'],
      notes: 'Mezcla de parrilla argentina y cocina coreana. Un hallazgo.',
    }),
    entry(4, 9, 'place-piedra-azul', [placeholderPhoto('🍷', 340), placeholderPhoto('⛰️', 210)], {
      dishes: [
        { name: 'Degustación de 4 Malbec' },
        { name: 'Almuerzo de 3 pasos', note: 'Cordero lento' },
      ],
      priceTier: 3,
      reaction: 'loved',
      isUnusual: false,
      occasion: 'date',
      cuisineTags: ['vino', 'malbec'],
      notes: 'Vista a la cordillera y un Malbec de altura que no me olvido más.',
    }),
    entry(5, 14, 'place-choripan', [placeholderPhoto('🌭', 25)], {
      dishes: [{ name: 'Choripán con chimichurri' }],
      priceTier: 1,
      reaction: 'good',
      isUnusual: false,
      occasion: 'solo',
      cuisineTags: ['street food', 'parrilla'],
    }),
    entry(6, 18, 'place-empanadas', [placeholderPhoto('🥟', 40)], {
      dishes: [{ name: 'Empanadas de carne cortada a cuchillo' }, { name: 'Empanada de humita' }],
      priceTier: 1,
      reaction: 'loved',
      isUnusual: false,
      occasion: 'family',
      cuisineTags: ['empanadas', 'argentina'],
      notes: 'Jugosas y bien fritas. Siempre hay cola, vale la pena.',
    }),
    entry(7, 24, 'place-cerrillos', [placeholderPhoto('🍇', 285)], {
      dishes: [{ name: 'Menú de maridaje de 5 pasos' }],
      priceTier: 3,
      reaction: 'loved',
      isUnusual: false,
      occasion: 'friends',
      cuisineTags: ['vino', 'maridaje', 'cocina de autor'],
      notes: 'Cada plato con su vino. El postre con Late Harvest fue lo mejor.',
    }),
    entry(8, 31, 'place-pasta', [placeholderPhoto('🍝', 48)], {
      dishes: [{ name: 'Sorrentinos de jamón y queso' }, { name: 'Tiramisú' }],
      priceTier: 2,
      reaction: 'good',
      isUnusual: false,
      occasion: 'family',
      cuisineTags: ['italiana', 'pastas'],
    }),
    entry(9, 38, 'place-cafe', [placeholderPhoto('☕', 30)], {
      dishes: [{ name: 'Flat white' }, { name: 'Medialunas de manteca' }],
      priceTier: 1,
      reaction: 'good',
      isUnusual: false,
      occasion: 'work',
      cuisineTags: ['café', 'desayuno'],
      notes: 'Buen wifi y mesas grandes para laburar.',
    }),
    entry(10, 47, 'place-asador', [placeholderPhoto('🍖', 12)], {
      dishes: [{ name: 'Cabrito al horno de barro' }, { name: 'Ensalada de tomates mendocinos' }],
      priceTier: 3,
      reaction: 'loved',
      isUnusual: false,
      occasion: 'family',
      cuisineTags: ['asado', 'mendocina', 'cabrito'],
    }),
    entry(11, 55, 'place-almazara', [placeholderPhoto('🫒', 75)], {
      dishes: [
        { name: 'Degustación de aceites de oliva' },
        { name: 'Helado de chocolate con aceite de oliva y sal', note: 'Sorpresa total' },
      ],
      priceTier: 2,
      reaction: 'good',
      isUnusual: true,
      occasion: 'date',
      cuisineTags: ['aceite de oliva', 'postres', 'mendocina'],
      notes: 'Nunca había probado aceite de oliva en un postre. Raro y rico.',
    }),
    entry(12, 63, 'place-cuyano', [placeholderPhoto('🥪', 50)], {
      dishes: [{ name: 'Sándwich de lomo con huevo y tomate seco' }],
      priceTier: 1,
      reaction: 'meh',
      isUnusual: false,
      occasion: 'solo',
      cuisineTags: ['sándwich', 'street food'],
      notes: 'El pan estaba pasado. No vuelvo.',
    }),
    entry(13, 72, 'place-antigua', [placeholderPhoto('🚲', 190)], {
      dishes: [{ name: 'Recorrido en bici y degustación' }],
      priceTier: 2,
      reaction: 'good',
      isUnusual: true,
      occasion: 'friends',
      cuisineTags: ['vino', 'bici'],
      notes: 'Ya cerró, una pena. Me quedo con el recuerdo del paseo entre viñedos.',
    }),
    entry(14, 85, 'place-bodegon', [placeholderPhoto('🍮', 22)], {
      dishes: [
        { name: 'Ravioles con tuco' },
        { name: 'Vigilante', note: 'Queso con dulce de membrillo' },
      ],
      priceTier: 2,
      reaction: 'good',
      isUnusual: false,
      occasion: 'family',
      cuisineTags: ['argentina', 'bodegón', 'pastas'],
    }),
  ]

  const wishlist: WishlistItem[] = [
    {
      id: 'wish-01',
      placeId: 'place-chicho',
      note: 'Dicen que el bife de chorizo es de otro planeta',
      source: 'Cami',
      addedAt: at(12).toISOString(),
    },
    {
      id: 'wish-02',
      placeId: 'place-casa-cerro',
      note: 'Para la próxima escapada a Valle de Uco',
      addedAt: at(20).toISOString(),
    },
    {
      id: 'wish-03',
      placeId: 'place-pistacho',
      note: 'Helado de pistacho con sal marina',
      source: 'Instagram',
      addedAt: at(5).toISOString(),
    },
  ]

  return { places, entries, wishlist }
}
