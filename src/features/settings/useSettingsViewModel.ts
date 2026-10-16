import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCatalogRefresh } from '@/shared/hooks/useCatalogRefresh'
import { catalogCache, type CatalogMeta } from '@/services/catalog/CatalogCacheService'
import { clearCatalogCache } from '@/services/catalog/refreshCatalog'
import { getCatalogScope } from '@/services/catalog/catalogScope'
import { storageService } from '@/services/storage/StorageService'
import { useAuthStore } from '@/core/store/authStore'
import { usePreferencesStore } from '@/core/store/preferencesStore'

export function useSettingsViewModel() {
  const navigate = useNavigate()
  const account = useAuthStore((state) => state.account)
  const serverUrl = useAuthStore((state) => state.serverUrl)
  const username = useAuthStore((state) => state.username)
  const logout = useAuthStore((state) => state.logout)

  const preferences = usePreferencesStore((state) => state.preferences)
  const setPreferences = usePreferencesStore((state) => state.setPreferences)
  const enableAdultCategories = usePreferencesStore((state) => state.enableAdultCategories)
  const disableAdultCategories = usePreferencesStore((state) => state.disableAdultCategories)
  const playerPreferences = usePreferencesStore((state) => state.playerPreferences)
  const setPlayerPreferences = usePreferencesStore((state) => state.setPlayerPreferences)
  const clearLocalData = usePreferencesStore((state) => state.clearLocalData)

  const savedCredentials = storageService.getCredentials()
  const [message, setMessage] = useState<string | null>(null)
  const [adultConfirmOpen, setAdultConfirmOpen] = useState(false)
  const [catalogMeta, setCatalogMeta] = useState<CatalogMeta | null>(null)
  const { refresh, isRefreshing, error: refreshError } = useCatalogRefresh('all')

  const loadCatalogMeta = useCallback(async () => {
    const scope = getCatalogScope()
    if (!scope) {
      setCatalogMeta(null)
      return
    }
    setCatalogMeta(await catalogCache.getMeta(scope))
  }, [])

  useEffect(() => {
    void loadCatalogMeta()
  }, [loadCatalogMeta, serverUrl, username])

  return {
    account,
    serverUrl,
    username,
    preferences,
    setPreferences,
    playerPreferences,
    setPlayerPreferences,
    hasRememberedPassword: Boolean(savedCredentials?.rememberCredentials && savedCredentials.password),
    message: refreshError ?? message,
    adultConfirmOpen,
    setAdultConfirmOpen,
    catalogMeta,
    isRefreshingCatalog: isRefreshing,
    refreshCatalog: async () => {
      await refresh()
      await loadCatalogMeta()
      setMessage('Lista de canais, filmes e séries atualizada do servidor.')
    },
    requestEnableAdult: () => setAdultConfirmOpen(true),
    confirmEnableAdult: () => {
      enableAdultCategories()
      setAdultConfirmOpen(false)
      setMessage(
        'Conteúdo adulto liberado nesta sessão do navegador. Ele nunca é salvo no histórico nem em “continuar assistindo”.',
      )
    },
    disableAdult: () => {
      disableAdultCategories()
      setMessage(
        'Conteúdo adulto oculto. Itens adultos foram removidos do histórico e do progresso locais.',
      )
    },
    clearSavedCredentials: () => {
      storageService.clearCredentials()
      setMessage('Credenciais salvas foram removidas deste navegador.')
    },
    clearAllLocalData: () => {
      void clearCatalogCache()
      clearLocalData()
      logout(true)
      setMessage('Todos os dados locais foram apagados.')
      navigate('/login', { replace: true })
    },
    disconnect: () => {
      void clearCatalogCache()
      logout(false)
      navigate('/login', { replace: true })
    },
  }
}
