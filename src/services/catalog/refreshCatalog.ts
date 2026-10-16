import type { QueryClient } from '@tanstack/react-query'
import { categoryRepository } from '@/services/catalog/category.service'
import { channelRepository } from '@/services/catalog/channel.service'
import { movieRepository } from '@/services/catalog/movie.service'
import { seriesRepository } from '@/services/catalog/series.service'
import { catalogCache } from './CatalogCacheService'
import { catalogQueryKeys } from './catalogQueryKeys'
import { getCatalogScope } from './catalogScope'

export type CatalogSection = 'live' | 'movies' | 'series' | 'all'

/** Baixa de novo o catálogo do servidor e invalida o React Query. */
export async function refreshCatalog(
  queryClient: QueryClient,
  section: CatalogSection = 'all',
): Promise<void> {
  const tasks: Array<Promise<unknown>> = []

  if (section === 'live' || section === 'all') {
    tasks.push(categoryRepository.refresh('live'), channelRepository.refresh())
  }
  if (section === 'movies' || section === 'all') {
    tasks.push(categoryRepository.refresh('movie'), movieRepository.refresh())
  }
  if (section === 'series' || section === 'all') {
    tasks.push(categoryRepository.refresh('series'), seriesRepository.refresh())
  }

  await Promise.all(tasks)
  await queryClient.invalidateQueries({ queryKey: catalogQueryKeys.all })
}

export async function clearCatalogCache(): Promise<void> {
  const scope = getCatalogScope()
  if (scope) {
    await catalogCache.clearScope(scope)
    return
  }
  await catalogCache.clearAll()
}
