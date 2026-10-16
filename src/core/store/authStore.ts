import { create } from 'zustand'
import type { AccountInfo } from '@/shared/types/auth'
import { authRepository } from '@/features/auth/auth.service'
import { clearCatalogCache } from '@/services/catalog/refreshCatalog'
import { iptvService } from '@/services/iptv/IptvService'
import { StorageKeys } from '@/services/storage/StorageKeys'

interface AuthStore {
  isAuthenticated: boolean
  isHydrated: boolean
  isRevalidating: boolean
  account: AccountInfo | null
  serverUrl: string | null
  username: string | null
  /** Mantida só em memória durante a sessão da aba (não é logada). */
  password: string | null
  setSession: (payload: {
    account: AccountInfo
    serverUrl: string
    username: string
    password: string
  }) => void
  ensureIptvSession: () => boolean
  hydrate: () => void
  revalidate: () => Promise<boolean>
  logout: (clearCredentials?: boolean) => void
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  isAuthenticated: false,
  isHydrated: false,
  isRevalidating: false,
  account: null,
  serverUrl: null,
  username: null,
  password: null,

  setSession: ({ account, serverUrl, username, password }) => {
    iptvService.restoreSession({ serverUrl, username, password })
    // Garante sessão da aba mesmo se o login já gravou — cobre setSession direto.
    try {
      sessionStorage.setItem(
        StorageKeys.session,
        JSON.stringify({ serverUrl, username, password }),
      )
    } catch {
      // ignore
    }
    set({
      isAuthenticated: true,
      account,
      serverUrl,
      username,
      password,
    })
  },

  ensureIptvSession: () => {
    const { serverUrl, username, password, isAuthenticated } = get()
    if (iptvService.getSession()) {
      return true
    }
    if (serverUrl && username && password) {
      iptvService.restoreSession({ serverUrl, username, password })
      return true
    }
    const saved = authRepository.restoreSessionFromStorage()
    if (saved) {
      set({
        serverUrl: saved.serverUrl,
        username: saved.username,
        password: saved.password,
        isAuthenticated: isAuthenticated || false,
      })
      return true
    }
    return false
  },

  hydrate: () => {
    const current = get()
    // Não apaga uma sessão ativa já estabelecida nesta aba (ex.: Strict Mode / remount).
    if (current.isAuthenticated && current.password && current.serverUrl && current.username) {
      iptvService.restoreSession({
        serverUrl: current.serverUrl,
        username: current.username,
        password: current.password,
      })
      set({ isHydrated: true })
      return
    }

    const restored = authRepository.restoreSessionFromStorage()
    if (restored) {
      set({
        isAuthenticated: false,
        isHydrated: true,
        serverUrl: restored.serverUrl,
        username: restored.username,
        password: restored.password,
      })
      return
    }

    set({ isHydrated: true })
  },

  revalidate: async () => {
    const state = get()
    const saved = authRepository.restoreSessionFromStorage()
    const credentials =
      saved ??
      (state.serverUrl && state.username && state.password
        ? {
            serverUrl: state.serverUrl,
            username: state.username,
            password: state.password,
            remembered: false,
          }
        : null)

    if (!credentials) {
      set({ isAuthenticated: false, isRevalidating: false })
      return false
    }

    set({ isRevalidating: true })
    try {
      const { account } = await iptvService.connect({
        serverUrl: credentials.serverUrl,
        username: credentials.username,
        password: credentials.password,
        rememberCredentials: Boolean(saved?.remembered),
      })
      set({
        isAuthenticated: true,
        account,
        serverUrl: credentials.serverUrl,
        username: credentials.username,
        password: credentials.password,
        isRevalidating: false,
      })
      return true
    } catch {
      set({
        isAuthenticated: false,
        isRevalidating: false,
        account: null,
        password: null,
      })
      return false
    }
  },

  logout: (clearCredentials = false) => {
    void clearCatalogCache()
    authRepository.logout(clearCredentials)
    set({
      isAuthenticated: false,
      account: null,
      password: null,
      serverUrl: clearCredentials ? null : get().serverUrl,
      username: clearCredentials ? null : get().username,
    })
  },
}))
