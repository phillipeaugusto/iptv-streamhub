export type ContentKind = 'live' | 'movie' | 'series'

export interface Category {
  id: string
  name: string
  parentId?: string
  kind: ContentKind
  /** Inferido pelo nome da categoria retornada pelo servidor. */
  isAdult: boolean
}
