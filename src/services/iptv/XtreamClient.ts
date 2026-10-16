import axios, { type AxiosInstance } from 'axios'
import { AuthError, type AccountInfo, type ConnectionCredentials } from '@/shared/types/auth'
import type { Category } from '@/shared/types/category'
import type { Channel } from '@/shared/types/channel'
import type { EpgProgram } from '@/shared/types/epg'
import type { Movie, MovieDetails } from '@/shared/types/movie'
import type { SeriesDetails, SeriesItem } from '@/shared/types/series'
import { toProxiedIptvUrl } from '@/shared/utils/iptvProxy'
import { joinUrl, normalizeServerUrl } from '@/shared/utils/url'
import { mapAxiosErrorToAuthError } from './IptvErrors'
import {
  mapAuthResponse,
  mapCategories,
  mapEpgListings,
  mapLiveStreams,
  mapSeriesInfo,
  mapSeriesList,
  mapVodInfo,
  mapVodStreams,
} from './xtreamMappers'
import type {
  XtreamAuthResponseRaw,
  XtreamCategoryRaw,
  XtreamEpgListingRaw,
  XtreamLiveStreamRaw,
  XtreamSeriesInfoRaw,
  XtreamSeriesRaw,
  XtreamVodInfoRaw,
  XtreamVodStreamRaw,
} from './xtreamTypes'

export interface XtreamSession {
  serverUrl: string
  username: string
  password: string
}

type ActionParams = Record<string, string | number | undefined>

export class XtreamClient {
  private http: AxiosInstance
  private session: XtreamSession | null = null

  constructor() {
    this.http = axios.create({
      timeout: 30000,
      responseType: 'json',
    })
  }

  getSession(): XtreamSession | null {
    return this.session
  }

  setSession(session: XtreamSession): void {
    this.session = {
      serverUrl: normalizeServerUrl(session.serverUrl),
      username: session.username,
      password: session.password,
    }
  }

  clearSession(): void {
    this.session = null
  }

  private requireSession(): XtreamSession {
    if (!this.session) {
      throw new AuthError('invalid_credentials', 'Sessão não autenticada.')
    }
    return this.session
  }

  private apiUrl(session: XtreamSession): string {
    return toProxiedIptvUrl(joinUrl(session.serverUrl, 'player_api.php'))
  }

  private async request<T>(
    action: string | undefined,
    extra: ActionParams = {},
    signal?: AbortSignal,
  ): Promise<T> {
    const session = this.requireSession()
    try {
      const response = await this.http.get<T>(this.apiUrl(session), {
        params: {
          username: session.username,
          password: session.password,
          ...(action ? { action } : {}),
          ...extra,
        },
        signal,
        validateStatus: (status) => status >= 200 && status < 300,
      })
      return response.data
    } catch (error) {
      throw mapAxiosErrorToAuthError(error)
    }
  }

  async authenticate(credentials: ConnectionCredentials): Promise<AccountInfo> {
    const serverUrl = normalizeServerUrl(credentials.serverUrl)
    const candidate: XtreamSession = {
      serverUrl,
      username: credentials.username.trim(),
      password: credentials.password,
    }

    try {
      const response = await this.http.get<XtreamAuthResponseRaw>(this.apiUrl(candidate), {
        params: {
          username: candidate.username,
          password: candidate.password,
        },
        validateStatus: (status) => status === 200 || status === 404,
      })

      if (response.status === 404) {
        throw new AuthError(
          'api_not_found',
          'O endpoint player_api.php não existe neste servidor (HTTP 404). Em hosts XUI, a API Xtream pode estar desabilitada ou o painel pode estar em outro endereço.',
          404,
        )
      }

      if (!response.data || typeof response.data !== 'object') {
        throw new AuthError('invalid_response', 'Resposta de autenticação inválida do servidor.')
      }

      const account = mapAuthResponse(response.data, serverUrl)
      if (!account.userInfo.auth) {
        throw new AuthError(
          'invalid_credentials',
          account.userInfo.message || 'Usuário ou senha inválidos.',
        )
      }

      this.session = candidate
      return account
    } catch (error) {
      this.session = null
      throw mapAxiosErrorToAuthError(error)
    }
  }

