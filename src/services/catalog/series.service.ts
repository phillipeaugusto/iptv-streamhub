import type { SeriesDetails, SeriesItem } from '@/shared/types/series'
import { catalogCache, filterByCategoryId } from '@/services/catalog/CatalogCacheService'
import { requireCatalogScope } from '@/services/catalog/catalogScope'
import { iptvService } from '@/services/iptv/IptvService'

export class SeriesRepository {
  async list(categoryId?: string, signal?: AbortSignal): Promise<SeriesItem[]> {
    const scope = requireCatalogScope()
    const cached = await catalogCache.get<SeriesItem[]>(scope, 'series')
    if (cached) {
      return filterByCategoryId(cached.data, categoryId)
    }

    const all = await iptvService.client.getSeries(undefined, signal)
    await catalogCache.set(scope, 'series', all)
    return filterByCategoryId(all, categoryId)
  }

  async refresh(signal?: AbortSignal): Promise<SeriesItem[]> {
    const scope = requireCatalogScope()
    const all = await iptvService.client.getSeries(undefined, signal)
    await catalogCache.set(scope, 'series', all)
    return all
  }

  async getDetails(seriesId: string, signal?: AbortSignal): Promise<SeriesDetails> {
    return iptvService.client.getSeriesInfo(seriesId, signal)
  }

  getPlaybackUrl(episodeId: string, extension = 'mp4'): string {
    return iptvService.client.buildSeriesUrl(episodeId, extension)
  }
}

export const seriesRepository = new SeriesRepository()
