import { beforeEach, describe, expect, it } from 'vitest'
import { storageService } from '@/services/storage/StorageService'
import { usePreferencesStore } from '@/core/store/preferencesStore'

describe('preferencesStore', () => {
  beforeEach(() => {
    storageService.clearAllAppData()
    usePreferencesStore.getState().hydrate()
  })

  it('alterna favoritos com metadados e persiste', () => {
    const { toggleFavorite, isFavorite, hydrate } = usePreferencesStore.getState()
    toggleFavorite('movies', { id: '42', title: 'Filme Teste', posterUrl: 'http://x/p.jpg' })
    expect(isFavorite('movies', '42')).toBe(true)
    expect(usePreferencesStore.getState().favorites.movies[0]).toMatchObject({
      id: '42',
      title: 'Filme Teste',
    })
    hydrate()
    expect(usePreferencesStore.getState().favorites.movies.some((item) => item.id === '42')).toBe(
      true,
    )
  })

  it('migra favoritos antigos salvos como string[]', () => {
    storageService.saveFavorites({
      channels: [{ id: '1', title: '1' }],
      movies: [{ id: '2', title: '2' }],
      series: [],
    })
    // Formato legado direto no storage
    const raw = {
      channels: ['1'],
      movies: ['2'],
      series: [],
    }
    window.localStorage.setItem('iptv.favorites', JSON.stringify(raw))
    usePreferencesStore.getState().hydrate()
    expect(usePreferencesStore.getState().favorites.movies).toEqual([{ id: '2', title: '2' }])
  })

  it('recupera preferências após hydrate', () => {
    usePreferencesStore.getState().setPreferences({ compactMode: true })
    usePreferencesStore.getState().hydrate()
    expect(usePreferencesStore.getState().preferences.compactMode).toBe(true)
  })

  it('limpa dados locais', () => {
    usePreferencesStore.getState().toggleFavorite('channels', {
      id: '1',
      title: 'Canal',
    })
    usePreferencesStore.getState().clearLocalData()
    expect(usePreferencesStore.getState().favorites.channels).toEqual([])
    expect(storageService.getFavorites().channels).toEqual([])
  })
})
