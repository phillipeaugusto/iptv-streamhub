import { afterEach, describe, expect, it, vi } from 'vitest'
import Hls from 'hls.js'
import { attachPlayer, PlayerServiceError } from '@/services/player/PlayerService'

vi.mock('hls.js', () => {
  class HlsMock {
    static supported = false
    static latest: HlsMock | null = null
    static Events = {
      MANIFEST_PARSED: 'manifestParsed',
      ERROR: 'error',
      FRAG_LOADED: 'fragLoaded',
    }
    static ErrorTypes = {
      NETWORK_ERROR: 'networkError',
      MEDIA_ERROR: 'mediaError',
    }
    static isSupported() {
      return HlsMock.supported
    }

    handlers = new Map<string, Array<(event: string, data: unknown) => void>>()
    startLoad = vi.fn()
    recoverMediaError = vi.fn()
    destroy = vi.fn()
    loadSource() {}
    attachMedia() {}

    constructor() {
      HlsMock.latest = this
    }

    on(event: string, callback: (event: string, data: unknown) => void) {
      const list = this.handlers.get(event) ?? []
      list.push(callback)
      this.handlers.set(event, list)
    }

    emit(event: string, data: unknown) {
      for (const callback of this.handlers.get(event) ?? []) callback(event, data)
    }
  }
  return { default: HlsMock }
})

type HlsMockInstance = {
  startLoad: ReturnType<typeof vi.fn>
  emit: (event: string, data: unknown) => void
}

function createVideo(overrides: Partial<HTMLVideoElement> = {}): HTMLVideoElement {
  const listeners = new Map<string, Set<EventListener>>()
  return {
    src: '',
    volume: 1,
    muted: false,
    currentTime: 0,
    paused: true,
    ended: false,
    readyState: 0,
    buffered: { length: 0, end: () => 0 },
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
    ...overrides,
  } as unknown as HTMLVideoElement
}

afterEach(() => {
  ;(Hls as unknown as { supported: boolean }).supported = false
})

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

  it('não avisa erro de rede enquanto o vídeo ainda tem imagem', () => {
    ;(Hls as unknown as { supported: boolean }).supported = true
    const onError = vi.fn()
    const video = createVideo({ readyState: HTMLMediaElement.HAVE_CURRENT_DATA, paused: false })
    const player = attachPlayer({
      video,
      url: 'http://iptv.example/live/user/pass/1.m3u8',
      allowedOrigin: 'http://iptv.example',
      autoplay: false,
      onError,
    })
    const hls = (Hls as unknown as { latest: HlsMockInstance }).latest

    hls.emit(Hls.Events.ERROR, { fatal: true, type: Hls.ErrorTypes.NETWORK_ERROR })

    expect(hls.startLoad).toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
    player.destroy()
  })

  it('avisa erro de rede só depois de esgotar o buffer e as tentativas', () => {
    ;(Hls as unknown as { supported: boolean }).supported = true
    const onError = vi.fn()
    const video = createVideo()
    const player = attachPlayer({
      video,
      url: 'http://iptv.example/live/user/pass/1.m3u8',
      allowedOrigin: 'http://iptv.example',
      autoplay: false,
      onError,
    })
    const hls = (Hls as unknown as { latest: HlsMockInstance }).latest
    const fatal = { fatal: true, type: Hls.ErrorTypes.NETWORK_ERROR }

    hls.emit(Hls.Events.ERROR, fatal)
    hls.emit(Hls.Events.ERROR, fatal)
    hls.emit(Hls.Events.ERROR, fatal)
    expect(onError).not.toHaveBeenCalled()

    hls.emit(Hls.Events.ERROR, fatal)
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0][0]).toBeInstanceOf(PlayerServiceError)
    player.destroy()
  })
})
