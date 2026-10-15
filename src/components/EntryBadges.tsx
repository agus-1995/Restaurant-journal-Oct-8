import { useTranslation } from 'react-i18next'
import { formatPriceTier } from '@/lib/format'
import type { PriceTier, Reaction } from '@/types'
import { REACTION_COLOR, REACTION_EMOJI } from './reactionMeta'

export function ReactionBadge({
  reaction,
  showLabel = true,
}: {
  reaction: Reaction
  showLabel?: boolean
}) {
  const { t } = useTranslation()
  return (
    <span className={`inline-flex items-center gap-1 font-semibold ${REACTION_COLOR[reaction]}`}>
      <span aria-hidden="true">{REACTION_EMOJI[reaction]}</span>
      <span className={showLabel ? undefined : 'sr-only'}>{t(`reaction.${reaction}`)}</span>
    </span>
  )
}

export function PriceBadge({ tier }: { tier: PriceTier }) {
  const { t } = useTranslation()
  return (
    <span className="font-semibold text-ink-soft">
      <span aria-hidden="true">{formatPriceTier(tier)}</span>
      <span className="sr-only">
        {t('price.label')}: {t(`price.${tier}`)}
      </span>
    </span>
  )
}
