/**
 * When enabled (Docker/Coolify), browser requests go to same origin `/iptv-proxy/...`
 * and the container fetches the IPTV host — avoids CORS and HTTPS→HTTP mixed content.
 */

const PROXY_PREFIX = '/iptv-proxy/h/'

function base64UrlEncode(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function isIptvProxyEnabled(): boolean {
  return import.meta.env.VITE_IPTV_PROXY === '1' || import.meta.env.VITE_IPTV_PROXY === 'true'
}

/** Absolute IPTV URL → same-origin proxy URL (or unchanged when proxy off). */
export function toProxiedIptvUrl(absoluteUrl: string): string {
  if (!isIptvProxyEnabled()) return absoluteUrl

  let parsed: URL
  try {
    parsed = new URL(absoluteUrl)
  } catch {
    return absoluteUrl
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return absoluteUrl
  }

  const originKey = base64UrlEncode(parsed.origin)
  const path = `${PROXY_PREFIX}${originKey}${parsed.pathname}${parsed.search}`

  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${path}`
  }
  return path
}

/** Origin allowed for &lt;video&gt; / HLS when proxy rewrites playback to the app host. */
export function playbackAllowedOrigin(serverUrl: string): string {
  if (isIptvProxyEnabled() && typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return serverUrl
}
