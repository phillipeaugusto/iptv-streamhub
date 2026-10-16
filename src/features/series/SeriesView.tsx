import { useEffect, useRef } from 'react'
import { Play, RefreshCw } from 'lucide-react'
import { EmptyState } from '@/shared/components/feedback/EmptyState'
import { ErrorState } from '@/shared/components/feedback/ErrorState'
import { PosterSkeletonGrid } from '@/shared/components/feedback/Skeleton'
import { CategoryChips } from '@/shared/components/media/CategoryChips'
import { ContentCard } from '@/shared/components/media/ContentCard'
import { SearchBar } from '@/shared/components/media/SearchBar'
import { Button } from '@/shared/components/ui/Button'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { Sheet, SheetBody, SheetContent, SheetHeader } from '@/shared/components/ui/Sheet'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { useSeriesViewModel } from './useSeriesViewModel'
import styles from '@/shared/theme/views.module.css'

export function SeriesView() {
  const vm = useSeriesViewModel()
  const isMobile = useIsMobile()
  const sheetOpen = isMobile && Boolean(vm.selectedSeriesId)
  const episodes = vm.activeSeason?.episodes ?? []
  const detailsRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!vm.selectedSeriesId || isMobile) return
    const frame = requestAnimationFrame(() => {
      detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
    return () => cancelAnimationFrame(frame)
  }, [vm.selectedSeriesId, isMobile])

  const detailsBody = !vm.selectedSeriesId ? (
    <EmptyState title="Detalhes" description="Selecione uma série." />
  ) : vm.detailsLoading ? (
    <div style={{ display: 'grid', gap: '0.65rem' }}>
      <Skeleton style={{ height: 28, width: '70%' }} />
      <Skeleton style={{ height: 120 }} />
    </div>
  ) : vm.details ? (
    <div className={styles.details}>
      <h2 style={{ fontSize: 'var(--text-xl)' }}>{vm.details.name}</h2>
      {vm.details.plot ? <p>{vm.details.plot}</p> : null}

      {vm.seasons.length === 0 ? (
        <EmptyState title="Sem temporadas" description="Este título não tem episódios listados." />
      ) : (
        <>
          <div className={styles.seasonTabs}>
            {vm.seasons.map((season) => {
              const active = vm.activeSeason?.seasonNumber === season.seasonNumber
              return (
                <button
                  key={season.seasonNumber}
                  type="button"
                  aria-pressed={active}
                  className={`${styles.seasonChip} ${active ? styles.seasonChipActive : ''}`}
                  onClick={() => vm.setSeasonNumber(season.seasonNumber)}
                >
                  {season.name}
                </button>
              )
            })}
          </div>

          <div className={styles.episodeList}>
            {episodes.length === 0 ? (
              <p className={styles.detailsMeta}>Nenhum episódio nesta temporada.</p>
            ) : (
              episodes.map((episode) => (
                <div key={episode.id} className={styles.episodeRow}>
                  <div>
                    <strong>
                      E{episode.episodeNumber} — {episode.title}
                    </strong>
                    {episode.plot ? (
                      <p className={styles.detailsMeta} style={{ marginTop: '0.25rem' }}>
                        {episode.plot}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const details = vm.details
                      if (!details) return
                      vm.playEpisode(details.id, episode.id, episode.containerExtension)
                    }}
                  >
                    <Play size={14} /> Assistir
                  </Button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  ) : (
    <EmptyState title="Sem detalhes" />
  )

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <SearchBar value={vm.search} onChange={vm.setSearch} placeholder="Buscar série…" />
        <Button
          variant="ghost"
          size="sm"
          disabled={vm.isRefreshing}
          onClick={() => void vm.refetch()}
          title="Baixar lista atualizada do servidor"
        >
          <RefreshCw size={16} className={vm.isRefreshing ? 'spin' : undefined} />
          {vm.isRefreshing ? 'Atualizando…' : 'Atualizar'}
        </Button>
        {vm.search || vm.categoryId !== 'all' ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              vm.setSearch('')
              vm.setCategoryId('all')
            }}
          >
            Limpar filtros
          </Button>
        ) : null}
      </div>

      <div className={styles.withCategories}>
        <CategoryChips
          categories={vm.categories}
          selectedId={vm.categoryId}
          onSelect={vm.setCategoryId}
        />

        <div>
          {vm.error ? <ErrorState message={vm.error} onRetry={vm.refetch} /> : null}

          {vm.isLoading ? (
            <PosterSkeletonGrid />
          ) : (
            <div className={styles.catalogLayout}>
              {vm.series.length === 0 ? (
                <EmptyState title="Nenhuma série encontrada" />
              ) : (
                <div className={styles.grid} key={vm.categoryId}>
                  {vm.series.map((item) => (
                    <ContentCard
                      key={item.id}
                      title={item.name}
                      imageUrl={item.posterUrl}
                      badge={vm.selectedSeriesId === item.id ? 'Selecionado' : undefined}
                      selected={vm.selectedSeriesId === item.id}
                      isFavorite={vm.isFavorite(item.id)}
                      onToggleFavorite={() => vm.toggleFavorite(item)}
                      onClick={() => vm.selectSeries(item.id)}
                    />
                  ))}
                </div>
              )}

              <aside
                ref={detailsRef}
                className={`${styles.panel} ${styles.detailsDesktop} ${styles.detailsSticky}`}
              >
                {detailsBody}
              </aside>
            </div>
          )}
        </div>
      </div>

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          if (!open) vm.clearSelection()
        }}
      >
        <SheetContent side="bottom">
          <SheetHeader title={vm.details?.name ?? 'Série'} />
          <SheetBody>{detailsBody}</SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  )
}
