import type { Reaction } from '@/types'

export const REACTION_EMOJI: Record<Reaction, string> = {
  loved: '😍',
  good: '🙂',
  meh: '😕',
}

export const REACTION_COLOR: Record<Reaction, string> = {
  loved: 'text-wine',
  good: 'text-olive',
  meh: 'text-ink-soft',
}
