import { STORAGE_PREFIX, STORAGE_VERSION, StorageKeys, type StorageKey } from './StorageKeys'
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
  type StorageMeta,
  type StoredCredentials,
  type UiPreferences,
} from './StorageTypes'

export type StorageResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: 'quota_exceeded' | 'corrupted' | 'unavailable' | 'not_found'; message: string }

function isQuotaExceeded(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  )
}

/** Aceita formato antigo (string[]) e o atual (FavoriteItem[]). */
export function normalizeFavoriteList(value: unknown): FavoriteItem[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => {
      if (typeof entry === 'string' || typeof entry === 'number') {
        const id = String(entry)
        return { id, title: id }
      }
      if (entry && typeof entry === 'object' && 'id' in entry) {
        const item = entry as Partial<FavoriteItem>
        const id = String(item.id ?? '')
        if (!id) return null
        return {
          id,
          title: item.title?.trim() ? item.title : id,
          posterUrl: item.posterUrl,
        }
      }
      return null
    })
    .filter((entry): entry is FavoriteItem => Boolean(entry))
}

export function normalizeFavorites(value: unknown): FavoritesState {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  return {
    channels: normalizeFavoriteList(raw.channels),
    movies: normalizeFavoriteList(raw.movies),
    series: normalizeFavoriteList(raw.series),
  }
}

export class StorageService {
  private readonly storage: Storage | null

  constructor(storage: Storage | null = typeof localStorage === 'undefined' ? null : localStorage) {
    this.storage = storage
  }

  private ensureReady(): StorageResult<Storage> {
    if (!this.storage) {
      return { ok: false, error: 'unavailable', message: 'Armazenamento local indisponível.' }
    }
    return { ok: true, value: this.storage }
  }

  save<T>(key: StorageKey | string, value: T): StorageResult<T> {
    const ready = this.ensureReady()
    if (!ready.ok) return ready

    try {
      ready.value.setItem(key, JSON.stringify(value))
      this.touchMeta()
      return { ok: true, value }
    } catch (error) {
      if (isQuotaExceeded(error)) {
        return {
          ok: false,
          error: 'quota_exceeded',
          message: 'Espaço do armazenamento local esgotado. Remova dados antigos em Configurações.',
        }
      }
      return {
        ok: false,
        error: 'unavailable',
        message: 'Não foi possível salvar os dados locais.',
      }
    }
  }

  get<T>(key: StorageKey | string, fallback?: T): StorageResult<T> {
    const ready = this.ensureReady()
    if (!ready.ok) return ready

    const raw = ready.value.getItem(key)
    if (raw === null) {
      if (fallback !== undefined) {
        return { ok: true, value: fallback }
      }
      return { ok: false, error: 'not_found', message: `Chave ${key} não encontrada.` }
    }

    try {
      return { ok: true, value: JSON.parse(raw) as T }
    } catch {
      ready.value.removeItem(key)
      return {
        ok: false,
        error: 'corrupted',
        message: `Dados corrompidos em ${key} foram removidos.`,
      }
    }
  }

  remove(key: StorageKey | string): StorageResult<true> {
    const ready = this.ensureReady()
    if (!ready.ok) return ready
    ready.value.removeItem(key)
    this.touchMeta()
    return { ok: true, value: true }
  }

  clearKeys(keys: Array<StorageKey | string>): StorageResult<true> {
    const ready = this.ensureReady()
    if (!ready.ok) return ready
    keys.forEach((key) => ready.value.removeItem(key))
    this.touchMeta()
    return { ok: true, value: true }
  }

