import { beforeEach, describe, expect, it } from 'vitest'
import { StorageService } from '@/services/storage/StorageService'
import { StorageKeys } from '@/services/storage/StorageKeys'

function createMemoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear() {
      map.clear()
    },
    getItem(key) {
      return map.has(key) ? map.get(key)! : null
    },
    key(index) {
      return Array.from(map.keys())[index] ?? null
    },
    removeItem(key) {
      map.delete(key)
    },
    setItem(key, value) {
      map.set(key, String(value))
    },
  }
}

describe('StorageService', () => {
  let storage: Storage
  let service: StorageService

  beforeEach(() => {
    storage = createMemoryStorage()
    service = new StorageService(storage)
  })

  it('salva e recupera dados tipados', () => {
    const result = service.save(StorageKeys.preferences, {
      theme: 'dark',
      language: 'pt-BR',
      compactMode: true,
      showAdultCategories: false,
    })
    expect(result.ok).toBe(true)

    const loaded = service.getPreferences()
    expect(loaded.compactMode).toBe(true)
  })

  it('trata JSON inválido/corrompido', () => {
    storage.setItem(StorageKeys.favorites, '{broken')
    const result = service.get(StorageKeys.favorites)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('corrupted')
    }
    expect(storage.getItem(StorageKeys.favorites)).toBeNull()
  })

  it('persiste favoritos', () => {
    service.saveFavorites({
      channels: [{ id: '1', title: 'Canal' }],
      movies: [{ id: '2', title: 'Filme' }],
      series: [],
    })
    expect(service.getFavorites()).toEqual({
      channels: [{ id: '1', title: 'Canal' }],
      movies: [{ id: '2', title: 'Filme' }],
      series: [],
    })
  })

  it('normaliza favoritos legados em string[]', () => {
    storage.setItem(
      StorageKeys.favorites,
      JSON.stringify({ channels: ['1'], movies: ['2'], series: [] }),
    )
    expect(service.getFavorites()).toEqual({
      channels: [{ id: '1', title: '1' }],
      movies: [{ id: '2', title: '2' }],
      series: [],
    })
  })

  it('salva senha somente quando rememberCredentials=true', () => {
    service.saveCredentials({
      serverUrl: 'http://iptv.example',
      username: 'user',
      password: 'secret',
      rememberCredentials: false,
    })
    expect(service.getCredentials()?.password).toBeUndefined()

    service.saveCredentials({
      serverUrl: 'http://iptv.example',
      username: 'user',
      password: 'secret',
      rememberCredentials: true,
    })
    expect(service.getCredentials()?.password).toBe('secret')
  })

  it('limpa dados locais com prefixo iptv.', () => {
    storage.setItem('other.key', 'keep')
    service.saveFavorites({ channels: [{ id: '1', title: 'Canal' }], movies: [], series: [] })
    service.clearAllAppData()
    expect(storage.getItem(StorageKeys.favorites)).toBeNull()
    expect(storage.getItem('other.key')).toBe('keep')
  })

  it('recupera preferências padrão quando ausentes', () => {
    const prefs = service.getPreferences()
    expect(prefs.theme).toBe('dark')
    expect(prefs.language).toBe('pt-BR')
  })

  it('trata quota excedida', () => {
    const failing: Storage = {
      ...storage,
      setItem() {
        const error = new DOMException('quota', 'QuotaExceededError')
        throw error
      },
    }
    const limited = new StorageService(failing)
    const result = limited.save(StorageKeys.history, [])
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('quota_exceeded')
    }
  })
})
