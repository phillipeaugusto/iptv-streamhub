import { useNavigate } from 'react-router-dom'
import { EmptyState } from '@/shared/components/feedback/EmptyState'
import { ContentCard } from '@/shared/components/media/ContentCard'
import { useFavoritesViewModel } from './useFavoritesViewModel'
import styles from '@/shared/theme/views.module.css'

export function FavoritesView() {
  const navigate = useNavigate()
  const vm = useFavoritesViewModel()
  const isEmpty = vm.channels.length + vm.movies.length + vm.series.length === 0

  return (
    <div className={styles.page}>
      {isEmpty ? (
        <EmptyState
          title="Sua lista está vazia"
          description="Marque canais, filmes ou séries com o ícone de coração."
        />
      ) : (
        <>
          {vm.channels.length > 0 ? (
            <section className={styles.section}>
              <h2>Canais</h2>
              <div className={styles.grid}>
                {vm.channels.map((channel) => (
                  <ContentCard
                    key={channel.id}
                    title={channel.title}
                    imageUrl={channel.posterUrl}
                    aspect="square"
                    isFavorite
                    onToggleFavorite={() => vm.toggleFavorite('channels', channel)}
                    onClick={() => navigate(`/live?channel=${channel.id}`)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {vm.movies.length > 0 ? (
            <section className={styles.section}>
              <h2>Filmes</h2>
              <div className={styles.grid}>
                {vm.movies.map((movie) => (
                  <ContentCard
                    key={movie.id}
                    title={movie.title}
                    imageUrl={movie.posterUrl}
                    isFavorite
                    onToggleFavorite={() => vm.toggleFavorite('movies', movie)}
                    onClick={() => navigate(`/movies?id=${movie.id}`)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {vm.series.length > 0 ? (
            <section className={styles.section}>
              <h2>Séries</h2>
              <div className={styles.grid}>
                {vm.series.map((item) => (
                  <ContentCard
                    key={item.id}
                    title={item.title}
                    imageUrl={item.posterUrl}
                    isFavorite
                    onToggleFavorite={() => vm.toggleFavorite('series', item)}
                    onClick={() => navigate(`/series?id=${item.id}`)}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}
