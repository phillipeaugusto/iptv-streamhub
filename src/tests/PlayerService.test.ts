import { describe, expect, it, vi } from 'vitest'
import { attachPlayer, PlayerServiceError } from '@/services/player/PlayerService'

vi.mock('hls.js', () => {
  class HlsMock {
    static isSupported() {
      return false
    }
    loadSource() {}
    attachMedia() {}
    on() {}
    destroy() {}
  }
  return { default: HlsMock }
})

function createVideo(): HTMLVideoElement {
  const listeners = new Map<string, Set<EventListener>>()
  return {
    src: '',
    volume: 1,
    muted: false,
    currentTime: 0,
    paused: true,
    canPlayType: () => '',
    play: vi.fn(async () => undefined),
    pause: vi.fn(),
    load: vi.fn(),
    removeAttribute: vi.fn(),
    addEventListener: (type: string, listener: EventListener) => {
      const set = listeners.get(type) ?? new Set()
      set.add(listener)
      listeners.set(type, set)
    },
    removeEventListener: (type: string, listener: EventListener) => {
      listeners.get(type)?.delete(listener)
    },
  } as unknown as HTMLVideoElement
}

describe('PlayerService', () => {
  it('rejeita URL fora da origem autenticada', () => {
    const video = createVideo()
    expect(() =>
      attachPlayer({
        video,
        url: 'http://evil.example/live/a/b/1.m3u8',
        allowedOrigin: 'http://iptv.example',
      }),
    ).toThrow(PlayerServiceError)
  })

  it('aceita MP4 da mesma origem e libera recursos no destroy', () => {
    const video = createVideo()
    const player = attachPlayer({
      video,
      url: 'http://iptv.example/movie/user/pass/10.mp4',
      allowedOrigin: 'http://iptv.example',
      autoplay: false,
    })
    expect(decodeURIComponent(video.src)).toContain('iptv.example/movie/')
    player.destroy()
    expect(video.removeAttribute).toHaveBeenCalledWith('src')
    expect(video.load).toHaveBeenCalled()
  })

  it('aceita URL do proxy na origem da página', () => {
    const video = createVideo()
    const pageOrigin = window.location.origin
    const player = attachPlayer({
      video,
      url: `${pageOrigin}/iptv-proxy/h/abc/movie/user/pass/10.mp4`,
      allowedOrigin: 'http://iptv.example',
      autoplay: false,
    })
    expect(video.src).toContain('/iptv-proxy/h/')
    player.destroy()
  })
})
