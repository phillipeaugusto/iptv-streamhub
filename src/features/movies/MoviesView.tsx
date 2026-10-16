import { useEffect, useRef } from 'react'
import { Play, RefreshCw } from 'lucide-react'
import { EmptyState } from '@/shared/components/feedback/EmptyState'
import { ErrorState } from '@/shared/components/feedback/ErrorState'
import { PosterSkeletonGrid } from '@/shared/components/feedback/Skeleton'
import { CatalogPager } from '@/shared/components/media/CatalogPager'
import { CategoryChips } from '@/shared/components/media/CategoryChips'
import { ContentCard } from '@/shared/components/media/ContentCard'
import { SearchBar } from '@/shared/components/media/SearchBar'
import { Button } from '@/shared/components/ui/Button'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { Sheet, SheetBody, SheetContent, SheetHeader } from '@/shared/components/ui/Sheet'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { usePagedList } from '@/shared/hooks/usePagedList'
import { useMoviesViewModel } from './useMoviesViewModel'
import styles from '@/shared/theme/views.module.css'

export function MoviesView() {
  const vm = useMoviesViewModel()
  const isMobile = useIsMobile()
  const pagedMovies = usePagedList(vm.movies, isMobile ? 24 : 48)
  const sheetOpen = isMobile && Boolean(vm.selectedMovieId)
  const detailsRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!vm.selectedMovieId || isMobile) return
    const frame = requestAnimationFrame(() => {
      detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
    return () => cancelAnimationFrame(frame)
  }, [vm.selectedMovieId, isMobile])

  const detailsBody = !vm.selectedMovieId ? (
    <EmptyState title="Detalhes" description="Selecione um filme para ver metadados." />
  ) : vm.detailsLoading ? (
    <div style={{ display: 'grid', gap: '0.65rem' }}>
      <Skeleton style={{ height: 28, width: '70%' }} />
      <Skeleton style={{ height: 80 }} />
    </div>
  ) : vm.details ? (
    <div className={styles.details}>
      <h2 style={{ fontSize: 'var(--text-xl)' }}>{vm.details.name}</h2>
      <p className={styles.detailsMeta}>
        {[vm.details.year, vm.details.genre, vm.details.rating].filter(Boolean).join(' • ')}
      </p>
      {vm.details.plot ? <p>{vm.details.plot}</p> : null}
      {vm.details.cast ? <p className={styles.detailsMeta}>Elenco: {vm.details.cast}</p> : null}
      {vm.details.director ? (
        <p className={styles.detailsMeta}>Direção: {vm.details.director}</p>
      ) : null}
      <Button
        onClick={() => {
          const details = vm.details
          if (!details) return
          vm.playMovie(details.id, details.containerExtension)
        }}
      >
        <Play size={16} /> Assistir
      </Button>
    </div>
  ) : (
    <EmptyState
      title="Sem detalhes"
      description="O servidor não retornou metadados para este título."
    />
  )

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <SearchBar value={vm.search} onChange={vm.setSearch} placeholder="Buscar filme…" />
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
              {vm.movies.length === 0 ? (
                <EmptyState
                  title="Nenhum filme encontrado"
                  description="Tente outra categoria ou busca."
                />
              ) : (
                <div key={vm.categoryId}>
                  <div className={styles.grid}>
                    {pagedMovies.visible.map((movie) => (
                      <ContentCard
                        key={movie.id}
                        title={movie.name}
                        imageUrl={movie.posterUrl}
                        subtitle={movie.year}
                        badge={vm.selectedMovieId === movie.id ? 'Selecionado' : undefined}
                        selected={vm.selectedMovieId === movie.id}
                        isFavorite={vm.isFavorite(movie.id)}
                        onToggleFavorite={() => vm.toggleFavorite(movie)}
                        onClick={() => vm.setSelectedMovieId(movie.id)}
                      />
                    ))}
                  </div>
                  <CatalogPager
                    shown={pagedMovies.shown}
                    total={pagedMovies.total}
                    hasMore={pagedMovies.hasMore}
                    onLoadMore={pagedMovies.loadMore}
                  />
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
          if (!open) vm.setSelectedMovieId(null)
        }}
      >
        <SheetContent side="bottom">
          <SheetHeader title={vm.details?.name ?? 'Filme'} />
          <SheetBody>{detailsBody}</SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  )
}
