import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  refreshCatalog,
  type CatalogSection,
} from '@/services/catalog/refreshCatalog'
import { safeErrorMessage } from '@/shared/utils/safeLog'

export function useCatalogRefresh(section: CatalogSection = 'all') {
  const queryClient = useQueryClient()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setIsRefreshing(true)
    setError(null)
    try {
      await refreshCatalog(queryClient, section)
    } catch (err) {
      setError(safeErrorMessage(err))
    } finally {
      setIsRefreshing(false)
    }
  }, [queryClient, section])

  return { refresh, isRefreshing, error }
}
