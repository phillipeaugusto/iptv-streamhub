import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { channelRepository } from '@/services/catalog/channel.service'
import { movieRepository } from '@/services/catalog/movie.service'
import { seriesRepository } from '@/services/catalog/series.service'
import { useAuthStore } from '@/core/store/authStore'
import { usePreferencesStore } from '@/core/store/preferencesStore'
import { ensureSessionOrThrow } from '@/core/auth/session'

export function usePlayerViewModel() {
  const [params] = useSearchParams()
  const type = params.get('type')
  const id = params.get('id')
  const seriesId = params.get('seriesId')
  const extension = params.get('ext') ?? undefined
  const serverUrl = useAuthStore((state) => state.serverUrl)
  const addHistory = usePreferencesStore((state) => state.addHistory)
  const upsertProgress = usePreferencesStore((state) => state.upsertProgress)
  const removeProgress = usePreferencesStore((state) => state.removeProgress)
  const progressList = usePreferencesStore((state) => state.progress)
  const lastSavedRef = useRef({ key: '', position: -1 })

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  const movieQuery = useQuery({
    queryKey: ['player', 'movie', id],
    queryFn: ({ signal }) => {
      ensureSessionOrThrow()
      return movieRepository.getDetails(id!, signal)
    },
    enabled: isAuthenticated && type === 'movie' && Boolean(id),
  })

  const seriesQuery = useQuery({
    queryKey: ['player', 'series', seriesId],
    queryFn: ({ signal }) => {
      ensureSessionOrThrow()
      return seriesRepository.getDetails(seriesId!, signal)
    },
    enabled: isAuthenticated && type === 'episode' && Boolean(seriesId),
  })

  const nextEpisode = useMemo(() => {
    if (type !== 'episode' || !id) return null
    return findNextEpisode(seriesQuery.data, id)
  }, [type, id, seriesQuery.data])

  const playback = useMemo(() => {
    if (!id || !serverUrl) return null
    try {
      ensureSessionOrThrow()
    } catch {
      return null
    }

    if (type === 'live') {
      return {
        url: channelRepository.getPlaybackUrl(id, 'm3u8'),
        title: `Canal ${id}`,
        kind: 'live' as const,
        posterUrl: undefined as string | undefined,
      }
    }

    if (type === 'movie') {
      const details = movieQuery.data
      return {
        url: movieRepository.getPlaybackUrl(id, extension || details?.containerExtension || 'mp4'),
        title: details?.name ?? `Filme ${id}`,
        kind: 'movie' as const,
        posterUrl: details?.posterUrl,
        movieId: id,
      }
    }

    if (type === 'episode' && seriesId) {
      const details = seriesQuery.data
      const episode = details?.seasons
        .flatMap((season) => season.episodes)
        .find((item) => item.id === id)
      return {
        url: seriesRepository.getPlaybackUrl(id, extension || episode?.containerExtension || 'mp4'),
        title: episode?.title ?? `Episódio ${id}`,
        kind: 'episode' as const,
        posterUrl: episode?.coverUrl ?? details?.posterUrl,
        seriesId,
        episodeId: id,
      }
    }

    return null
  }, [type, id, seriesId, extension, serverUrl, movieQuery.data, seriesQuery.data])

  const progressKey =
    type === 'movie' && id
      ? `movie:${id}`
      : type === 'episode' && id
        ? `episode:${id}`
        : null

  const savedProgress = progressKey
    ? progressList.find((item) => item.id === progressKey)
    : undefined

  /** Posição inicial fixa por mídia — evita remount ao atualizar progresso. */
  const initialStartRef = useRef<{ key: string; position?: number }>({ key: '' })
  if (progressKey && initialStartRef.current.key !== progressKey) {
    initialStartRef.current = {
      key: progressKey,
      position: savedProgress?.positionSeconds,
    }
  }

  const markHistory = useCallback(() => {
    if (!playback || !id) return
    addHistory({
      id: `${playback.kind}:${id}`,
      kind: playback.kind === 'live' ? 'live' : playback.kind === 'movie' ? 'movie' : 'episode',
      title: playback.title,
      posterUrl: playback.posterUrl,
      channelId: type === 'live' ? id : undefined,
      movieId: type === 'movie' ? id : undefined,
      seriesId: seriesId ?? undefined,
      episodeId: type === 'episode' ? id : undefined,
      watchedAt: new Date().toISOString(),
    })
  }, [playback, id, type, seriesId, addHistory])

  // Marca histórico quando a URL de playback muda (evita eslint-disable na View).
  useEffect(() => {
    if (!playback?.url) return
    markHistory()
  }, [playback?.url, markHistory])

  const saveProgress = useCallback(
    (positionSeconds: number, durationSeconds: number) => {
      if (!playback || playback.kind === 'live' || !id || !progressKey) return
      if (!durationSeconds || positionSeconds < 5) return

      if (durationSeconds > 0 && positionSeconds / durationSeconds >= 0.95) {
        removeProgress(progressKey)
        return
      }

      const last = lastSavedRef.current
      if (last.key === progressKey && Math.abs(last.position - positionSeconds) < 4) return
      lastSavedRef.current = { key: progressKey, position: positionSeconds }

      upsertProgress({
        id: progressKey,
        kind: playback.kind,
        positionSeconds,
        durationSeconds,
        updatedAt: new Date().toISOString(),
        title: playback.title,
        posterUrl: playback.posterUrl,
        movieId: playback.movieId,
        seriesId: playback.seriesId,
        episodeId: playback.episodeId,
      })
    },
    [playback, id, progressKey, upsertProgress, removeProgress],
  )

  return {
    type,
    id,
    seriesId,
    serverUrl,
    playback,
    startPosition: initialStartRef.current.key === progressKey ? initialStartRef.current.position : undefined,
    isLoading: movieQuery.isLoading || seriesQuery.isLoading,
    saveProgress,
    nextEpisodeId: nextEpisode?.id ?? null,
    nextEpisodeExt: nextEpisode?.containerExtension,
  }
}

function findNextEpisode(
  details: Awaited<ReturnType<typeof seriesRepository.getDetails>> | undefined,
  episodeId: string,
): { id: string; containerExtension?: string } | null {
  if (!details) return null
  const all = details.seasons
    .slice()
    .sort((a, b) => a.seasonNumber - b.seasonNumber)
    .flatMap((season) =>
      season.episodes.slice().sort((a, b) => a.episodeNumber - b.episodeNumber),
    )
  const index = all.findIndex((episode) => episode.id === episodeId)
  if (index < 0 || index >= all.length - 1) return null
  const next = all[index + 1]
  if (!next) return null
  return { id: next.id, containerExtension: next.containerExtension }
}
