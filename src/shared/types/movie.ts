export interface Movie {
  id: string
  name: string
  posterUrl?: string
  backdropUrl?: string
  categoryIds: string[]
  rating?: string
  year?: string
  plot?: string
  cast?: string
  director?: string
  genre?: string
  duration?: string
  containerExtension?: string
  added?: string
}

export interface MovieDetails extends Movie {
  youtubeTrailer?: string
  releaseDate?: string
  country?: string
  bitrate?: number
}

export interface MoviePlayback {
  movieId: string
  url: string
  containerExtension?: string
}
