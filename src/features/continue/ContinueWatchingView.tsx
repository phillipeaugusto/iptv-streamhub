import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '@/shared/components/feedback/EmptyState'
import { ContentCard } from '@/shared/components/media/ContentCard'
import { Button } from '@/shared/components/ui/Button'
import { usePreferencesStore } from '@/core/store/preferencesStore'
import { isAdultLabel } from '@/shared/utils/adultContent'
import type { HistoryItem, PlaybackProgress } from '@/services/storage/StorageTypes'
import styles from '@/shared/theme/views.module.css'

function openHistoryItem(navigate: ReturnType<typeof useNavigate>, item: HistoryItem) {
  if (item.kind === 'live' && item.channelId) {
    navigate(`/live?channel=${item.channelId}`)
    return
  }
  if (item.kind === 'movie' && item.movieId) {
    navigate(`/movies?id=${item.movieId}`)
    return
  }
  if (item.kind === 'episode' && item.episodeId && item.seriesId) {
    navigate(`/player?type=episode&id=${item.episodeId}&seriesId=${item.seriesId}`)
    return
  }
  if (item.kind === 'episode' && item.seriesId) {
    navigate(`/series?id=${item.seriesId}`)
  }
}

function openProgressItem(navigate: ReturnType<typeof useNavigate>, item: PlaybackProgress) {
  if (item.kind === 'movie' && item.movieId) {
    navigate(`/player?type=movie&id=${item.movieId}`)
    return
  }
  if (item.kind === 'episode' && item.episodeId && item.seriesId) {
    navigate(`/player?type=episode&id=${item.episodeId}&seriesId=${item.seriesId}`)
  }
}

export function ContinueWatchingView() {
  const navigate = useNavigate()
  const progressRaw = usePreferencesStore((state) => state.progress)
  const removeProgress = usePreferencesStore((state) => state.removeProgress)
  const historyRaw = usePreferencesStore((state) => state.history)
  const progress = useMemo(
    () => progressRaw.filter((item) => !isAdultLabel(item.title)),
    [progressRaw],
  )
  const history = useMemo(
    () => historyRaw.filter((item) => !isAdultLabel(item.title)),
    [historyRaw],
  )

  return (
    <div className={styles.page}>
      <section className={styles.section}>
        <h2>Em andamento</h2>
        {progress.length === 0 ? (
          <EmptyState title="Nada em andamento" />
        ) : (
          <div className={styles.grid}>
            {progress.map((item) => (
              <div key={item.id} style={{ display: 'grid', gap: '0.45rem' }}>
                <ContentCard
                  title={item.title}
                  imageUrl={item.posterUrl}
                  subtitle={`${Math.round((item.positionSeconds / Math.max(item.durationSeconds, 1)) * 100)}%`}
                  progress={(item.positionSeconds / Math.max(item.durationSeconds, 1)) * 100}
                  onClick={() => openProgressItem(navigate, item)}
                />
                <Button variant="ghost" size="sm" onClick={() => removeProgress(item.id)}>
                  Remover progresso
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2>Histórico recente</h2>
        {history.length === 0 ? (
          <EmptyState title="Histórico vazio" />
        ) : (
          <div className={styles.grid}>
            {history.map((item) => (
              <ContentCard
                key={`${item.id}-${item.watchedAt}`}
                title={item.title}
                imageUrl={item.posterUrl}
                subtitle={new Date(item.watchedAt).toLocaleString('pt-BR')}
                aspect={item.kind === 'live' ? 'square' : 'poster'}
                onClick={() => openHistoryItem(navigate, item)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
