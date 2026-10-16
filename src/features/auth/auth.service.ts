import type { AccountInfo, ConnectionCredentials } from '@/shared/types/auth'
import { iptvService } from '@/services/iptv/IptvService'
import { storageService } from '@/services/storage/StorageService'
import { StorageKeys } from '@/services/storage/StorageKeys'

export interface RestoredSession {
  serverUrl: string
  username: string
  password: string
  /** true = veio do localStorage com "lembrar"; false = só sessionStorage (aba). */
  remembered: boolean
}

function readSessionStorage(): RestoredSession | null {
  try {
    const raw = sessionStorage.getItem(StorageKeys.session)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<RestoredSession>
    if (!parsed.serverUrl || !parsed.username || !parsed.password) return null
    return {
      serverUrl: parsed.serverUrl,
      username: parsed.username,
      password: parsed.password,
      remembered: false,
    }
  } catch {
    return null
  }
}

function writeSessionStorage(session: Omit<RestoredSession, 'remembered'>): void {
  try {
    sessionStorage.setItem(
      StorageKeys.session,
      JSON.stringify({
        serverUrl: session.serverUrl,
        username: session.username,
        password: session.password,
      }),
    )
  } catch {
    // quota / private mode — ignora
  }
}

function clearSessionStorage(): void {
  try {
    sessionStorage.removeItem(StorageKeys.session)
  } catch {
    // ignore
  }
}

export class AuthRepository {
  async login(credentials: ConnectionCredentials): Promise<AccountInfo> {
    const { account } = await iptvService.connect(credentials)

    // Sempre mantém sessão da aba para F5 funcionar.
    writeSessionStorage({
      serverUrl: credentials.serverUrl,
      username: credentials.username,
      password: credentials.password,
    })

    storageService.saveCredentials({
      serverUrl: credentials.serverUrl,
      username: credentials.username,
      password: credentials.rememberCredentials ? credentials.password : undefined,
      rememberCredentials: credentials.rememberCredentials,
    })

    if (!credentials.rememberCredentials) {
      const existing = storageService.getCredentials()
      if (existing) {
        storageService.saveCredentials({
          ...existing,
          password: undefined,
          rememberCredentials: false,
        })
      }
    }

    return account
  }

  restoreSessionFromStorage(): RestoredSession | null {
    const saved = storageService.getCredentials()
    if (saved?.serverUrl && saved.username && saved.password && saved.rememberCredentials) {
      iptvService.restoreSession({
        serverUrl: saved.serverUrl,
        username: saved.username,
        password: saved.password,
      })
      // Espelha na sessão da aba para próximos F5 nesta sessão.
      writeSessionStorage({
        serverUrl: saved.serverUrl,
        username: saved.username,
        password: saved.password,
      })
      return {
        serverUrl: saved.serverUrl,
        username: saved.username,
        password: saved.password,
        remembered: true,
      }
    }

    const ephemeral = readSessionStorage()
    if (ephemeral) {
      iptvService.restoreSession({
        serverUrl: ephemeral.serverUrl,
        username: ephemeral.username,
        password: ephemeral.password,
      })
      return ephemeral
    }

    return null
  }

  async revalidateStoredSession(): Promise<AccountInfo | null> {
    const restored = this.restoreSessionFromStorage()
    if (!restored) return null

    const { account } = await iptvService.connect({
      serverUrl: restored.serverUrl,
      username: restored.username,
      password: restored.password,
      rememberCredentials: restored.remembered,
    })
    return account
  }

  logout(clearCredentials: boolean): void {
    iptvService.disconnect()
    clearSessionStorage()
    if (clearCredentials) {
      storageService.clearCredentials()
    } else {
      const existing = storageService.getCredentials()
      if (existing) {
        storageService.saveCredentials({
          ...existing,
          password: undefined,
          rememberCredentials: false,
        })
      }
    }
  }

  getSavedLoginForm() {
    const saved = storageService.getCredentials()
    const session = readSessionStorage()
    return {
      serverUrl:
        saved?.serverUrl ??
        session?.serverUrl ??
        import.meta.env.VITE_DEFAULT_SERVER_URL ??
        '',
      username: saved?.username ?? session?.username ?? '',
      password: saved?.rememberCredentials
        ? (saved.password ?? '')
        : (session?.password ?? ''),
      rememberCredentials: Boolean(saved?.rememberCredentials && saved.password),
    }
  }
}

export const authRepository = new AuthRepository()
