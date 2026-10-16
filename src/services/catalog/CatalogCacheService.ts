import type { Category } from '@/shared/types/category'
import type { Channel } from '@/shared/types/channel'
import type { Movie } from '@/shared/types/movie'
import type { SeriesItem } from '@/shared/types/series'

const DB_NAME = 'iptv.catalog'
const DB_VERSION = 1
const STORE = 'catalog'

export type CatalogBucket =
  | 'liveCategories'
  | 'liveChannels'
  | 'movieCategories'
  | 'movies'
  | 'seriesCategories'
  | 'series'

export interface CatalogScope {
  serverUrl: string
  username: string
}

export interface CatalogMeta {
  updatedAt: string
  counts: Partial<Record<CatalogBucket, number>>
}

type CatalogPayload =
  | Category[]
  | Channel[]
  | Movie[]
  | SeriesItem[]

interface CatalogRecord {
  key: string
  scopeKey: string
  bucket: CatalogBucket
  updatedAt: string
  data: CatalogPayload
}

function scopeKeyOf(scope: CatalogScope): string {
  return `${scope.serverUrl.trim().toLowerCase()}|${scope.username.trim().toLowerCase()}`
}

function recordKey(scope: CatalogScope, bucket: CatalogBucket): string {
  return `${scopeKeyOf(scope)}|${bucket}`
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponível.'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error ?? new Error('Falha ao abrir cache do catálogo.'))
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'key' })
        store.createIndex('scopeKey', 'scopeKey', { unique: false })
      }
    }
  })
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const store = tx.objectStore(STORE)
    let request: IDBRequest<T> | undefined
    try {
      const result = fn(store)
      if (result) request = result
    } catch (error) {
      reject(error)
      return
    }
    tx.oncomplete = () => {
      db.close()
      resolve(request ? request.result : undefined)
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error ?? new Error('Falha na transação do cache.'))
    }
    if (request) {
      request.onerror = () => {
        reject(request?.error ?? new Error('Falha na operação do cache.'))
      }
    }
  })
}

export class CatalogCacheService {
  async get<T extends CatalogPayload>(
    scope: CatalogScope,
    bucket: CatalogBucket,
  ): Promise<{ data: T; updatedAt: string } | null> {
    try {
      const record = await withStore<CatalogRecord | undefined>('readonly', (store) =>
        store.get(recordKey(scope, bucket)),
      )
      if (!record?.data) return null
      return { data: record.data as T, updatedAt: record.updatedAt }
    } catch {
      return null
    }
  }

  async set(scope: CatalogScope, bucket: CatalogBucket, data: CatalogPayload): Promise<void> {
    const record: CatalogRecord = {
      key: recordKey(scope, bucket),
      scopeKey: scopeKeyOf(scope),
      bucket,
      updatedAt: new Date().toISOString(),
      data,
    }
    try {
      await withStore('readwrite', (store) => {
        store.put(record)
      })
    } catch {
      // Quota / private mode — app continua sem cache persistente.
    }
  }

  async getMeta(scope: CatalogScope): Promise<CatalogMeta | null> {
    const buckets: CatalogBucket[] = [
      'liveCategories',
      'liveChannels',
      'movieCategories',
      'movies',
      'seriesCategories',
      'series',
    ]
    const counts: CatalogMeta['counts'] = {}
    let latest: string | null = null

    for (const bucket of buckets) {
      const entry = await this.get(scope, bucket)
      if (!entry) continue
      counts[bucket] = Array.isArray(entry.data) ? entry.data.length : 0
      if (!latest || entry.updatedAt > latest) latest = entry.updatedAt
    }

    if (!latest) return null
    return { updatedAt: latest, counts }
  }

  async clearScope(scope: CatalogScope): Promise<void> {
    try {
      const db = await openDb()
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite')
        const store = tx.objectStore(STORE)
        const index = store.index('scopeKey')
        const key = scopeKeyOf(scope)
        const request = index.openCursor(IDBKeyRange.only(key))
        request.onsuccess = () => {
          const cursor = request.result
          if (!cursor) return
          cursor.delete()
          cursor.continue()
        }
        tx.oncomplete = () => {
          db.close()
          resolve()
        }
        tx.onerror = () => {
          db.close()
          reject(tx.error)
        }
      })
    } catch {
      // ignore
    }
  }

  async clearAll(): Promise<void> {
    try {
      await withStore('readwrite', (store) => {
        store.clear()
      })
    } catch {
      // ignore
    }
  }
}

export const catalogCache = new CatalogCacheService()

export function filterByCategoryId<T extends { categoryIds: string[] }>(
  items: T[],
  categoryId?: string,
): T[] {
  if (!categoryId || categoryId === 'all') return items
  return items.filter((item) => item.categoryIds.includes(categoryId))
}
