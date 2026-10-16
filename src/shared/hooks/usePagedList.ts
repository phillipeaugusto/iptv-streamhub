import { useCallback, useMemo, useState } from 'react'

/**
 * Mostra só a primeira página e cresce sob demanda.
 * O painel Xtream entrega o catálogo inteiro; paginar a renderização
 * evita montar milhares de cards no celular.
 */
export function usePagedList<T>(items: T[], pageSize = 24) {
  const [windowState, setWindowState] = useState({ items, count: pageSize })

  if (windowState.items !== items) {
    setWindowState({ items, count: pageSize })
  }

  const count = windowState.items === items ? windowState.count : pageSize
  const visible = useMemo(() => items.slice(0, count), [items, count])

  const loadMore = useCallback(() => {
    setWindowState((current) => {
      if (current.items !== items) return { items, count: pageSize }
      return { items, count: Math.min(current.count + pageSize, items.length) }
    })
  }, [items, pageSize])

  return {
    visible,
    shown: Math.min(count, items.length),
    total: items.length,
    hasMore: count < items.length,
    loadMore,
  }
}
