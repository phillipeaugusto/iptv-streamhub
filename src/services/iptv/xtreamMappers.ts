import type { AccountInfo } from '@/shared/types/auth'
import type { Category } from '@/shared/types/category'
import type { Channel } from '@/shared/types/channel'
import type { EpgProgram } from '@/shared/types/epg'
import type { Movie, MovieDetails } from '@/shared/types/movie'
import type { Episode, Season, SeriesDetails, SeriesItem } from '@/shared/types/series'
import { isAdultCategory } from '@/shared/utils/adultContent'
import type {
  XtreamAuthResponseRaw,
  XtreamCategoryRaw,
  XtreamEpgListingRaw,
  XtreamEpisodeRaw,
  XtreamLiveStreamRaw,
  XtreamSeriesInfoRaw,
  XtreamSeriesRaw,
  XtreamVodInfoRaw,
  XtreamVodStreamRaw,
} from './xtreamTypes'

function asString(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback
  return String(value)
}

function asCategoryIds(raw: {
  category_id?: string
  category_ids?: Array<number | string>
}): string[] {
  if (Array.isArray(raw.category_ids) && raw.category_ids.length > 0) {
    return raw.category_ids.map((id) => String(id))
  }
  if (raw.category_id !== undefined && raw.category_id !== null && raw.category_id !== '') {
    return [String(raw.category_id)]
  }
  return []
}

function decodeMaybeBase64(value?: string): string {
  if (!value) return ''
  try {
    if (typeof atob === 'function' && /^[A-Za-z0-9+/=]+$/.test(value) && value.length % 4 === 0) {
      const decoded = atob(value)
      if (/^[\x20-\x7E\u00A0-\uFFFF]*$/.test(decoded)) {
        return decoded
      }
    }
  } catch {
    // Keep original value when decoding fails.
  }
  return value
}

export function mapAuthResponse(raw: XtreamAuthResponseRaw, serverUrl: string): AccountInfo {
  const user = raw.user_info ?? {}
  const server = raw.server_info ?? {}
  const authValue = user.auth
  const authenticated = authValue === 1 || authValue === '1'

  return {
    userInfo: {
      username: asString(user.username),
      status: user.status,
      expDate: user.exp_date,
      isTrial: user.is_trial,
      activeConnections: user.active_cons,
      maxConnections: user.max_connections,
      createdAt: user.created_at,
      allowedOutputFormats: user.allowed_output_formats,
      message: user.message,
      auth: authenticated,
    },
    serverInfo: {
      url: server.url || serverUrl,
      port: server.port,
      httpsPort: server.https_port,
      serverProtocol: server.server_protocol,
      timezone: server.timezone,
      timestampNow: server.timestamp_now,
      timeNow: server.time_now,
    },
  }
}

export function mapCategories(
  raw: XtreamCategoryRaw[],
  kind: Category['kind'],
): Category[] {
  return raw.map((item) => {
    const name = asString(item.category_name, 'Sem nome')
    const id = asString(item.category_id)
    return {
      id,
      name,
      parentId: item.parent_id !== undefined ? asString(item.parent_id) : undefined,
      kind,
      isAdult: isAdultCategory({ id, name }),
    }
  })
}

export function mapLiveStreams(raw: XtreamLiveStreamRaw[]): Channel[] {
  return raw.map((item) => ({
    id: asString(item.stream_id),
    name: asString(item.name, 'Canal'),
    number: typeof item.num === 'number' ? item.num : undefined,
    logoUrl: item.stream_icon || undefined,
    categoryIds: asCategoryIds(item),
    epgChannelId: item.epg_channel_id || undefined,
    hasArchive: item.tv_archive === 1,
    streamType: item.stream_type,
    customSid: item.custom_sid,
    tvArchiveDuration: item.tv_archive_duration,
  }))
}

export function mapVodStreams(raw: XtreamVodStreamRaw[]): Movie[] {
  return raw.map((item) => ({
    id: asString(item.stream_id),
    name: asString(item.name, 'Filme'),
    posterUrl: item.stream_icon || undefined,
    backdropUrl: item.backdrop_path?.[0],
    categoryIds: asCategoryIds(item),
    rating: item.rating,
    year: item.releaseDate?.slice(0, 4),
    plot: item.plot,
    cast: item.cast,
    director: item.director,
    genre: item.genre,
    duration: item.episode_run_time,
    containerExtension: item.container_extension,
    added: item.added,
  }))
}

export function mapSeriesList(raw: XtreamSeriesRaw[]): SeriesItem[] {
  return raw.map((item) => ({
    id: asString(item.series_id),
    name: asString(item.name, 'Série'),
    posterUrl: item.cover || undefined,
    backdropUrl: item.backdrop_path?.[0],
    categoryIds: asCategoryIds(item),
    rating: item.rating,
    plot: item.plot,
    cast: item.cast,
    director: item.director,
    genre: item.genre,
    releaseDate: item.releaseDate,
    lastModified: item.last_modified,
  }))
}

