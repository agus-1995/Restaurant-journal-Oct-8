import { useTranslation } from 'react-i18next'
import {
  OCCASIONS,
  PLACE_TYPES,
  PRICE_TIERS,
  REACTIONS,
  type Occasion,
  type PlaceType,
  type PriceTier,
  type Reaction,
} from '@/types'
import { formatPriceTier } from '@/lib/format'
import { ChoiceGroup } from './ChoiceGroup'
import { REACTION_EMOJI } from './reactionMeta'

interface FieldProps<T> {
  value: T | undefined
  onChange: (value: T | undefined) => void
  error?: string
}

export function ReactionField({ value, onChange, error }: FieldProps<Reaction>) {
  const { t } = useTranslation()
  return (
    <ChoiceGroup
      legend={t('reaction.label')}
      size="tall"
      value={value}
      onChange={onChange}
      error={error}
      options={REACTIONS.map((reaction) => ({
        value: reaction,
        label: t(`reaction.${reaction}`),
        icon: REACTION_EMOJI[reaction],
      }))}
    />
  )
}

export function PriceTierField({ value, onChange }: FieldProps<PriceTier>) {
  const { t } = useTranslation()
  return (
    <ChoiceGroup
      legend={t('price.label')}
      allowDeselect
      value={value}
      onChange={onChange}
      options={PRICE_TIERS.map((tier) => ({
        value: tier,
        label: formatPriceTier(tier),
        ariaLabel: `${formatPriceTier(tier)}: ${t(`price.${tier}`)}`,
      }))}
    />
  )
}

export function OccasionField({ value, onChange }: FieldProps<Occasion>) {
  const { t } = useTranslation()
  return (
    <ChoiceGroup
      legend={t('occasion.label')}
      allowDeselect
      value={value}
      onChange={onChange}
      options={OCCASIONS.map((occasion) => ({ value: occasion, label: t(`occasion.${occasion}`) }))}
    />
  )
}

export function PlaceTypeField({ value, onChange }: FieldProps<PlaceType>) {
  const { t } = useTranslation()
  return (
    <ChoiceGroup
      legend={t('placeType.label')}
      value={value}
      onChange={onChange}
      options={PLACE_TYPES.map((type) => ({ value: type, label: t(`placeType.${type}`) }))}
    />
  )
}
