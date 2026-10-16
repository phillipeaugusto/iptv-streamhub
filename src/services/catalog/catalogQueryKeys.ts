/** Chaves compartilhadas — Home, TV, Filmes, Séries e busca usam o mesmo cache em memória. */
export const catalogQueryKeys = {
  liveCategories: ['catalog', 'liveCategories'] as const,
  liveChannels: ['catalog', 'liveChannels'] as const,
  movieCategories: ['catalog', 'movieCategories'] as const,
  movies: ['catalog', 'movies'] as const,
  seriesCategories: ['catalog', 'seriesCategories'] as const,
  series: ['catalog', 'series'] as const,
  all: ['catalog'] as const,
}

/** Cache local é a fonte de verdade; só atualiza via botão "Atualizar lista". */
export const CATALOG_STALE_TIME = Number.POSITIVE_INFINITY
export const CATALOG_GC_TIME = 1000 * 60 * 60 * 24
