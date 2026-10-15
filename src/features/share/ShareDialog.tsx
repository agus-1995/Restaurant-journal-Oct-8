import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/Button'
import { Modal } from '@/components/Modal'
import { REACTION_EMOJI } from '@/components/reactionMeta'
import { formatEntryDate, formatPriceTier } from '@/lib/format'
import { slugify } from '@/lib/text'
import type { EntryWithPlace } from '@/types'
import { renderShareCard, type ShareCardData } from './renderShareCard'
import { canShareFile, copyText, downloadUrl, shareFile } from './shareActions'

interface ShareDialogProps {
  entry: EntryWithPlace
  onClose: () => void
}

interface RenderedCard {
  blob: Blob
  url: string
}

export function ShareDialog({ entry, onClose }: ShareDialogProps) {
  const { t, i18n } = useTranslation()
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; message: string } | null>(null)

  const card = useQuery({
    queryKey: ['share-card', entry.id, entry.updatedAt, i18n.language],
    staleTime: Infinity,
    gcTime: 0,
    queryFn: async (): Promise<RenderedCard> => {
      const data: ShareCardData = {
        placeName: entry.place.name,
        location: [entry.place.neighborhood, entry.place.city].filter(Boolean).join(', '),
        reactionEmoji: REACTION_EMOJI[entry.reaction],
        reactionLabel: t(`reaction.${entry.reaction}`),
        price: entry.priceTier ? formatPriceTier(entry.priceTier) : undefined,
        date: formatEntryDate(entry.date, i18n.language),
        dishesLabel: t('share.cardDishes'),
        dishes: entry.dishes.map((dish) => dish.name),
        footer: t('share.cardFooter'),
        photo: entry.photos[0],
      }
      const blob = await renderShareCard(data)
      return { blob, url: URL.createObjectURL(blob) }
    },
  })

  const fileName = `mi-diario-${slugify(entry.place.name)}.png`
  const file = card.data ? new File([card.data.blob], fileName, { type: 'image/png' }) : null
  const nativeShare = file !== null && canShareFile(file)
  const link = `${window.location.origin}/entry/${entry.id}`

  function close() {
    if (card.data) URL.revokeObjectURL(card.data.url)
    onClose()
  }

  async function handleShare() {
    if (!file) return
    try {
      await shareFile(file, entry.place.name, t('share.shareText', { place: entry.place.name }))
    } catch {
      setStatus({ kind: 'error', message: t('share.error') })
    }
  }

  async function handleCopy() {
    try {
      await copyText(link)
      setStatus({ kind: 'ok', message: t('share.linkCopied') })
    } catch {
      setStatus({ kind: 'error', message: t('share.linkCopyFailed') })
    }
  }

  return (
    <Modal title={t('share.title')} onClose={close}>
      <div className="mb-4 flex aspect-[4/5] items-center justify-center overflow-hidden rounded-2xl bg-paper-deep">
        {card.isPending && (
          <p role="status" className="animate-pulse text-ink-soft">
            {t('share.generating')}
          </p>
        )}
        {card.isError && (
          <p role="alert" className="px-4 text-center font-semibold text-wine">
            {t('share.error')}
          </p>
        )}
        {card.data && (
          <img
            src={card.data.url}
            alt={t('share.previewAlt', { place: entry.place.name })}
            className="max-h-[42dvh] w-auto max-w-full rounded-lg object-contain"
          />
        )}
      </div>

      <div className="space-y-3">
        {nativeShare && (
          <Button fullWidth onClick={() => void handleShare()}>
            {t('share.native')}
          </Button>
        )}
        <Button
          variant={nativeShare ? 'secondary' : 'primary'}
          fullWidth
          disabled={!card.data}
          onClick={() => {
            if (!card.data) return
            downloadUrl(card.data.url, fileName)
            setStatus({ kind: 'ok', message: t('share.downloaded') })
          }}
        >
          {t('share.download')}
        </Button>
        <Button variant="secondary" fullWidth onClick={() => void handleCopy()}>
          {t('share.copyLink')}
        </Button>
        <Button variant="ghost" fullWidth onClick={close}>
          {t('actions.close')}
        </Button>
      </div>

      <p
        role="status"
        className={`mt-3 min-h-6 text-sm font-semibold ${status?.kind === 'error' ? 'text-wine' : 'text-olive'}`}
      >
        {status?.message}
      </p>
      <p className="mt-1 text-sm text-ink-soft">{t('share.linkNote')}</p>
    </Modal>
  )
}
