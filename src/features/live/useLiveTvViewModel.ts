import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { useCatalogRefresh } from '@/shared/hooks/useCatalogRefresh'
import { categoryRepository } from '@/services/catalog/category.service'
import { channelRepository } from '@/services/catalog/channel.service'
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
  isAdultContent,
} from '@/shared/utils/adultContent'
import { ensureSessionOrThrow } from '@/core/auth/session'
import { safeErrorMessage } from '@/shared/utils/safeLog'
import { matchesSearch } from '@/shared/utils/search'

export function useLiveTvViewModel() {
  const [searchParams, setSearchParams] = useSearchParams()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const serverUrl = useAuthStore((state) => state.serverUrl)
  const showAdult = usePreferencesStore((state) => state.preferences.showAdultCategories)
  const selectedCategories = usePreferencesStore((state) => state.selectedCategories)
  const setSelectedCategory = usePreferencesStore((state) => state.setSelectedCategory)
  const favorites = usePreferencesStore((state) => state.favorites)
  const toggleFavorite = usePreferencesStore((state) => state.toggleFavorite)
  const addHistory = usePreferencesStore((state) => state.addHistory)

  const [search, setSearch] = useState('')
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const deepLinkApplied = useRef<string | null>(null)
  const deepLinkChannel = searchParams.get('channel')
  const rawCategoryId = selectedCategories.live ?? 'all'
  const { refresh, isRefreshing, error: refreshError } = useCatalogRefresh('live')

  const categoriesQuery = useQuery({
    queryKey: catalogQueryKeys.liveCategories,
    queryFn: ({ signal }) => {
      ensureSessionOrThrow()
      return categoryRepository.list('live', signal)
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

  const channelsQuery = useQuery({
    queryKey: catalogQueryKeys.liveChannels,
    queryFn: ({ signal }) => {
      ensureSessionOrThrow()
      return channelRepository.list(undefined, signal)
    },
    enabled: isAuthenticated,
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
  })

  const filteredChannels = useMemo(() => {
    const term = search.trim()
    let list = channelsQuery.data ?? []
    // Com busca ativa, pesquisa em todas as categorias.
    if (!term && categoryId !== 'all') {
      list = list.filter((channel) => channel.categoryIds.includes(categoryId))
    }
    const safe = filterAdultContent(list, showAdult, adultCategoryIds)
    if (!term) return safe
    return safe.filter((channel) => matchesSearch(channel.name, term))
  }, [channelsQuery.data, categoryId, search, showAdult, adultCategoryIds])

  const pendingIntent = useNavigationIntentStore((state) => state.intent)

  // Deep link / busca global — aplica antes do auto-select.
  useEffect(() => {
    const intent = useNavigationIntentStore.getState().consume('live')
    const targetId = intent?.channelId ?? deepLinkChannel
    if (!targetId) return
    if (!intent && deepLinkApplied.current === targetId) return
    deepLinkApplied.current = targetId
    setSearch('')
    if (selectedCategories.live && selectedCategories.live !== 'all') {
      setSelectedCategory('live', 'all')
    }
    setSelectedChannelId(targetId)
    if (deepLinkChannel) {
      setSearchParams({}, { replace: true })
    }
  }, [deepLinkChannel, pendingIntent, selectedCategories.live, setSelectedCategory, setSearchParams])

  // Se o canal atual sumiu do filtro (categoria/busca), volta ao primeiro da lista.
  useEffect(() => {
    if (!channelsQuery.data) return
    // Não sobrescreve enquanto o deep link ainda não está na lista filtrada.
    const pending =
      deepLinkApplied.current && !String(deepLinkApplied.current).startsWith('done:')
        ? deepLinkApplied.current
        : null
    if (pending) {
      const found = filteredChannels.some((channel) => channel.id === pending)
      if (found) {
        if (selectedChannelId !== pending) setSelectedChannelId(pending)
        deepLinkApplied.current = `done:${pending}`
      }
      return
    }
    if (filteredChannels.length === 0) {
      if (selectedChannelId !== null) setSelectedChannelId(null)
      return
    }
    const stillVisible = filteredChannels.some((channel) => channel.id === selectedChannelId)
    if (!stillVisible) {
      setSelectedChannelId(filteredChannels[0].id)
    }
  }, [filteredChannels, selectedChannelId, channelsQuery.data])

  const selectedChannel =
    filteredChannels.find((channel) => channel.id === selectedChannelId) ??
    (channelsQuery.data ?? []).find((channel) => channel.id === selectedChannelId) ??
    null

  const selectedChannelIdForEpg = selectedChannel?.id

  const epgQuery = useQuery({
    queryKey: ['live', 'epg', selectedChannelIdForEpg],
    queryFn: ({ signal }) => {
      ensureSessionOrThrow()
      if (!selectedChannelIdForEpg) {
        return Promise.resolve([])
      }
      return channelRepository.getEpg(selectedChannelIdForEpg, 12, signal)
    },
    enabled: isAuthenticated && Boolean(selectedChannelIdForEpg),
    staleTime: 60 * 1000,
  })

  let playbackUrl: string | null = null
  if (selectedChannel) {
    try {
      ensureSessionOrThrow()
      playbackUrl = channelRepository.getPlaybackUrl(selectedChannel.id, 'm3u8')
    } catch {
      playbackUrl = null
    }
  }

  const selectChannel = (channelId: string) => {
    setSelectedChannelId(channelId)
    const channel =
      (channelsQuery.data ?? []).find((item) => item.id === channelId) ??
      filteredChannels.find((item) => item.id === channelId)
    if (!channel) return
    if (isAdultContent(channel, adultCategoryIds)) return
    addHistory({
      id: `live:${channel.id}`,
      kind: 'live',
      title: channel.name,
      posterUrl: channel.logoUrl,
      channelId: channel.id,
      watchedAt: new Date().toISOString(),
    })
  }

  useEffect(() => {
    if (!selectedChannelId || !channelsQuery.data?.length) return
    if (deepLinkApplied.current !== `done:${selectedChannelId}`) return
    const channel = channelsQuery.data.find((item) => item.id === selectedChannelId)
    if (!channel || isAdultContent(channel, adultCategoryIds)) return
    addHistory({
      id: `live:${channel.id}`,
      kind: 'live',
      title: channel.name,
      posterUrl: channel.logoUrl,
      channelId: channel.id,
      watchedAt: new Date().toISOString(),
    })
    deepLinkApplied.current = `history:${selectedChannelId}`
  }, [selectedChannelId, channelsQuery.data, adultCategoryIds, addHistory])

  return {
    search,
    setSearch,
    categoryId,
    setCategoryId: (id: string) => {
      setSelectedCategory('live', id)
      // Força o efeito acima a escolher o 1º canal da nova categoria.
      setSelectedChannelId(null)
    },
    categories,
    channels: filteredChannels,
    selectedChannel,
    selectChannel,
    playbackUrl,
    serverUrl,
    epg: epgQuery.data ?? [],
    isFavorite: (id: string) => favorites.channels.some((item) => item.id === id),
    toggleFavorite: (channel: { id: string; name: string; logoUrl?: string }) =>
      toggleFavorite('channels', {
        id: channel.id,
        title: channel.name,
        posterUrl: channel.logoUrl,
      }),
    isLoading:
      (categoriesQuery.isLoading && !categoriesQuery.data) ||
      (channelsQuery.isLoading && !channelsQuery.data),
    isRefreshing,
    error:
      refreshError ||
      (categoriesQuery.error || channelsQuery.error
        ? safeErrorMessage(categoriesQuery.error || channelsQuery.error)
        : null),
    refetch: () => void refresh(),
  }
}
