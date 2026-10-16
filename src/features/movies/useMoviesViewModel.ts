import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCatalogRefresh } from '@/shared/hooks/useCatalogRefresh'
import { categoryRepository } from '@/services/catalog/category.service'
import { movieRepository } from '@/services/catalog/movie.service'
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

export function useMoviesViewModel() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const showAdult = usePreferencesStore((state) => state.preferences.showAdultCategories)
  const selectedCategories = usePreferencesStore((state) => state.selectedCategories)
  const setSelectedCategory = usePreferencesStore((state) => state.setSelectedCategory)
  const favorites = usePreferencesStore((state) => state.favorites)
  const toggleFavorite = usePreferencesStore((state) => state.toggleFavorite)

  const [search, setSearch] = useState('')
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null)
  const deepLinkApplied = useRef<string | null>(null)
  const deepLinkId = searchParams.get('id')
  const rawCategoryId = selectedCategories.movie ?? 'all'
  const { refresh, isRefreshing, error: refreshError } = useCatalogRefresh('movies')

  const categoriesQuery = useQuery({
    queryKey: catalogQueryKeys.movieCategories,
    queryFn: ({ signal }) => {
      ensureSessionOrThrow()
      return categoryRepository.list('movie', signal)
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

  const filtered = useMemo(() => {
    const term = search.trim()
    let list = moviesQuery.data ?? []
    // Com busca ativa, pesquisa em todas as categorias.
    if (!term && categoryId !== 'all') {
      list = list.filter((movie) => movie.categoryIds.includes(categoryId))
    }
    const safe = filterAdultContent(list, showAdult, adultCategoryIds)
    if (!term) return safe
    return safe.filter((movie) => matchesSearch(movie.name, term))
  }, [moviesQuery.data, categoryId, search, showAdult, adultCategoryIds])

  // Mantém o título escolhido (busca global) no topo e visível na grade.
  const movies = useMemo(() => {
    if (!selectedMovieId) return filtered
    const inFiltered = filtered.find((movie) => movie.id === selectedMovieId)
    if (inFiltered) {
      return [inFiltered, ...filtered.filter((movie) => movie.id !== selectedMovieId)]
    }
    const fromCatalog = (moviesQuery.data ?? []).find((movie) => movie.id === selectedMovieId)
    return fromCatalog ? [fromCatalog, ...filtered] : filtered
  }, [filtered, selectedMovieId, moviesQuery.data])

  const detailsQuery = useQuery({
    queryKey: ['movies', 'details', selectedMovieId],
    queryFn: ({ signal }) => {
      ensureSessionOrThrow()
      return movieRepository.getDetails(selectedMovieId!, signal)
    },
    enabled: isAuthenticated && Boolean(selectedMovieId),
  })

  const pendingIntent = useNavigationIntentStore((state) => state.intent)

  useEffect(() => {
    const intent = useNavigationIntentStore.getState().consume('movie')
    const targetId = intent?.movieId ?? deepLinkId
    if (!targetId) return
    if (!intent && deepLinkApplied.current === targetId) return
    deepLinkApplied.current = targetId
    setSearch('')
    if (selectedCategories.movie && selectedCategories.movie !== 'all') {
      setSelectedCategory('movie', 'all')
    }
    setSelectedMovieId(targetId)
    if (deepLinkId) {
      setSearchParams({}, { replace: true })
    }
  }, [deepLinkId, pendingIntent, selectedCategories.movie, setSelectedCategory, setSearchParams])

  return {
    search,
    setSearch,
    categoryId,
    setCategoryId: (id: string) => {
      setSelectedCategory('movie', id)
      setSelectedMovieId(null)
    },
    categories,
    movies,
    selectedMovieId,
    setSelectedMovieId: (id: string | null) => setSelectedMovieId(id),
    details: detailsQuery.data ?? null,
    detailsLoading: detailsQuery.isLoading,
    isFavorite: (id: string) => favorites.movies.some((item) => item.id === id),
    toggleFavorite: (movie: { id: string; name: string; posterUrl?: string }) =>
      toggleFavorite('movies', {
        id: movie.id,
        title: movie.name,
        posterUrl: movie.posterUrl,
      }),
    playMovie: (movieId: string, extension?: string) => {
      const params = new URLSearchParams({ type: 'movie', id: movieId })
      if (extension) params.set('ext', extension)
      navigate(`/player?${params.toString()}`)
    },
    isLoading:
      (categoriesQuery.isLoading && !categoriesQuery.data) ||
      (moviesQuery.isLoading && !moviesQuery.data),
    isRefreshing,
    error:
      refreshError ||
      (categoriesQuery.error || moviesQuery.error
        ? safeErrorMessage(categoriesQuery.error || moviesQuery.error)
        : null),
    refetch: () => void refresh(),
  }
}
