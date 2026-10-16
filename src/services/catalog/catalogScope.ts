import { iptvService } from '@/services/iptv/IptvService'
import { useAuthStore } from '@/core/store/authStore'
import type { CatalogScope } from './CatalogCacheService'

export function getCatalogScope(): CatalogScope | null {
  const session = iptvService.getSession()
  if (session?.serverUrl && session.username) {
    return { serverUrl: session.serverUrl, username: session.username }
  }

  const { serverUrl, username } = useAuthStore.getState()
  if (serverUrl && username) {
    return { serverUrl, username }
  }

  return null
}

export function requireCatalogScope(): CatalogScope {
  const scope = getCatalogScope()
  if (!scope) {
    throw new Error('Sessão IPTV ausente para cache do catálogo.')
  }
  return scope
}
