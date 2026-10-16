/** Raw shapes returned by Xtream Codes / XUI `player_api.php`. */

export interface XtreamUserInfoRaw {
  username?: string
  password?: string
  message?: string
  auth?: number | string
  status?: string
  exp_date?: string
  is_trial?: string
  active_cons?: string
  created_at?: string
  max_connections?: string
  allowed_output_formats?: string[]
}

export interface XtreamServerInfoRaw {
  url?: string
  port?: string
  https_port?: string
  server_protocol?: string
  timezone?: string
  timestamp_now?: number
  time_now?: string
}

export interface XtreamAuthResponseRaw {
  user_info?: XtreamUserInfoRaw
  server_info?: XtreamServerInfoRaw
}

export interface XtreamCategoryRaw {
  category_id: string
  category_name: string
  parent_id?: number | string
}

export interface XtreamLiveStreamRaw {
  num?: number
  name: string
  stream_type?: string
  stream_id: number | string
  stream_icon?: string
  epg_channel_id?: string
  category_id?: string
  category_ids?: Array<number | string>
  tv_archive?: number
  tv_archive_duration?: number
  custom_sid?: string
}

export interface XtreamVodStreamRaw {
  num?: number
  name: string
  stream_type?: string
  stream_id: number | string
  stream_icon?: string
  rating?: string
  category_id?: string
  category_ids?: Array<number | string>
  container_extension?: string
  plot?: string
  cast?: string
  director?: string
  genre?: string
  releaseDate?: string
  added?: string
  youtube_trailer?: string
  episode_run_time?: string
  backdrop_path?: string[]
}

export interface XtreamSeriesRaw {
  num?: number
  name: string
  series_id: number | string
  cover?: string
  plot?: string
  cast?: string
  director?: string
  genre?: string
  releaseDate?: string
  last_modified?: string
  rating?: string
  category_id?: string
  category_ids?: Array<number | string>
  backdrop_path?: string[]
  youtube_trailer?: string
}

export interface XtreamVodInfoRaw {
  info?: Record<string, unknown>
  movie_data?: {
    stream_id?: number | string
    name?: string
    container_extension?: string
    category_id?: string
  }
}

export interface XtreamEpisodeRaw {
  id: string | number
  episode_num?: number | string
  title?: string
  container_extension?: string
  info?: {
    movie_image?: string
    plot?: string
    releasedate?: string
    rating?: string
    duration?: string
    duration_secs?: number
  }
  custom_sid?: string
  added?: string
  season?: number | string
}

export interface XtreamSeriesInfoRaw {
  seasons?: Array<{
    air_date?: string
    episode_count?: number
    name?: string
    overview?: string
    season_number?: number
    cover?: string
    cover_big?: string
  }>
  info?: Record<string, unknown>
  episodes?: Record<string, XtreamEpisodeRaw[]>
}

export interface XtreamEpgListingRaw {
  id?: string | number
  epg_id?: string
  title?: string
  lang?: string
  start?: string
  end?: string
  description?: string
  channel_id?: string
  start_timestamp?: number | string
  stop_timestamp?: number | string
}
