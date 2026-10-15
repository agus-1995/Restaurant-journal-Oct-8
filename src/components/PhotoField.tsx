import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUploadImage } from '@/hooks'
import { errorMessageKey } from '@/lib/errors'
import { MAX_PHOTOS } from '@/lib/limits'
import { Button } from './Button'

interface PhotoFieldProps {
  photos: string[]
  onChange: (photos: string[]) => void
}

/** Big, thumb-friendly photo adder. Photos are compressed through `ImageStorage`. */
export function PhotoField({ photos, onChange }: PhotoFieldProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const upload = useUploadImage()
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)
  const latest = useRef(photos)
  useEffect(() => {
    latest.current = photos
  }, [photos])

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)
    setBusy(true)
    const added: string[] = []
    try {
      for (const file of Array.from(files).slice(0, MAX_PHOTOS - photos.length)) {
        added.push(await upload.mutateAsync(file))
      }
    } catch (caught) {
      setError(caught)
    } finally {
      if (added.length > 0) onChange([...latest.current, ...added])
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const canAdd = photos.length < MAX_PHOTOS

  return (
    <div>
      <p className="mb-2 text-base font-semibold">{t('form.photos')}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        data-testid="photo-input"
        aria-label={t('form.addPhoto')}
        tabIndex={-1}
        onChange={(event) => void handleFiles(event.target.files)}
      />
      {photos.length === 0 ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="flex min-h-40 w-full flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-ink-soft bg-card text-lg font-semibold text-ink hover:border-terracotta"
        >
          <span aria-hidden="true" className="text-5xl">
            📸
          </span>
          {busy ? t('form.uploading') : t('form.addPhoto')}
        </button>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((photo, index) => (
            <li key={`${index}-${photo.slice(-24)}`} className="relative">
              <img
                src={photo}
                alt={t('form.photoPreview', { n: index + 1 })}
                className="aspect-square w-full rounded-2xl object-cover"
              />
              <button
                type="button"
                aria-label={t('form.removePhoto', { n: index + 1 })}
                onClick={() => onChange(photos.filter((_, i) => i !== index))}
                className="absolute -top-3 -right-3 flex size-11 items-center justify-center rounded-full bg-ink text-xl text-paper shadow"
              >
                <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {photos.length > 0 && canAdd && (
        <Button
          variant="secondary"
          className="mt-3"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? t('form.uploading') : t('form.addMorePhotos')}
        </Button>
      )}
      <p className="mt-1 text-sm text-ink-soft">{t('form.photoHint', { max: MAX_PHOTOS })}</p>
      {error !== null && (
        <p role="alert" className="mt-2 text-sm font-semibold text-wine">
          {t(errorMessageKey(error))}
        </p>
      )}
    </div>
  )
}
