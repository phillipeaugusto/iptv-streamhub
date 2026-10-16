import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCatalogRefresh } from '@/shared/hooks/useCatalogRefresh'
import { categoryRepository } from '@/services/catalog/category.service'
import { seriesRepository } from '@/services/catalog/series.service'
import {
  CATALOG_GC_TIME,
  CATALOG_STALE_TIME,
  catalogQueryKeys,
} from '@/services/catalog/catalogQueryKeys'
import { useAuthStore } from '@/core/store/authStore'
import { useNavigationIntentStore } from '@/core/store/navigationIntentStore'
import { usePreferencesStore } from '@/core/store/preferencesStore'
import {
  filterAdultCategories,
  filterAdultContent,
  getAdultCategoryIds,
} from '@/shared/utils/adultContent'
import { ensureSessionOrThrow } from '@/core/auth/session'
import { safeErrorMessage } from '@/shared/utils/safeLog'
import { matchesSearch } from '@/shared/utils/search'

export function useSeriesViewModel() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const showAdult = usePreferencesStore((state) => state.preferences.showAdultCategories)
  const selectedCategories = usePreferencesStore((state) => state.selectedCategories)
  const setSelectedCategory = usePreferencesStore((state) => state.setSelectedCategory)
  const favorites = usePreferencesStore((state) => state.favorites)
  const toggleFavorite = usePreferencesStore((state) => state.toggleFavorite)

  const [search, setSearch] = useState('')
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null)
  const [seasonNumber, setSeasonNumber] = useState<number | null>(null)
  const deepLinkApplied = useRef<string | null>(null)
  const deepLinkId = searchParams.get('id')
  const rawCategoryId = selectedCategories.series ?? 'all'
  const { refresh, isRefreshing, error: refreshError } = useCatalogRefresh('series')

  const categoriesQuery = useQuery({
    queryKey: catalogQueryKeys.seriesCategories,
    queryFn: ({ signal }) => {
      ensureSessionOrThrow()
      return categoryRepository.list('series', signal)
    },
    enabled: isAuthenticated,
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
  })

  const categories = useMemo(
    () => filterAdultCategories(categoriesQuery.data ?? [], showAdult),
    [categoriesQuery.data, showAdult],
  )

  const adultCategoryIds = useMemo(
    () => getAdultCategoryIds(categoriesQuery.data ?? []),
    [categoriesQuery.data],
  )

  const categoryId =
    rawCategoryId !== 'all' && !categories.some((category) => category.id === rawCategoryId)
      ? 'all'
      : rawCategoryId

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

  const filtered = useMemo(() => {
    const term = search.trim()
    let list = seriesQuery.data ?? []
    // Com busca ativa, pesquisa em todas as categorias.
    if (!term && categoryId !== 'all') {
      list = list.filter((item) => item.categoryIds.includes(categoryId))
    }
    const safe = filterAdultContent(list, showAdult, adultCategoryIds)
    if (!term) return safe
    return safe.filter((item) => matchesSearch(item.name, term))
  }, [seriesQuery.data, categoryId, search, showAdult, adultCategoryIds])

  // Mantém a série escolhida (busca global) no topo e visível na grade.
  const series = useMemo(() => {
    if (!selectedSeriesId) return filtered
    const inFiltered = filtered.find((item) => item.id === selectedSeriesId)
    if (inFiltered) {
      return [inFiltered, ...filtered.filter((item) => item.id !== selectedSeriesId)]
    }
    const fromCatalog = (seriesQuery.data ?? []).find((item) => item.id === selectedSeriesId)
    return fromCatalog ? [fromCatalog, ...filtered] : filtered
  }, [filtered, selectedSeriesId, seriesQuery.data])

  const detailsQuery = useQuery({
    queryKey: ['series', 'details', selectedSeriesId],
    queryFn: ({ signal }) => {
      ensureSessionOrThrow()
      return seriesRepository.getDetails(selectedSeriesId!, signal)
    },
    enabled: isAuthenticated && Boolean(selectedSeriesId),
  })

  const seasons = detailsQuery.data?.seasons ?? []
  const activeSeason =
    seasons.find((season) => season.seasonNumber === seasonNumber) ?? seasons[0] ?? null

  const pendingIntent = useNavigationIntentStore((state) => state.intent)

  useEffect(() => {
    const intent = useNavigationIntentStore.getState().consume('series')
    const targetId = intent?.seriesId ?? deepLinkId
    if (!targetId) return
    // Permite reaplicar o mesmo id vindo de uma nova busca.
    if (!intent && deepLinkApplied.current === targetId) return
    deepLinkApplied.current = targetId
    setSearch('')
    if (selectedCategories.series && selectedCategories.series !== 'all') {
      setSelectedCategory('series', 'all')
    }
    setSelectedSeriesId(targetId)
    setSeasonNumber(null)
    if (deepLinkId) {
      setSearchParams({}, { replace: true })
    }
  }, [deepLinkId, pendingIntent, selectedCategories.series, setSelectedCategory, setSearchParams])

  return {
    search,
    setSearch,
    categoryId,
    setCategoryId: (id: string) => {
      setSelectedCategory('series', id)
      setSelectedSeriesId(null)
      setSeasonNumber(null)
    },
    categories,
    series,
    selectedSeriesId,
    selectSeries: (id: string) => {
      setSelectedSeriesId(id)
      setSeasonNumber(null)
    },
    clearSelection: () => {
      setSelectedSeriesId(null)
      setSeasonNumber(null)
    },
    details: detailsQuery.data ?? null,
    detailsLoading: detailsQuery.isLoading,
    activeSeason,
    setSeasonNumber,
    seasons,
    isFavorite: (id: string) => favorites.series.some((item) => item.id === id),
    toggleFavorite: (item: { id: string; name: string; posterUrl?: string }) =>
      toggleFavorite('series', {
        id: item.id,
        title: item.name,
        posterUrl: item.posterUrl,
      }),
    playEpisode: (seriesId: string, episodeId: string, extension?: string) => {
      const params = new URLSearchParams({
        type: 'episode',
        id: episodeId,
        seriesId,
      })
      if (extension) params.set('ext', extension)
      navigate(`/player?${params.toString()}`)
    },
    isLoading:
      (categoriesQuery.isLoading && !categoriesQuery.data) ||
      (seriesQuery.isLoading && !seriesQuery.data),
    isRefreshing,
    error:
      refreshError ||
      (categoriesQuery.error || seriesQuery.error
        ? safeErrorMessage(categoriesQuery.error || seriesQuery.error)
        : null),
    refetch: () => void refresh(),
  }
}
