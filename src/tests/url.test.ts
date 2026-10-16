import { describe, expect, it } from 'vitest'
import { isSameOriginOrConfigured, normalizeServerUrl } from '@/shared/utils/url'

describe('normalizeServerUrl', () => {
  it('normaliza host sem protocolo', () => {
    expect(normalizeServerUrl('iptv.example')).toBe('http://iptv.example')
  })

  it('remove barra final', () => {
    expect(normalizeServerUrl('http://iptv.example/')).toBe('http://iptv.example')
  })

  it('valida origem do stream', () => {
    expect(
      isSameOriginOrConfigured('http://iptv.example', 'http://iptv.example/live/u/p/1.m3u8'),
    ).toBe(true)
    expect(
      isSameOriginOrConfigured('http://iptv.example', 'http://other.example/live/u/p/1.m3u8'),
    ).toBe(false)
  })
})