  async getLiveCategories(signal?: AbortSignal): Promise<Category[]> {
    const data = await this.request<XtreamCategoryRaw[]>('get_live_categories', {}, signal)
    return mapCategories(Array.isArray(data) ? data : [], 'live')
  }

  async getLiveStreams(categoryId?: string, signal?: AbortSignal): Promise<Channel[]> {
    const data = await this.request<XtreamLiveStreamRaw[]>(
      'get_live_streams',
      categoryId && categoryId !== 'all' ? { category_id: categoryId } : {},
      signal,
    )
    return mapLiveStreams(Array.isArray(data) ? data : [])
  }

  async getVodCategories(signal?: AbortSignal): Promise<Category[]> {
    const data = await this.request<XtreamCategoryRaw[]>('get_vod_categories', {}, signal)
    return mapCategories(Array.isArray(data) ? data : [], 'movie')
  }

  async getVodStreams(categoryId?: string, signal?: AbortSignal): Promise<Movie[]> {
    const data = await this.request<XtreamVodStreamRaw[]>(
      'get_vod_streams',
      categoryId && categoryId !== 'all' ? { category_id: categoryId } : {},
      signal,
    )
    return mapVodStreams(Array.isArray(data) ? data : [])
  }

  async getVodInfo(vodId: string, signal?: AbortSignal): Promise<MovieDetails> {
    const data = await this.request<XtreamVodInfoRaw>('get_vod_info', { vod_id: vodId }, signal)
    return mapVodInfo(data ?? {})
  }

  async getSeriesCategories(signal?: AbortSignal): Promise<Category[]> {
    const data = await this.request<XtreamCategoryRaw[]>('get_series_categories', {}, signal)
    return mapCategories(Array.isArray(data) ? data : [], 'series')
  }

  async getSeries(categoryId?: string, signal?: AbortSignal): Promise<SeriesItem[]> {
    const data = await this.request<XtreamSeriesRaw[]>(
      'get_series',
      categoryId && categoryId !== 'all' ? { category_id: categoryId } : {},
      signal,
    )
    return mapSeriesList(Array.isArray(data) ? data : [])
  }

  async getSeriesInfo(seriesId: string, signal?: AbortSignal): Promise<SeriesDetails> {
    const data = await this.request<XtreamSeriesInfoRaw>(
      'get_series_info',
      { series_id: seriesId },
      signal,
    )
    return mapSeriesInfo(data ?? {}, seriesId)
  }

  async getShortEpg(streamId: string, limit = 10, signal?: AbortSignal): Promise<EpgProgram[]> {
    try {
      const data = await this.request<{ epg_listings?: XtreamEpgListingRaw[] } | XtreamEpgListingRaw[]>(
        'get_short_epg',
        { stream_id: streamId, limit },
        signal,
      )
      const listings = Array.isArray(data) ? data : (data?.epg_listings ?? [])
      return mapEpgListings(listings, streamId)
    } catch {
      return []
    }
  }

  buildLiveUrl(streamId: string, extension: 'm3u8' | 'ts' = 'm3u8'): string {
    const session = this.requireSession()
    return toProxiedIptvUrl(
      joinUrl(
        session.serverUrl,
        `live/${session.username}/${session.password}/${streamId}.${extension}`,
      ),
    )
  }

  buildMovieUrl(streamId: string, extension = 'mp4'): string {
    const session = this.requireSession()
    const ext = extension.replace(/^\./, '')
    return toProxiedIptvUrl(
      joinUrl(
        session.serverUrl,
        `movie/${session.username}/${session.password}/${streamId}.${ext}`,
      ),
    )
  }

  buildSeriesUrl(episodeId: string, extension = 'mp4'): string {
    const session = this.requireSession()
    const ext = extension.replace(/^\./, '')
    return toProxiedIptvUrl(
      joinUrl(
        session.serverUrl,
        `series/${session.username}/${session.password}/${episodeId}.${ext}`,
      ),
    )
  }
}

export const xtreamClient = new XtreamClient()
