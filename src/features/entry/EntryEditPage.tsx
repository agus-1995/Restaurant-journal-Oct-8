import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Controller, useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { OccasionField, PriceTierField, ReactionField } from '@/components/choiceFields'
import { buttonStyles } from '@/components/buttonStyles'
import { PhotoField } from '@/components/PhotoField'
import { TagInput } from '@/components/TagInput'
import { DateField, NotesField, UnusualField } from '@/features/entryForm/fields'
import { entryToFormValues, toUpdateInput } from '@/features/entryForm/mapping'
import { entryDetailsSchema, type EntryDetailsValues } from '@/features/entryForm/schema'
import { useValidationMessage } from '@/features/entryForm/useValidationMessage'
import { useEntryWithPlace, useUpdateEntry } from '@/hooks'
import { errorMessageKey } from '@/lib/errors'
import { MAX_CUISINE_TAGS, MAX_DISHES } from '@/lib/limits'
import type { EntryWithPlace } from '@/types'

export function EntryEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const { data: entry, isPending, isError, error, refetch } = useEntryWithPlace(id)

  if (isPending) return <LoadingState variant="detail" />
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />
  if (!entry) {
    return (
      <EmptyState
        emoji="🔎"
        title={t('entry.notFound.title')}
        body={t('entry.notFound.body')}
        action={
          <Link to="/" className={buttonStyles('primary')}>
            {t('actions.backToJournal')}
          </Link>
        }
      />
    )
  }
  return <EditForm entry={entry} />
}

function EditForm({ entry }: { entry: EntryWithPlace }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const update = useUpdateEntry()
  const message = useValidationMessage()
  const { control, handleSubmit } = useForm<EntryDetailsValues>({
    resolver: zodResolver(entryDetailsSchema),
    defaultValues: entryToFormValues(entry),
  })

  const onSubmit = handleSubmit((values) => {
    update.mutate(
      { id: entry.id, patch: toUpdateInput(values, entry) },
      { onSuccess: () => navigate(`/entry/${entry.id}`) },
    )
  })

  return (
    <section aria-labelledby="edit-title" className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 id="edit-title" className="text-3xl font-semibold">
          {t('entry.edit.title')}
        </h1>
        <p className="mt-1 text-ink-soft">
          {t('entry.edit.placeLocked', { place: entry.place.name })}
        </p>
      </header>

      <form onSubmit={(event) => void onSubmit(event)} noValidate className="space-y-6">
        <Controller
          control={control}
          name="photos"
          render={({ field }) => <PhotoField photos={field.value} onChange={field.onChange} />}
        />
        <Controller
          control={control}
          name="reaction"
          render={({ field, fieldState }) => (
            <ReactionField
              value={field.value}
              onChange={field.onChange}
              error={message(fieldState.error?.message)}
            />
          )}
        />
        <Controller
          control={control}
          name="dishes"
          render={({ field }) => (
            <TagInput
              label={t('form.dishes')}
              values={field.value}
              onChange={field.onChange}
              placeholder={t('form.dishesPlaceholder')}
              hint={t('form.dishesHint')}
              addLabel={t('form.addDish')}
              removeLabel={(tag) => t('form.removeTag', { tag })}
              max={MAX_DISHES}
            />
          )}
        />
        <Controller
          control={control}
          name="priceTier"
          render={({ field }) => <PriceTierField value={field.value} onChange={field.onChange} />}
        />
        <Controller
          control={control}
          name="occasion"
          render={({ field }) => <OccasionField value={field.value} onChange={field.onChange} />}
        />
        <Controller
          control={control}
          name="date"
          render={({ field, fieldState }) => (
            <DateField
              value={field.value}
              onChange={field.onChange}
              error={message(fieldState.error?.message)}
            />
          )}
        />
        <Controller
          control={control}
          name="isUnusual"
          render={({ field }) => <UnusualField value={field.value} onChange={field.onChange} />}
        />
        <Controller
          control={control}
          name="cuisineTags"
          render={({ field }) => (
            <TagInput
              label={t('form.cuisine')}
              values={field.value}
              onChange={field.onChange}
              placeholder={t('form.cuisinePlaceholder')}
              hint={t('form.cuisineHint')}
              addLabel={t('form.addCuisine')}
              removeLabel={(tag) => t('form.removeTag', { tag })}
              max={MAX_CUISINE_TAGS}
            />
          )}
        />
        <Controller
          control={control}
          name="notes"
          render={({ field, fieldState }) => (
            <NotesField
              value={field.value ?? ''}
              onChange={field.onChange}
              error={message(fieldState.error?.message)}
            />
          )}
        />

        {update.isError && (
          <p role="alert" className="font-semibold text-wine">
            {t('entry.edit.saveFailed')} {t(errorMessageKey(update.error))}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? t('actions.saving') : t('actions.save')}
          </Button>
          <Link to={`/entry/${entry.id}`} className={buttonStyles('secondary')}>
            {t('actions.cancel')}
          </Link>
        </div>
      </form>
    </section>
  )
}
