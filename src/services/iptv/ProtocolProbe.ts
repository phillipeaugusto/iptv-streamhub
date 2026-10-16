import axios from 'axios'
import { toProxiedIptvUrl } from '@/shared/utils/iptvProxy'
import { joinUrl, normalizeServerUrl } from '@/shared/utils/url'

export type DetectedProtocol = 'xtream' | 'mag_portal' | 'unknown'

export interface ProtocolProbeResult {
  serverUrl: string
  protocol: DetectedProtocol
  xtreamAvailable: boolean
  magPortalAvailable: boolean
  xtreamStatus?: number
  magStatus?: number
  notes: string[]
}

/**
 * Probes known IPTV endpoints without inventing protocols.
 * Some panels expose Xtream (`player_api.php`); others only a MAG/Stalker portal (`portal.php`).
 */
export async function probeServerProtocol(serverUrlInput: string): Promise<ProtocolProbeResult> {
  const serverUrl = normalizeServerUrl(serverUrlInput)
  const notes: string[] = []
  let xtreamAvailable = false
  let magPortalAvailable = false
  let xtreamStatus: number | undefined
  let magStatus: number | undefined

  try {
    const xtreamResponse = await axios.get(toProxiedIptvUrl(joinUrl(serverUrl, 'player_api.php')), {
      params: { username: '__probe__', password: '__probe__' },
      timeout: 12000,
      validateStatus: () => true,
    })
    xtreamStatus = xtreamResponse.status
    if (xtreamResponse.status !== 404) {
      xtreamAvailable = true
      notes.push('Endpoint player_api.php respondeu (candidato Xtream Codes / XUI).')
    } else {
      notes.push('player_api.php retornou HTTP 404 — API Xtream Codes não disponível neste host.')
    }
  } catch {
    notes.push('Falha de rede/CORS ao sondar player_api.php.')
  }

  try {
    const magResponse = await axios.get(toProxiedIptvUrl(joinUrl(serverUrl, 'portal.php')), {
      params: { type: 'stb', action: 'handshake', JsHttpRequest: '1-xml' },
      timeout: 12000,
      validateStatus: () => true,
    })
    magStatus = magResponse.status
    if (magStatus === 200) {
      magPortalAvailable = true
      notes.push('portal.php respondeu — portal MAG/Stalker compatível detectado (comum em XUI).')
    }
  } catch {
    notes.push('Falha de rede/CORS ao sondar portal.php.')
  }

  let protocol: DetectedProtocol = 'unknown'
  if (xtreamAvailable) protocol = 'xtream'
  else if (magPortalAvailable) protocol = 'mag_portal'

  return {
    serverUrl,
    protocol,
    xtreamAvailable,
    magPortalAvailable,
    xtreamStatus,
    magStatus,
    notes,
  }
}
