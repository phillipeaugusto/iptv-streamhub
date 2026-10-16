export interface SeriesItem {
  id: string
  name: string
  posterUrl?: string
  backdropUrl?: string
  categoryIds: string[]
  rating?: string
  plot?: string
  cast?: string
  director?: string
  genre?: string
  releaseDate?: string
  lastModified?: string
}

export interface Episode {
  id: string
  seasonNumber: number
  episodeNumber: number
  title: string
  plot?: string
  duration?: string
  containerExtension?: string
  rating?: string
  coverUrl?: string
  releaseDate?: string
}

export interface Season {
  seasonNumber: number
  name: string
  episodes: Episode[]
  coverUrl?: string
}

export interface SeriesDetails extends SeriesItem {
  seasons: Season[]
  youtubeTrailer?: string
}

export interface EpisodePlayback {
  episodeId: string
  seriesId: string
  url: string
  containerExtension?: string
}
