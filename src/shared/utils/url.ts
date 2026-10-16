export function normalizeServerUrl(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, '')
  if (!trimmed) {
    throw new Error('Endereço do servidor é obrigatório.')
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`

  let parsed: URL
  try {
    parsed = new URL(withProtocol)
  } catch {
    throw new Error('Endereço do servidor inválido.')
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('O servidor deve usar http:// ou https://.')
  }

  return `${parsed.protocol}//${parsed.host}`
}

export function isSameOriginOrConfigured(serverUrl: string, playbackUrl: string): boolean {
  try {
    const server = new URL(serverUrl)
    const playback = new URL(playbackUrl)
    return playback.origin === server.origin
  } catch {
    return false
  }
}

export function joinUrl(base: string, path: string): string {
  const normalizedBase = base.replace(/\/+$/, '')
  const normalizedPath = path.replace(/^\/+/, '')
  return `${normalizedBase}/${normalizedPath}`
}
