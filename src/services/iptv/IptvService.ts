import type { AccountInfo, ConnectionCredentials } from '@/shared/types/auth'
import { AuthError } from '@/shared/types/auth'
import { mapAxiosErrorToAuthError } from './IptvErrors'
import { probeServerProtocol, type ProtocolProbeResult } from './ProtocolProbe'
import { xtreamClient, type XtreamSession } from './XtreamClient'

/**
 * Facade over the IPTV protocol used by this app.
 *
 * Primary protocol: Xtream Codes (`player_api.php`), documented for XUI panels
 * and matching username/password authentication expected by this UI.
 */
export class IptvService {
  async probe(serverUrl: string): Promise<ProtocolProbeResult> {
    return probeServerProtocol(serverUrl)
  }

  async connect(credentials: ConnectionCredentials): Promise<{
    account: AccountInfo
    probe: ProtocolProbeResult | null
  }> {
    let probe: ProtocolProbeResult | null = null

    try {
      const account = await xtreamClient.authenticate(credentials)
      try {
        probe = await this.probe(credentials.serverUrl)
      } catch {
        probe = null
      }
      return { account, probe }
    } catch (error) {
      const authError = mapAxiosErrorToAuthError(error)

      try {
        probe = await this.probe(credentials.serverUrl)
      } catch {
        probe = null
      }

      if (authError.reason === 'api_not_found' || authError.reason === 'cors_blocked') {
        const extra = probe?.notes?.length ? ` Detalhes da sondagem: ${probe.notes.join(' ')}` : ''
        if (probe && !probe.xtreamAvailable && probe.magPortalAvailable) {
          throw new AuthError(
            authError.reason,
            [
              'Este endereço só tem o portal MAG (portal.php), sem a API Xtream (player_api.php) que este app usa.',
              'Peça ao provedor o DNS/URL de Xtream Codes — o mesmo usado em apps como IPTV Smarters / TiviMate (costuma ser outro host ou porta, ex.: http://dns.provedor.com:8080).',
              'Não use a URL do portal MAG/stalker neste campo.',
              extra,
            ].join(' '),
            authError.statusCode,
          )
        }

        throw new AuthError(
          authError.reason,
          `${authError.message}${extra}`,
          authError.statusCode,
        )
      }

      throw authError
    }
  }

  getSession(): XtreamSession | null {
    return xtreamClient.getSession()
  }

  restoreSession(session: XtreamSession): void {
    xtreamClient.setSession(session)
  }

  disconnect(): void {
    xtreamClient.clearSession()
  }

  get client() {
    return xtreamClient
  }
}

export const iptvService = new IptvService()
