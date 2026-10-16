import Hls from 'hls.js'

export type PlayerErrorCode = 'unsupported' | 'media' | 'network' | 'hls' | 'origin'

export class PlayerServiceError extends Error {
  readonly code: PlayerErrorCode

  constructor(code: PlayerErrorCode, message: string) {
    super(message)
    this.name = 'PlayerServiceError'
    this.code = code
  }
}

export interface AttachPlayerOptions {
  video: HTMLVideoElement
  url: string
  allowedOrigin: string
  autoplay?: boolean
  startPosition?: number
  onError?: (error: PlayerServiceError) => void
  onReady?: () => void
  onManifestParsed?: (levels: Array<{ height?: number; bitrate: number; index: number }>) => void
}

export interface AttachedPlayer {
  destroy: () => void
  setQuality: (levelIndex: number | 'auto') => void
  getQualities: () => Array<{ height?: number; bitrate: number; index: number }>
}

function assertAllowedOrigin(url: string, allowedOrigin: string): void {
  let playback: URL
  let allowed: URL
  try {
    playback = new URL(url)
    allowed = new URL(allowedOrigin)
  } catch {
    throw new PlayerServiceError('origin', 'URL de reprodução inválida.')
  }

  const sameAsAllowed = playback.origin === allowed.origin
  const sameAsPage =
    typeof window !== 'undefined' && playback.origin === window.location.origin

  // Direct IPTV origin, or same-origin Docker proxy (/iptv-proxy/...).
  if (!sameAsAllowed && !sameAsPage) {
    throw new PlayerServiceError(
      'origin',
      'A URL de reprodução não pertence à origem do servidor autenticado.',
    )
  }
}

function isHlsUrl(url: string): boolean {
  return /\.m3u8(\?|$)/i.test(url) || url.includes('/live/')
}

export function attachPlayer(options: AttachPlayerOptions): AttachedPlayer {
  const {
    video,
    url,
    allowedOrigin,
    autoplay = true,
    startPosition,
    onError,
    onReady,
    onManifestParsed,
  } = options

  assertAllowedOrigin(url, allowedOrigin)

  let hls: Hls | null = null
  let destroyed = false
  let qualities: Array<{ height?: number; bitrate: number; index: number }> = []
  let networkRetries = 0
  let lastNetworkRecoveryAt = 0

  const playbackCanContinue = () => {
    if (video.ended) return false
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return true
    if (video.buffered.length === 0) return false
    const end = video.buffered.end(video.buffered.length - 1)
    return end - video.currentTime > 0.4
  }

  const reportIfStuck = (error: PlayerServiceError) => {
    if (destroyed || playbackCanContinue()) return
    onError?.(error)
  }

  const handleMediaError = () => {
    reportIfStuck(new PlayerServiceError('media', 'Falha ao decodificar ou reproduzir o conteúdo.'))
  }

  video.addEventListener('error', handleMediaError)

  const tryPlay = async () => {
    if (!autoplay || destroyed) return
    try {
      await video.play()
    } catch {
      // Autoplay pode ser bloqueado pelo navegador; o usuário pode iniciar manualmente.
    }
  }

  const applyStartAndPlay = () => {
    if (typeof startPosition === 'number' && startPosition > 0) {
      video.currentTime = startPosition
    }
    onReady?.()
    void tryPlay()
  }

  if (isHlsUrl(url) && Hls.isSupported()) {
    hls = new Hls({
      enableWorker: true,
      // Painéis Xtream usam HLS comum. Low-latency gera erro fatal de rede
      // em playlist que não é LL-HLS, mesmo com o vídeo ainda no buffer.
      lowLatencyMode: false,
      backBufferLength: 90,
      maxMaxBufferLength: 60,
      xhrSetup: (xhr) => {
        xhr.withCredentials = false
      },
    })
    hls.loadSource(url)
    hls.attachMedia(video)
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      qualities = (hls?.levels ?? []).map((level, index) => ({
        index,
        height: level.height,
        bitrate: level.bitrate,
      }))
      onManifestParsed?.(qualities)
      applyStartAndPlay()
    })
    hls.on(Hls.Events.FRAG_LOADED, () => {
      networkRetries = 0
    })
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (!data.fatal || destroyed) return

      if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
        const now = Date.now()
        if (now - lastNetworkRecoveryAt > 1000) {
          lastNetworkRecoveryAt = now
          hls?.startLoad()
        }
        networkRetries += 1
        // Enquanto houver imagem, o erro de um segmento não pode cobrir o vídeo.
        if (playbackCanContinue() || networkRetries < 4) return
        reportIfStuck(
          new PlayerServiceError(
            'network',
            'Falha ao carregar o stream. A rede caiu e não há mais buffer para continuar.',
          ),
        )
        return
      }

      if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
        hls?.recoverMediaError()
        reportIfStuck(new PlayerServiceError('hls', 'Erro de mídia HLS. Tentando recuperar…'))
        return
      }

      reportIfStuck(
        new PlayerServiceError(
          'hls',
          'Falha ao carregar o stream. Verifique se o servidor libera CORS para mídia HLS e se a URL está acessível.',
        ),
      )
    })
  } else if (isHlsUrl(url) && video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = url
    video.addEventListener('loadedmetadata', applyStartAndPlay, { once: true })
  } else if (!isHlsUrl(url)) {
    video.src = url
    video.addEventListener('loadedmetadata', applyStartAndPlay, { once: true })
  } else {
    throw new PlayerServiceError(
      'unsupported',
      'Este navegador não oferece suporte a HLS.js nem a reprodução nativa de HLS.',
    )
  }

  return {
    destroy: () => {
      destroyed = true
      video.removeEventListener('error', handleMediaError)
      if (hls) {
        hls.destroy()
        hls = null
      }
      video.removeAttribute('src')
      video.load()
    },
    setQuality: (levelIndex) => {
      if (!hls) return
      hls.currentLevel = levelIndex === 'auto' ? -1 : levelIndex
    },
    getQualities: () => qualities,
  }
}
