import { useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { REACTION_EMOJI } from '@/components/reactionMeta'
import { buttonStyles } from '@/components/buttonStyles'
import { useEntriesWithPlaces } from '@/hooks'
import {
  collectCuisineTags,
  collectNeighborhoods,
  countActiveFilters,
  filterEntries,
  hasAnyFilter,
  parseFilters,
  serializeFilters,
  type EntryFilters,
} from '@/lib/filters'
import { formatPriceTier } from '@/lib/format'
import { OCCASIONS, PRICE_TIERS, REACTIONS } from '@/types'
import { FilterChip } from './FilterChip'
import { SearchResult } from './SearchResult'

function toggle<T>(list: readonly T[], item: T): T[] {
  return list.includes(item) ? list.filter((existing) => existing !== item) : [...list, item]
}

export function SearchPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => parseFilters(params), [params])
  const { data, isPending, isError, error, refetch } = useEntriesWithPlaces()
  const activeCount = countActiveFilters(filters)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const panelId = useId()
  const queryId = useId()
  const hoodId = useId()

  const results = useMemo(() => (data ? filterEntries(data, filters) : []), [data, filters])
  const cuisines = useMemo(() => (data ? collectCuisineTags(data) : []), [data])
  const neighborhoods = useMemo(() => (data ? collectNeighborhoods(data) : []), [data])

  // Filters live in the URL: shareable, survive reload, and tag links from an entry just work.
  function update(next: Partial<EntryFilters>) {
    setParams(serializeFilters({ ...filters, ...next }), { replace: true })
  }

  return (
    <section aria-labelledby="search-title" className="space-y-5">
      <h1 id="search-title" className="text-3xl font-semibold md:text-4xl">
        {t('search.title')}
      </h1>

      {isPending && <LoadingState variant="list" />}
      {isError && <ErrorState error={error} onRetry={() => void refetch()} />}

      {data && data.length === 0 && (
        <EmptyState
          emoji="🔍"
          title={t('search.noEntries.title')}
          body={t('search.noEntries.body')}
          action={
            <Link to="/log" className={buttonStyles('primary')}>
              {t('search.noEntries.cta')}
            </Link>
          }
        />
      )}

      {data && data.length > 0 && (
        <>
          <div>
            <label htmlFor={queryId} className="sr-only">
              {t('search.queryLabel')}
            </label>
            <input
              id={queryId}
              type="search"
              value={filters.query}
              placeholder={t('search.queryPlaceholder')}
              enterKeyHint="search"
              autoComplete="off"
              onChange={(event) => update({ query: event.target.value })}
              className="min-h-14 w-full rounded-2xl border-2 border-line bg-card px-4 text-lg"
            />
          </div>

          <div>
            <button
              type="button"
              aria-expanded={filtersOpen}
              aria-controls={panelId}
              onClick={() => setFiltersOpen((open) => !open)}
              className="inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-ink px-5 font-semibold text-ink hover:bg-ink hover:text-paper"
            >
              {activeCount > 0
                ? t('search.filtersCount', { count: activeCount })
                : t('search.filters')}
              <span aria-hidden="true">{filtersOpen ? '▴' : '▾'}</span>
            </button>

            <div
              id={panelId}
              hidden={!filtersOpen}
              className="mt-3 space-y-5 rounded-3xl border border-line bg-card p-4"
            >
              <FilterGroup legend={t('price.label')}>
                {PRICE_TIERS.map((tier) => (
                  <FilterChip
                    key={tier}
                    pressed={filters.priceTiers.includes(tier)}
                    ariaLabel={`${formatPriceTier(tier)}: ${t(`price.${tier}`)}`}
                    onClick={() => update({ priceTiers: toggle(filters.priceTiers, tier) })}
                  >
                    {formatPriceTier(tier)}
                  </FilterChip>
                ))}
              </FilterGroup>

              <FilterGroup legend={t('reaction.label')}>
                {REACTIONS.map((reaction) => (
                  <FilterChip
                    key={reaction}
                    pressed={filters.reactions.includes(reaction)}
                    onClick={() => update({ reactions: toggle(filters.reactions, reaction) })}
                  >
                    <span aria-hidden="true">{REACTION_EMOJI[reaction]}</span>
                    {t(`reaction.${reaction}`)}
                  </FilterChip>
                ))}
              </FilterGroup>

              <FilterGroup legend={t('occasion.label')}>
                {OCCASIONS.map((occasion) => (
                  <FilterChip
                    key={occasion}
                    pressed={filters.occasions.includes(occasion)}
                    onClick={() => update({ occasions: toggle(filters.occasions, occasion) })}
                  >
                    {t(`occasion.${occasion}`)}
                  </FilterChip>
                ))}
              </FilterGroup>

              {cuisines.length > 0 && (
                <FilterGroup legend={t('search.cuisine')}>
                  {cuisines.map((cuisine) => (
                    <FilterChip
                      key={cuisine}
                      pressed={filters.cuisines.includes(cuisine)}
                      onClick={() => update({ cuisines: toggle(filters.cuisines, cuisine) })}
                    >
                      {cuisine}
                    </FilterChip>
                  ))}
                </FilterGroup>
              )}

              {neighborhoods.length > 0 && (
                <div>
                  <label htmlFor={hoodId} className="mb-2 block text-base font-semibold">
                    {t('search.neighborhood')}
                  </label>
                  <select
                    id={hoodId}
                    value={filters.neighborhood ?? ''}
                    onChange={(event) => update({ neighborhood: event.target.value || null })}
                    className="min-h-12 w-full rounded-2xl border-2 border-line bg-paper px-3 text-base"
                  >
                    <option value="">{t('search.anyNeighborhood')}</option>
                    {neighborhoods.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <label className="flex min-h-12 cursor-pointer items-center gap-3 font-semibold">
                <input
                  type="checkbox"
                  checked={filters.unusualOnly}
                  onChange={(event) => update({ unusualOnly: event.target.checked })}
                  className="size-6 accent-terracotta"
                />
                <span>
                  <span aria-hidden="true">✨ </span>
                  {t('search.unusualOnly')}
                </span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p role="status" className="font-semibold text-ink-soft">
              {t('search.results', { count: results.length })}
            </p>
            {hasAnyFilter(filters) && (
              <Button
                variant="ghost"
                onClick={() => setParams(new URLSearchParams(), { replace: true })}
              >
                {t('actions.clearFilters')}
              </Button>
            )}
          </div>

          {results.length === 0 ? (
            <EmptyState
              emoji="🧐"
              title={t('search.noResults.title')}
              body={t('search.noResults.body')}
            />
          ) : (
            <ul className="space-y-3">
              {results.map((entry) => (
                <li key={entry.id}>
                  <SearchResult entry={entry} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}

function FilterGroup({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-base font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  )
}
