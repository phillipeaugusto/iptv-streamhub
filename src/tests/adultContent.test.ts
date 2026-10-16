import { beforeEach, describe, expect, it } from 'vitest'
import {
  filterAdultCategories,
  isAdultContent,
  isAdultLabel,
  scrubAdultHistoryItems,
} from '@/shared/utils/adultContent'
import { usePreferencesStore } from '@/core/store/preferencesStore'
import { storageService } from '@/services/storage/StorageService'

describe('adultContent', () => {
  it('detecta rótulos adultos comuns', () => {
    expect(isAdultLabel('Filmes Adultos')).toBe(true)
    expect(isAdultLabel('XXX Channels')).toBe(true)
    expect(isAdultLabel('Canal +18')).toBe(true)
    expect(isAdultLabel('Globo HD')).toBe(false)
    expect(isAdultLabel('Discovery')).toBe(false)
  })

  it('filtra categorias adultas quando ocultas', () => {
    const categories = [
      { id: '1', name: 'Esportes' },
      { id: '2', name: 'Adulto' },
    ]
    expect(filterAdultCategories(categories, false)).toEqual([{ id: '1', name: 'Esportes' }])
    expect(filterAdultCategories(categories, true)).toHaveLength(2)
  })

  it('detecta conteúdo por categoria adulta', () => {
    const adultIds = new Set(['99'])
    expect(isAdultContent({ name: 'Filme X', categoryIds: ['99'] }, adultIds)).toBe(true)
    expect(isAdultContent({ name: 'Filme Y', categoryIds: ['1'] }, adultIds)).toBe(false)
  })

  it('remove itens adultos do histórico', () => {
    const items = [
      { title: 'Globo' },
      { title: 'Canal Adulto VIP' },
      { title: 'SporTV' },
    ]
    expect(scrubAdultHistoryItems(items).map((item) => item.title)).toEqual(['Globo', 'SporTV'])
  })
})

describe('preferencesStore adult safety', () => {
  beforeEach(() => {
    storageService.clearAllAppData()
    usePreferencesStore.getState().hydrate()
  })

  it('não grava conteúdo adulto no histórico', () => {
    usePreferencesStore.getState().addHistory({
      id: 'movie:1',
      kind: 'movie',
      title: 'Filme XXX Premium',
      watchedAt: new Date().toISOString(),
    })
    expect(usePreferencesStore.getState().history).toHaveLength(0)
  })

  it('não grava progresso de conteúdo adulto', () => {
    usePreferencesStore.getState().upsertProgress({
      id: 'movie:2',
      kind: 'movie',
      title: 'Adult Movie 18+',
      positionSeconds: 120,
      durationSeconds: 3600,
      updatedAt: new Date().toISOString(),
    })
    expect(usePreferencesStore.getState().progress).toHaveLength(0)
  })

  it('grava conteúdo normal normalmente', () => {
    usePreferencesStore.getState().addHistory({
      id: 'live:10',
      kind: 'live',
      title: 'Globo HD',
      watchedAt: new Date().toISOString(),
    })
    expect(usePreferencesStore.getState().history).toHaveLength(1)
  })
})
