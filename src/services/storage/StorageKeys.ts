export const STORAGE_PREFIX = 'iptv.'
export const STORAGE_VERSION = 1

export const StorageKeys = {
  meta: `${STORAGE_PREFIX}meta`,
  credentials: `${STORAGE_PREFIX}credentials`,
  /** Sessão da aba (sessionStorage) — sobrevive a F5, some ao fechar a aba. */
  session: `${STORAGE_PREFIX}session`,
  preferences: `${STORAGE_PREFIX}preferences`,
  favorites: `${STORAGE_PREFIX}favorites`,
  history: `${STORAGE_PREFIX}history`,
  progress: `${STORAGE_PREFIX}progress`,
  selectedCategories: `${STORAGE_PREFIX}selectedCategories`,
  lastSection: `${STORAGE_PREFIX}lastSection`,
  playerPreferences: `${STORAGE_PREFIX}playerPreferences`,
} as const

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys]
