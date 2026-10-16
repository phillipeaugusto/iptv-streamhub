import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, SkipForward } from 'lucide-react'
import { EmptyState } from '@/shared/components/feedback/EmptyState'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { Button } from '@/shared/components/ui/Button'
import { VideoPlayer } from '@/shared/components/player/VideoPlayer'
import { playbackAllowedOrigin } from '@/shared/utils/iptvProxy'
import { usePlayerViewModel } from './usePlayerViewModel'
import styles from './PlayerView.module.css'

export function PlayerView() {
  const navigate = useNavigate()
  const vm = usePlayerViewModel()

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    if (vm.type === 'movie') navigate('/movies')
    else if (vm.type === 'episode') navigate(vm.seriesId ? `/series?id=${vm.seriesId}` : '/series')
    else if (vm.type === 'live') navigate('/live')
    else navigate('/')
  }

  const goNextEpisode = () => {
    if (!vm.nextEpisodeId || !vm.seriesId) return
    const params = new URLSearchParams({
      type: 'episode',
      id: vm.nextEpisodeId,
      seriesId: vm.seriesId,
    })
    if (vm.nextEpisodeExt) params.set('ext', vm.nextEpisodeExt)
    navigate(`/player?${params.toString()}`, { replace: true })
  }

  if (!vm.type || !vm.id) {
    return (
      <div className={styles.theater}>
        <EmptyState
          title="Nada para reproduzir"
          description="Abra um canal, filme ou episódio a partir do catálogo."
          action={
            <Button asChild>
              <Link to="/">Voltar ao início</Link>
            </Button>
          }
        />
      </div>
    )
  }

  if (vm.isLoading || !vm.playback || !vm.serverUrl) {
    return (
      <div className={styles.theater}>
        <Skeleton className={styles.loading} />
      </div>
    )
  }

  return (
    <div className={styles.theater}>
      <VideoPlayer
        key={vm.playback.url}
        url={vm.playback.url}
        allowedOrigin={playbackAllowedOrigin(vm.serverUrl)}
        title={vm.playback.title}
        startPosition={vm.startPosition}
        layout="theater"
        topBar={
          <>
            <Button variant="secondary" size="sm" onClick={goBack}>
              <ArrowLeft size={16} /> Voltar
            </Button>
            {vm.nextEpisodeId && vm.seriesId ? (
              <Button variant="secondary" size="sm" onClick={goNextEpisode}>
                Próximo episódio <SkipForward size={16} />
              </Button>
            ) : null}
          </>
        }
        onProgress={(position, duration) => vm.saveProgress(position, duration)}
        onEnded={() => {
          if (vm.nextEpisodeId) goNextEpisode()
        }}
      />
    </div>
  )
}
