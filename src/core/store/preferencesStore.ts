import { create } from 'zustand'
import {
  DEFAULT_FAVORITES,
  DEFAULT_PLAYER_PREFERENCES,
  DEFAULT_UI_PREFERENCES,
  type FavoriteItem,
  type FavoritesState,
  type HistoryItem,
  type PlaybackProgress,
  type PlayerPreferences,
  type SelectedCategories,
  type UiPreferences,
} from '@/services/storage/StorageTypes'
import { clearCatalogCache } from '@/services/catalog/refreshCatalog'
import { storageService } from '@/services/storage/StorageService'
import { isAdultLabel, scrubAdultHistoryItems } from '@/shared/utils/adultContent'

export type FavoriteKind = keyof FavoritesState

interface PreferencesStore {
  preferences: UiPreferences
  favorites: FavoritesState
  history: HistoryItem[]
  progress: PlaybackProgress[]
  selectedCategories: SelectedCategories
  lastSection: string | null
  playerPreferences: PlayerPreferences
  hydrate: () => void
  setPreferences: (preferences: Partial<UiPreferences>) => void
  enableAdultCategories: () => void
  disableAdultCategories: () => void
  toggleFavorite: (kind: FavoriteKind, item: FavoriteItem | string) => void
  isFavorite: (kind: FavoriteKind, id: string) => boolean
  addHistory: (item: HistoryItem) => void
  upsertProgress: (item: PlaybackProgress) => void
  removeProgress: (id: string) => void
  setSelectedCategory: (kind: keyof SelectedCategories, categoryId: string) => void
  setLastSection: (section: string) => void
  setPlayerPreferences: (preferences: Partial<PlayerPreferences>) => void
  scrubAdultLocalData: () => void
  clearLocalData: () => void
}

function toFavoriteItem(item: FavoriteItem | string): FavoriteItem {
  if (typeof item === 'string') {
    return { id: item, title: item }
  }
  return {
    id: String(item.id),
    title: item.title?.trim() ? item.title : String(item.id),
    posterUrl: item.posterUrl,
  }
}

function persistPreferences(preferences: UiPreferences) {
  storageService.savePreferences(preferences)
}

export const usePreferencesStore = create<PreferencesStore>((set, get) => ({
  preferences: DEFAULT_UI_PREFERENCES,
  favorites: DEFAULT_FAVORITES,
  history: [],
  progress: [],
  selectedCategories: {},
  lastSection: null,
  playerPreferences: DEFAULT_PLAYER_PREFERENCES,

  hydrate: () => {
    storageService.migrateIfNeeded()
    const history = scrubAdultHistoryItems(storageService.getHistory())
    const progress = scrubAdultHistoryItems(storageService.getProgress())
    storageService.saveHistory(history)
    storageService.saveProgress(progress)

    set({
      preferences: storageService.getPreferences(),
      favorites: storageService.getFavorites(),
      history,
      progress,
      selectedCategories: storageService.getSelectedCategories(),
      lastSection: storageService.getLastSection(),
      playerPreferences: storageService.getPlayerPreferences(),
    })
  },

  setPreferences: (partial) => {
    const preferences = { ...get().preferences, ...partial }
    persistPreferences(preferences)
    set({ preferences })
  },

  enableAdultCategories: () => {
    const preferences = { ...get().preferences, showAdultCategories: true }
    persistPreferences(preferences)
    set({ preferences })
  },

  disableAdultCategories: () => {
    const preferences = { ...get().preferences, showAdultCategories: false }
    persistPreferences(preferences)
    set({ preferences })
    get().scrubAdultLocalData()
  },

  toggleFavorite: (kind, item) => {
    const entry = toFavoriteItem(item)
    if (!entry.id) return
    const current = get().favorites
    const list = current[kind]
    const exists = list.some((fav) => fav.id === entry.id)
    const nextList = exists
      ? list.filter((fav) => fav.id !== entry.id)
      : [{ ...entry }, ...list.filter((fav) => fav.id !== entry.id)]
    const favorites = { ...current, [kind]: nextList }
    storageService.saveFavorites(favorites)
    set({ favorites })
  },

  isFavorite: (kind, id) => get().favorites[kind].some((fav) => fav.id === id),

  addHistory: (item) => {
    // Conteúdo adulto nunca entra no histórico local.
    if (isAdultLabel(item.title)) return
    const history = [item, ...get().history.filter((entry) => entry.id !== item.id)].slice(0, 50)
    storageService.saveHistory(history)
    set({ history })
  },

  upsertProgress: (item) => {
    // Nem progresso/"continuar assistindo" para conteúdo adulto.
    if (isAdultLabel(item.title)) return
    const progress = [item, ...get().progress.filter((entry) => entry.id !== item.id)].slice(0, 100)
    storageService.saveProgress(progress)
    set({ progress })
  },

  removeProgress: (id) => {
    const progress = get().progress.filter((entry) => entry.id !== id)
    storageService.saveProgress(progress)
    set({ progress })
  },

  setSelectedCategory: (kind, categoryId) => {
    const selectedCategories = { ...get().selectedCategories, [kind]: categoryId }
    storageService.saveSelectedCategories(selectedCategories)
    set({ selectedCategories })
  },

  setLastSection: (section) => {
    storageService.saveLastSection(section)
    set({ lastSection: section })
  },

  setPlayerPreferences: (partial) => {
    const playerPreferences = { ...get().playerPreferences, ...partial }
    storageService.savePlayerPreferences(playerPreferences)
    set({ playerPreferences })
  },

  scrubAdultLocalData: () => {
    const history = scrubAdultHistoryItems(get().history)
    const progress = scrubAdultHistoryItems(get().progress)
    storageService.saveHistory(history)
    storageService.saveProgress(progress)

    const selected = { ...get().selectedCategories }
    // Se a categoria selecionada for adulta (pelo id comum), volta para "all".
    // A filtragem fina ocorre nos ViewModels; aqui só normalizamos seleção suspeita.
    if (selected.live && isAdultLabel(selected.live)) selected.live = 'all'
    if (selected.movie && isAdultLabel(selected.movie)) selected.movie = 'all'
    if (selected.series && isAdultLabel(selected.series)) selected.series = 'all'
    storageService.saveSelectedCategories(selected)

    set({ history, progress, selectedCategories: selected })
  },

  clearLocalData: () => {
    void clearCatalogCache()
    storageService.clearAllAppData()
    set({
      preferences: DEFAULT_UI_PREFERENCES,
      favorites: DEFAULT_FAVORITES,
      history: [],
      progress: [],
      selectedCategories: {},
      lastSection: null,
      playerPreferences: DEFAULT_PLAYER_PREFERENCES,
    })
  },
}))
