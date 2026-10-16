export interface StoredCredentials {
  serverUrl: string
  username: string
  password?: string
  rememberCredentials: boolean
}

export interface UiPreferences {
  theme: 'dark'
  language: 'pt-BR'
  compactMode: boolean
  showAdultCategories: boolean
  sidebarCollapsed: boolean
}

export interface FavoriteItem {
  id: string
  title: string
  posterUrl?: string
}

export interface FavoritesState {
  channels: FavoriteItem[]
  movies: FavoriteItem[]
  series: FavoriteItem[]
}

export interface HistoryItem {
  id: string
  kind: 'live' | 'movie' | 'episode'
  title: string
  posterUrl?: string
  channelId?: string
  movieId?: string
  seriesId?: string
  episodeId?: string
  watchedAt: string
}

export interface PlaybackProgress {
  id: string
  kind: 'movie' | 'episode'
  positionSeconds: number
  durationSeconds: number
  updatedAt: string
  title: string
  posterUrl?: string
  movieId?: string
  seriesId?: string
  episodeId?: string
}

export interface SelectedCategories {
  live?: string
  movie?: string
  series?: string
}

export interface PlayerPreferences {
  volume: number
  muted: boolean
  autoplay: boolean
  preferredQuality: 'auto' | string
}

export interface StorageMeta {
  version: number
  updatedAt: string
}

export const DEFAULT_UI_PREFERENCES: UiPreferences = {
  theme: 'dark',
  language: 'pt-BR',
  compactMode: false,
  showAdultCategories: false,
  sidebarCollapsed: false,
}

export const DEFAULT_FAVORITES: FavoritesState = {
  channels: [],
  movies: [],
  series: [],
}

export const DEFAULT_PLAYER_PREFERENCES: PlayerPreferences = {
  volume: 0.8,
  muted: false,
  autoplay: true,
  preferredQuality: 'auto',
}
