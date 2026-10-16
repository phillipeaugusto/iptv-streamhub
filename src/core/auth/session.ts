import { useAuthStore } from '@/core/store/authStore'

/** Garante que o cliente IPTV tem credenciais antes de cada query. */
export function ensureSessionOrThrow(): void {
  const ok = useAuthStore.getState().ensureIptvSession()
  if (!ok) {
    throw new Error('Sessão IPTV indisponível. Faça login novamente.')
  }
}
