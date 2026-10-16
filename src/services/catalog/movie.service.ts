import type { Movie, MovieDetails } from '@/shared/types/movie'
import { catalogCache, filterByCategoryId } from '@/services/catalog/CatalogCacheService'
import { requireCatalogScope } from '@/services/catalog/catalogScope'
import { iptvService } from '@/services/iptv/IptvService'

export class MovieRepository {
  async list(categoryId?: string, signal?: AbortSignal): Promise<Movie[]> {
    const scope = requireCatalogScope()
    const cached = await catalogCache.get<Movie[]>(scope, 'movies')
    if (cached) {
      return filterByCategoryId(cached.data, categoryId)
    }

    const all = await iptvService.client.getVodStreams(undefined, signal)
    await catalogCache.set(scope, 'movies', all)
    return filterByCategoryId(all, categoryId)
  }

  async refresh(signal?: AbortSignal): Promise<Movie[]> {
    const scope = requireCatalogScope()
    const all = await iptvService.client.getVodStreams(undefined, signal)
    await catalogCache.set(scope, 'movies', all)
    return all
  }

  async getDetails(movieId: string, signal?: AbortSignal): Promise<MovieDetails> {
    return iptvService.client.getVodInfo(movieId, signal)
  }

  getPlaybackUrl(movieId: string, extension = 'mp4'): string {
    return iptvService.client.buildMovieUrl(movieId, extension)
  }
}

export const movieRepository = new MovieRepository()
