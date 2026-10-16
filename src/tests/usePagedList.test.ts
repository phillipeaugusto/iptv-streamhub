import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { usePagedList } from '@/shared/hooks/usePagedList'

describe('usePagedList', () => {
  it('mostra só a primeira página e cresce ao carregar mais', () => {
    const items = Array.from({ length: 50 }, (_, index) => index)
    const { result } = renderHook(() => usePagedList(items, 20))

    expect(result.current.visible).toEqual(items.slice(0, 20))
    expect(result.current.hasMore).toBe(true)
    expect(result.current.shown).toBe(20)

    act(() => result.current.loadMore())

    expect(result.current.visible).toHaveLength(40)
    expect(result.current.hasMore).toBe(true)
  })

  it('volta ao início quando a lista muda', () => {
    const first = Array.from({ length: 40 }, (_, index) => `a${index}`)
    const second = Array.from({ length: 40 }, (_, index) => `b${index}`)
    const { result, rerender } = renderHook(
      ({ items }) => usePagedList(items, 10),
      { initialProps: { items: first } },
    )

    act(() => result.current.loadMore())
    expect(result.current.shown).toBe(20)

    rerender({ items: second })

    expect(result.current.visible).toEqual(second.slice(0, 10))
    expect(result.current.shown).toBe(10)
  })
})
