import { Link, useNavigate } from 'react-router-dom'
import { Heart, Play, Tv } from 'lucide-react'
import { ErrorState } from '@/shared/components/feedback/ErrorState'
import { PosterSkeletonGrid } from '@/shared/components/feedback/Skeleton'
import { ContentCard } from '@/shared/components/media/ContentCard'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { useHomeViewModel } from './useHomeViewModel'
import { usePreferencesStore } from '@/core/store/preferencesStore'
import styles from '@/shared/theme/views.module.css'

export function HomeView() {
  const navigate = useNavigate()
  const vm = useHomeViewModel()
  const favorites = usePreferencesStore((state) => state.favorites)
  const toggleFavorite = usePreferencesStore((state) => state.toggleFavorite)
  const isFavorite = (kind: 'movies' | 'series' | 'channels', id: string) =>
    favorites[kind].some((item) => item.id === id)

  const featured = vm.moviesPreview[0] ?? vm.seriesPreview[0] ?? null
  const featuredKind = vm.moviesPreview[0] ? 'movie' : vm.seriesPreview[0] ? 'series' : null

  return (
    <div className={styles.page}>
      {vm.error ? <ErrorState message={vm.error} onRetry={vm.refetch} /> : null}

      <section className={styles.hero} aria-label="Destaque">
        {featured?.backdropUrl || featured?.posterUrl ? (
          <div className={styles.heroMedia}>
            <img src={featured.backdropUrl || featured.posterUrl} alt="" />
          </div>
        ) : (
          <div className={styles.heroFallback} />
        )}
        <div className={styles.heroOverlay}>
          {featured ? <Badge>Destaque</Badge> : <Badge variant="secondary">Bem-vindo</Badge>}
          <h2>{featured?.name ?? 'Sua experiência de streaming'}</h2>
          <p>
            {featured && 'plot' in featured && featured.plot
              ? featured.plot
              : 'Assista TV ao vivo, filmes e séries do seu servidor autorizado com uma interface pensada para celular e desktop.'}
          </p>
          <div className={styles.heroActions}>
            {featured && featuredKind === 'movie' ? (
              <Button onClick={() => navigate(`/player?type=movie&id=${featured.id}`)}>
                <Play size={16} /> Assistir agora
              </Button>
            ) : featured && featuredKind === 'series' ? (
              <Button onClick={() => navigate(`/series?id=${featured.id}`)}>
                <Play size={16} /> Ver série
              </Button>
            ) : (
              <Button onClick={() => navigate('/live')}>
                <Tv size={16} /> Abrir TV ao vivo
              </Button>
            )}
            {featured ? (
              <Button
                variant="secondary"
                onClick={() =>
                  toggleFavorite(featuredKind === 'movie' ? 'movies' : 'series', {
                    id: featured.id,
                    title: featured.name,
                    posterUrl: featured.posterUrl,
                  })
                }
              >
                <Heart
                  size={16}
                  fill={
                    isFavorite(featuredKind === 'movie' ? 'movies' : 'series', featured.id)
                      ? 'currentColor'
                      : 'none'
                  }
                />
                Favoritar
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => navigate('/movies')}>
                Explorar filmes
              </Button>
            )}
          </div>
        </div>
      </section>

      {vm.continueWatching.length > 0 ? (
        <section className={styles.section}>
          <div className={styles.sectionTitle}>
            <h2>Continuar assistindo</h2>
            <Link to="/continue">Ver tudo</Link>
          </div>
          <div className={styles.rail}>
            {vm.continueWatching.map((item) => (
              <ContentCard
                key={item.id}
                title={item.title}
                imageUrl={item.posterUrl}
                subtitle={`${Math.round((item.positionSeconds / item.durationSeconds) * 100)}%`}
                progress={(item.positionSeconds / item.durationSeconds) * 100}
                aspect="poster"
                onClick={() => {
                  if (item.kind === 'movie' && item.movieId) {
                    navigate(`/player?type=movie&id=${item.movieId}`)
                  } else if (item.kind === 'episode' && item.episodeId) {
                    navigate(
                      `/player?type=episode&id=${item.episodeId}&seriesId=${item.seriesId ?? ''}`,
                    )
                  }
                }}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.section}>
        <div className={styles.sectionTitle}>
          <h2>TV ao vivo</h2>
          <Link to="/live">Ver tudo</Link>
        </div>
        {vm.isLoading ? (
          <PosterSkeletonGrid count={6} />
        ) : (
          <div className={styles.rail}>
            {vm.livePreview.map((channel) => (
              <ContentCard
                key={channel.id}
                title={channel.name}
                imageUrl={channel.logoUrl}
                aspect="square"
                onClick={() => navigate(`/live?channel=${channel.id}`)}
              />
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>
          <h2>Filmes</h2>
          <Link to="/movies">Ver tudo</Link>
        </div>
        {vm.isLoading ? (
          <PosterSkeletonGrid count={6} />
        ) : (
          <div className={styles.grid}>
            {vm.moviesPreview.map((movie) => (
              <ContentCard
                key={movie.id}
                title={movie.name}
                imageUrl={movie.posterUrl}
                subtitle={movie.year}
                isFavorite={isFavorite('movies', movie.id)}
                onToggleFavorite={() =>
                  toggleFavorite('movies', {
                    id: movie.id,
                    title: movie.name,
                    posterUrl: movie.posterUrl,
                  })
                }
                onClick={() => navigate(`/movies?id=${movie.id}`)}
              />
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>
          <h2>Séries</h2>
          <Link to="/series">Ver tudo</Link>
        </div>
        {vm.isLoading ? (
          <PosterSkeletonGrid count={6} />
        ) : (
          <div className={styles.grid}>
            {vm.seriesPreview.map((item) => (
              <ContentCard
                key={item.id}
                title={item.name}
                imageUrl={item.posterUrl}
                isFavorite={isFavorite('series', item.id)}
                onToggleFavorite={() =>
                  toggleFavorite('series', {
                    id: item.id,
                    title: item.name,
                    posterUrl: item.posterUrl,
                  })
                }
                onClick={() => navigate(`/series?id=${item.id}`)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
