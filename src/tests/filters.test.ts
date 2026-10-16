import { describe, expect, it } from 'vitest'
import { filterByName, matchesSearch } from '@/shared/utils/search'

describe('busca e filtros', () => {
  const channels = [
    { id: '1', name: 'Globo HD' },
    { id: '2', name: 'SporTV' },
    { id: '3', name: 'Discovery' },
  ]

  const series = [
    { id: '10', name: 'Prison Break' },
    { id: '11', name: 'Breaking Bad' },
    { id: '12', name: 'Ação Imediata' },
  ]

  it('filtra por nome ignorando maiúsculas', () => {
    expect(filterByName(channels, 'globo')).toEqual([{ id: '1', name: 'Globo HD' }])
  })

  it('retorna lista completa sem termo', () => {
    expect(filterByName(channels, '  ')).toHaveLength(3)
  })

  it('encontra por substring (break)', () => {
    expect(filterByName(series, 'break').map((item) => item.id)).toEqual(['10', '11'])
  })

  it('tolera erro comum de digitação (prision → prison)', () => {
    expect(matchesSearch('Prison Break', 'prision')).toBe(true)
    expect(filterByName(series, 'prision')).toEqual([{ id: '10', name: 'Prison Break' }])
  })

  it('ignora acentos', () => {
    expect(matchesSearch('Ação Imediata', 'acao')).toBe(true)
    expect(filterByName(series, 'acao')).toEqual([{ id: '12', name: 'Ação Imediata' }])
  })
})