  clearAllAppData(): StorageResult<true> {
    const ready = this.ensureReady()
    if (!ready.ok) return ready

    const keysToRemove: string[] = []
    for (let index = 0; index < ready.value.length; index += 1) {
      const key = ready.value.key(index)
      if (key?.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => ready.value.removeItem(key))
    return { ok: true, value: true }
  }

  private touchMeta(): void {
    if (!this.storage) return
    const meta: StorageMeta = {
      version: STORAGE_VERSION,
      updatedAt: new Date().toISOString(),
    }
    try {
      this.storage.setItem(StorageKeys.meta, JSON.stringify(meta))
    } catch {
      // Ignore meta write failures to avoid recursive quota issues.
    }
  }

  migrateIfNeeded(): void {
    const metaResult = this.get<StorageMeta>(StorageKeys.meta)
    if (!metaResult.ok || metaResult.value.version === STORAGE_VERSION) {
      if (!metaResult.ok) {
        this.save(StorageKeys.meta, {
          version: STORAGE_VERSION,
          updatedAt: new Date().toISOString(),
        } satisfies StorageMeta)
      }
      return
    }

    // Placeholder for future migrations between storage versions.
    this.save(StorageKeys.meta, {
      version: STORAGE_VERSION,
      updatedAt: new Date().toISOString(),
    } satisfies StorageMeta)
  }

  getCredentials(): StoredCredentials | null {
    const result = this.get<StoredCredentials>(StorageKeys.credentials)
    return result.ok ? result.value : null
  }

  saveCredentials(credentials: StoredCredentials): StorageResult<StoredCredentials> {
    const payload: StoredCredentials = {
      serverUrl: credentials.serverUrl,
      username: credentials.username,
      rememberCredentials: credentials.rememberCredentials,
    }
    if (credentials.rememberCredentials && credentials.password) {
      payload.password = credentials.password
    }
    return this.save(StorageKeys.credentials, payload)
  }

  clearCredentials(): StorageResult<true> {
    return this.remove(StorageKeys.credentials)
  }

  getPreferences(): UiPreferences {
    const result = this.get<UiPreferences>(StorageKeys.preferences, DEFAULT_UI_PREFERENCES)
    return result.ok ? { ...DEFAULT_UI_PREFERENCES, ...result.value } : DEFAULT_UI_PREFERENCES
  }

  savePreferences(preferences: UiPreferences): StorageResult<UiPreferences> {
    return this.save(StorageKeys.preferences, preferences)
  }

  getFavorites(): FavoritesState {
    const result = this.get<unknown>(StorageKeys.favorites, DEFAULT_FAVORITES)
    if (!result.ok) return DEFAULT_FAVORITES
    return normalizeFavorites(result.value)
  }

  saveFavorites(favorites: FavoritesState): StorageResult<FavoritesState> {
    return this.save(StorageKeys.favorites, favorites)
  }

  getHistory(): HistoryItem[] {
    const result = this.get<HistoryItem[]>(StorageKeys.history, [])
    return result.ok ? result.value : []
  }

  saveHistory(history: HistoryItem[]): StorageResult<HistoryItem[]> {
    return this.save(StorageKeys.history, history.slice(0, 50))
  }

  getProgress(): PlaybackProgress[] {
    const result = this.get<PlaybackProgress[]>(StorageKeys.progress, [])
    return result.ok ? result.value : []
  }

  saveProgress(progress: PlaybackProgress[]): StorageResult<PlaybackProgress[]> {
    return this.save(StorageKeys.progress, progress.slice(0, 100))
  }

  getSelectedCategories(): SelectedCategories {
    const result = this.get<SelectedCategories>(StorageKeys.selectedCategories, {})
    return result.ok ? result.value : {}
  }

  saveSelectedCategories(categories: SelectedCategories): StorageResult<SelectedCategories> {
    return this.save(StorageKeys.selectedCategories, categories)
  }

  getLastSection(): string | null {
    const result = this.get<string>(StorageKeys.lastSection)
    return result.ok ? result.value : null
  }

  saveLastSection(section: string): StorageResult<string> {
    return this.save(StorageKeys.lastSection, section)
  }

  getPlayerPreferences(): PlayerPreferences {
    const result = this.get<PlayerPreferences>(
      StorageKeys.playerPreferences,
      DEFAULT_PLAYER_PREFERENCES,
    )
    return result.ok
      ? { ...DEFAULT_PLAYER_PREFERENCES, ...result.value }
      : DEFAULT_PLAYER_PREFERENCES
  }

  savePlayerPreferences(preferences: PlayerPreferences): StorageResult<PlayerPreferences> {
    return this.save(StorageKeys.playerPreferences, preferences)
  }
}

export const storageService = new StorageService()
