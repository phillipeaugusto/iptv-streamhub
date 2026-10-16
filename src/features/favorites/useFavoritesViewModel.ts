import { usePreferencesStore } from '@/core/store/preferencesStore'

export function useFavoritesViewModel() {
  const favorites = usePreferencesStore((state) => state.favorites)
  const toggleFavorite = usePreferencesStore((state) => state.toggleFavorite)

  return {
    channels: favorites.channels,
    movies: favorites.movies,
    series: favorites.series,
    toggleFavorite,
    isLoading: false,
  }
}