export function mapVodInfo(raw: XtreamVodInfoRaw, fallback?: Movie): MovieDetails {
  const info = raw.info ?? {}
  const movieData = raw.movie_data ?? {}
  const id = asString(movieData.stream_id ?? fallback?.id)
  const backdrop = info.backdrop_path
  const backdropUrl = Array.isArray(backdrop) ? asString(backdrop[0]) : asString(backdrop)

  return {
    id,
    name: asString(info.name ?? movieData.name ?? fallback?.name, 'Filme'),
    posterUrl: asString(info.movie_image ?? fallback?.posterUrl) || undefined,
    backdropUrl: backdropUrl || fallback?.backdropUrl,
    categoryIds: movieData.category_id
      ? [asString(movieData.category_id)]
      : (fallback?.categoryIds ?? []),
    rating: asString(info.rating ?? fallback?.rating) || undefined,
    year: asString(info.releasedate ?? info.releaseDate ?? fallback?.year).slice(0, 4) || undefined,
    plot: asString(info.plot ?? fallback?.plot) || undefined,
    cast: asString(info.cast ?? fallback?.cast) || undefined,
    director: asString(info.director ?? fallback?.director) || undefined,
    genre: asString(info.genre ?? fallback?.genre) || undefined,
    duration: asString(info.duration ?? info.episode_run_time ?? fallback?.duration) || undefined,
    containerExtension:
      asString(movieData.container_extension ?? fallback?.containerExtension) || undefined,
    youtubeTrailer: asString(info.youtube_trailer) || undefined,
    releaseDate: asString(info.releasedate ?? info.releaseDate) || undefined,
    country: asString(info.country) || undefined,
    bitrate: typeof info.bitrate === 'number' ? info.bitrate : undefined,
  }
}

function mapEpisode(raw: XtreamEpisodeRaw, seasonNumber: number): Episode {
  return {
    id: asString(raw.id),
    seasonNumber,
    episodeNumber: Number(raw.episode_num ?? 0),
    title: asString(raw.title, `Episódio ${raw.episode_num ?? ''}`),
    plot: raw.info?.plot,
    duration: raw.info?.duration,
    containerExtension: raw.container_extension,
    rating: raw.info?.rating,
    coverUrl: raw.info?.movie_image,
    releaseDate: raw.info?.releasedate,
  }
}

export function mapSeriesInfo(raw: XtreamSeriesInfoRaw, seriesId: string, fallback?: SeriesItem): SeriesDetails {
  const info = raw.info ?? {}
  const episodesBySeason = raw.episodes ?? {}
  const seasons: Season[] = Object.entries(episodesBySeason)
    .map(([seasonKey, episodes]) => {
      const seasonNumber = Number(seasonKey)
      const meta = raw.seasons?.find((item) => item.season_number === seasonNumber)
      return {
        seasonNumber,
        name: meta?.name || `Temporada ${seasonNumber}`,
        coverUrl: meta?.cover || meta?.cover_big,
        episodes: (episodes ?? []).map((episode) => mapEpisode(episode, seasonNumber)),
      }
    })
    .sort((a, b) => a.seasonNumber - b.seasonNumber)

  return {
    id: seriesId,
    name: asString(info.name ?? fallback?.name, 'Série'),
    posterUrl: asString(info.cover ?? fallback?.posterUrl) || undefined,
    backdropUrl:
      (Array.isArray(info.backdrop_path)
        ? asString(info.backdrop_path[0])
        : asString(info.backdrop_path)) || fallback?.backdropUrl,
    categoryIds: fallback?.categoryIds ?? [],
    rating: asString(info.rating ?? fallback?.rating) || undefined,
    plot: asString(info.plot ?? fallback?.plot) || undefined,
    cast: asString(info.cast ?? fallback?.cast) || undefined,
    director: asString(info.director ?? fallback?.director) || undefined,
    genre: asString(info.genre ?? fallback?.genre) || undefined,
    releaseDate: asString(info.releaseDate ?? fallback?.releaseDate) || undefined,
    youtubeTrailer: asString(info.youtube_trailer) || undefined,
    seasons,
  }
}

export function mapEpgListings(raw: XtreamEpgListingRaw[], channelId: string): EpgProgram[] {
  const listings = Array.isArray(raw) ? raw : []
  return listings.map((item, index) => ({
    id: asString(item.id ?? item.epg_id ?? `${channelId}-${index}`),
    channelId,
    title: decodeMaybeBase64(item.title) || 'Programa',
    description: decodeMaybeBase64(item.description) || undefined,
    start: asString(item.start),
    end: asString(item.end),
    startTimestamp: item.start_timestamp ? Number(item.start_timestamp) : undefined,
    endTimestamp: item.stop_timestamp ? Number(item.stop_timestamp) : undefined,
  }))
}
