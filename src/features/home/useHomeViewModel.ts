import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useCatalogRefresh } from '@/shared/hooks/useCatalogRefresh'
import { categoryRepository } from '@/services/catalog/category.service'
import { channelRepository } from '@/services/catalog/channel.service'
import { movieRepository } from '@/services/catalog/movie.service'
import { seriesRepository } from '@/services/catalog/series.service'
import {
  CATALOG_GC_TIME,
  CATALOG_STALE_TIME,
  catalogQueryKeys,
} from '@/services/catalog/catalogQueryKeys'
import { useAuthStore } from '@/core/store/authStore'
import { usePreferencesStore } from '@/core/store/preferencesStore'
import {
  filterAdultContent,
  getAdultCategoryIds,
  isAdultLabel,
} from '@/shared/utils/adultContent'
import { ensureSessionOrThrow } from '@/core/auth/session'
import { safeErrorMessage } from '@/shared/utils/safeLog'

export function useHomeViewModel() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const account = useAuthStore((state) => state.account)
  const showAdult = usePreferencesStore((state) => state.preferences.showAdultCategories)
  const history = usePreferencesStore((state) => state.history)
  const progress = usePreferencesStore((state) => state.progress)
  const favorites = usePreferencesStore((state) => state.favorites)
  const { refresh, isRefreshing, error: refreshError } = useCatalogRefresh('all')

  const liveCatsQuery = useQuery({
    queryKey: catalogQueryKeys.liveCategories,
    queryFn: ({ signal }) => {
      ensureSessionOrThrow()
      return categoryRepository.list('live', signal)
    },
    enabled: isAuthenticated,
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
  })

  const movieCatsQuery = useQuery({
    queryKey: catalogQueryKeys.movieCategories,
    queryFn: ({ signal }) => {
      ensureSessionOrThrow()
      return categoryRepository.list('movie', signal)
    },
    enabled: isAuthenticated,
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
  })

  const seriesCatsQuery = useQuery({
    queryKey: catalogQueryKeys.seriesCategories,
    queryFn: ({ signal }) => {
      ensureSessionOrThrow()
      return categoryRepository.list('series', signal)
    },
    enabled: isAuthenticated,
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
  })

  const adultLiveIds = useMemo(
    () => getAdultCategoryIds(liveCatsQuery.data ?? []),
    [liveCatsQuery.data],
  )
  const adultMovieIds = useMemo(
    () => getAdultCategoryIds(movieCatsQuery.data ?? []),
    [movieCatsQuery.data],
  )
  const adultSeriesIds = useMemo(
    () => getAdultCategoryIds(seriesCatsQuery.data ?? []),
    [seriesCatsQuery.data],
  )

  const liveQuery = useQuery({
    queryKey: catalogQueryKeys.liveChannels,
    queryFn: ({ signal }) => {
      ensureSessionOrThrow()
      return channelRepository.list(undefined, signal)
    },
    enabled: isAuthenticated,
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
  })

  const moviesQuery = useQuery({
    queryKey: catalogQueryKeys.movies,
    queryFn: ({ signal }) => {
      ensureSessionOrThrow()
      return movieRepository.list(undefined, signal)
    },
    enabled: isAuthenticated,
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
  })

  const seriesQuery = useQuery({
    queryKey: catalogQueryKeys.series,
    queryFn: ({ signal }) => {
      ensureSessionOrThrow()
      return seriesRepository.list(undefined, signal)
    },
    enabled: isAuthenticated,
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
  })

  const safeHistory = useMemo(
    () => history.filter((item) => !isAdultLabel(item.title)).slice(0, 12),
    [history],
  )

  const continueWatching = useMemo(
    () =>
      progress
        .filter((item) => !isAdultLabel(item.title))
        .filter(
          (item) =>
            item.durationSeconds > 0 && item.positionSeconds / item.durationSeconds < 0.95,
        )
        .slice(0, 12),
    [progress],
  )

  return {
    account,
    history: safeHistory,
    continueWatching,
    favoriteCounts: {
      channels: favorites.channels.length,
      movies: favorites.movies.length,
      series: favorites.series.length,
    },
    livePreview: filterAdultContent(liveQuery.data ?? [], showAdult, adultLiveIds).slice(0, 12),
    moviesPreview: filterAdultContent(moviesQuery.data ?? [], showAdult, adultMovieIds).slice(
      0,
      12,
    ),
    seriesPreview: filterAdultContent(seriesQuery.data ?? [], showAdult, adultSeriesIds).slice(
      0,
      12,
    ),
    isLoading:
      (liveQuery.isLoading && !liveQuery.data) ||
      (moviesQuery.isLoading && !moviesQuery.data) ||
      (seriesQuery.isLoading && !seriesQuery.data),
    isRefreshing,
    error:
      refreshError ||
      (liveQuery.error || moviesQuery.error || seriesQuery.error
        ? safeErrorMessage(liveQuery.error || moviesQuery.error || seriesQuery.error)
        : null),
    refetch: () => void refresh(),
  }
}
