import type { Category, ContentKind } from '@/shared/types/category'
import type { CatalogBucket } from '@/services/catalog/CatalogCacheService'
import { catalogCache } from '@/services/catalog/CatalogCacheService'
import { requireCatalogScope } from '@/services/catalog/catalogScope'
import { iptvService } from '@/services/iptv/IptvService'

function bucketFor(kind: ContentKind): CatalogBucket {
  switch (kind) {
    case 'live':
      return 'liveCategories'
    case 'movie':
      return 'movieCategories'
    case 'series':
      return 'seriesCategories'
  }
}

export class CategoryRepository {
  async list(kind: ContentKind, signal?: AbortSignal): Promise<Category[]> {
    const scope = requireCatalogScope()
    const bucket = bucketFor(kind)
    const cached = await catalogCache.get<Category[]>(scope, bucket)
    if (cached) return cached.data

    const data = await this.fetchRemote(kind, signal)
    await catalogCache.set(scope, bucket, data)
    return data
  }

  async refresh(kind: ContentKind, signal?: AbortSignal): Promise<Category[]> {
    const scope = requireCatalogScope()
    const data = await this.fetchRemote(kind, signal)
    await catalogCache.set(scope, bucketFor(kind), data)
    return data
  }

  private fetchRemote(kind: ContentKind, signal?: AbortSignal): Promise<Category[]> {
    const client = iptvService.client
    switch (kind) {
      case 'live':
        return client.getLiveCategories(signal)
      case 'movie':
        return client.getVodCategories(signal)
      case 'series':
        return client.getSeriesCategories(signal)
      default:
        return Promise.resolve([])
    }
  }
}

export const categoryRepository = new CategoryRepository()
