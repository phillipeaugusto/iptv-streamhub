import type { Channel } from '@/shared/types/channel'
import type { EpgProgram } from '@/shared/types/epg'
import { catalogCache, filterByCategoryId } from '@/services/catalog/CatalogCacheService'
import { requireCatalogScope } from '@/services/catalog/catalogScope'
import { iptvService } from '@/services/iptv/IptvService'

export class ChannelRepository {
  async list(categoryId?: string, signal?: AbortSignal): Promise<Channel[]> {
    const scope = requireCatalogScope()
    const cached = await catalogCache.get<Channel[]>(scope, 'liveChannels')
    if (cached) {
      return filterByCategoryId(cached.data, categoryId)
    }

    const all = await iptvService.client.getLiveStreams(undefined, signal)
    await catalogCache.set(scope, 'liveChannels', all)
    return filterByCategoryId(all, categoryId)
  }

  async refresh(signal?: AbortSignal): Promise<Channel[]> {
    const scope = requireCatalogScope()
    const all = await iptvService.client.getLiveStreams(undefined, signal)
    await catalogCache.set(scope, 'liveChannels', all)
    return all
  }

  async getEpg(channelId: string, limit = 12, signal?: AbortSignal): Promise<EpgProgram[]> {
    return iptvService.client.getShortEpg(channelId, limit, signal)
  }

  getPlaybackUrl(channelId: string, extension: 'm3u8' | 'ts' = 'm3u8'): string {
    return iptvService.client.buildLiveUrl(channelId, extension)
  }
}

export const channelRepository = new ChannelRepository()
