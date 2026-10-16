import { afterEach, describe, expect, it, vi } from 'vitest'
import { isIptvProxyEnabled, toProxiedIptvUrl } from '@/shared/utils/iptvProxy'

describe('iptvProxy', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('não altera URL quando o proxy está desligado', () => {
    vi.stubEnv('VITE_IPTV_PROXY', '')
    expect(isIptvProxyEnabled()).toBe(false)
    expect(toProxiedIptvUrl('http://iptv.example:8080/player_api.php')).toBe(
      'http://iptv.example:8080/player_api.php',
    )
  })

  it('reescreve para /iptv-proxy/h/{origin}/path quando ativo', () => {
    vi.stubEnv('VITE_IPTV_PROXY', '1')
    expect(isIptvProxyEnabled()).toBe(true)

    const out = toProxiedIptvUrl('http://iptv.example:8080/live/u/p/1.m3u8')
    expect(out).toContain('/iptv-proxy/h/')
    expect(out).toContain('/live/u/p/1.m3u8')
    expect(out).not.toContain('http://iptv.example:8080/live')
  })
})
