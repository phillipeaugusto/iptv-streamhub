import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Loader2,
} from 'lucide-react'
import { attachPlayer, type PlayerServiceError } from '@/services/player/PlayerService'
import { usePreferencesStore } from '@/core/store/preferencesStore'
import { useOrientationFullscreen } from '@/shared/hooks/useOrientationFullscreen'
import styles from './VideoPlayer.module.css'

interface VideoPlayerProps {
  url: string
  allowedOrigin: string
  title?: string
  startPosition?: number
  /** `theater` cobre a viewport (página /player). `fill` cobre o bloco pai. */
  layout?: 'inline' | 'theater' | 'fill'
  /** Ações do topo (Voltar, próximo). Some junto com os controles. */
  topBar?: ReactNode
  onProgress?: (position: number, duration: number) => void
  onEnded?: () => void
}

export function VideoPlayer({
  url,
  allowedOrigin,
  title,
  startPosition,
  layout = 'inline',
  topBar,
  onProgress,
  onEnded,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const shellRef = useRef<HTMLDivElement>(null)
  const onProgressRef = useRef(onProgress)
  const onEndedRef = useRef(onEnded)
  /** Resume só na montagem da URL — não recria o player a cada save de progresso. */
  const startPositionRef = useRef(startPosition)
  const playerPrefs = usePreferencesStore((state) => state.playerPreferences)
  const setPlayerPreferences = usePreferencesStore((state) => state.setPlayerPreferences)

  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [qualities, setQualities] = useState<
    Array<{ height?: number; bitrate: number; index: number }>
  >([])
  const [retryToken, setRetryToken] = useState(0)
  const [showChrome, setShowChrome] = useState(true)
  const [cover, setCover] = useState<{
    width: number
    height: number
    left: number
    top: number
  } | null>(null)
  const qualitySetterRef = useRef<((level: number | 'auto') => void) | null>(null)
  const hideChromeTimer = useRef<number | null>(null)

  onProgressRef.current = onProgress
  onEndedRef.current = onEnded

  const onOrientationFs = useCallback((value: boolean) => {
    setFullscreen(value)
  }, [])

  // Celular deitado + vídeo tocando → tela cheia; em pé → volta ao layout normal.
  useOrientationFullscreen(
    shellRef,
    videoRef,
    playing && Boolean(url),
    styles.landscapeFill,
    onOrientationFs,
  )

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  const bumpChrome = () => {
    setShowChrome(true)
    if (hideChromeTimer.current) window.clearTimeout(hideChromeTimer.current)
    hideChromeTimer.current = window.setTimeout(() => setShowChrome(false), 2800)
  }

  useEffect(() => {
    bumpChrome()
    return () => {
      if (hideChromeTimer.current) window.clearTimeout(hideChromeTimer.current)
    }
  }, [url])

  // Só recria o player quando a URL/origem mudam — não ao salvar progresso/volume.
  useEffect(() => {
    const video = videoRef.current
    if (!video || !url || !allowedOrigin) return

    setError(null)
    setLoading(true)
    setPlaying(false)
    setQualities([])
    startPositionRef.current = startPosition

    let attached: ReturnType<typeof attachPlayer> | null = null
    let lastProgressAt = 0
    const prefs = usePreferencesStore.getState().playerPreferences

    try {
      attached = attachPlayer({
        video,
        url,
        allowedOrigin,
        autoplay: prefs.autoplay,
        startPosition: startPositionRef.current,
        onReady: () => setLoading(false),
        onManifestParsed: (levels) => {
          setQualities(levels)
          setLoading(false)
        },
        onError: (playerError: PlayerServiceError) => {
          setError(playerError.message)
          setLoading(false)
        },
      })
      qualitySetterRef.current = attached.setQuality
      video.volume = prefs.volume
      video.muted = prefs.muted
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao iniciar o player.')
      setLoading(false)
    }

    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onWaiting = () => setLoading(true)
    const onPlaying = () => {
      setLoading(false)
      setError(null)
    }
    const onTimeUpdate = () => {
      setCurrent(video.currentTime)
      setDuration(video.duration || 0)
      const now = Date.now()
      if (now - lastProgressAt < 5000) return
      lastProgressAt = now
      onProgressRef.current?.(video.currentTime, video.duration || 0)
    }
    const onLoaded = () => {
      setLoading(false)
      setDuration(video.duration || 0)
    }
    const onEndedEvent = () => {
      onProgressRef.current?.(video.duration || 0, video.duration || 0)
      onEndedRef.current?.()
    }

    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('waiting', onWaiting)
    video.addEventListener('playing', onPlaying)
    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('loadedmetadata', onLoaded)
    video.addEventListener('canplay', onLoaded)
    video.addEventListener('ended', onEndedEvent)

    return () => {
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('waiting', onWaiting)
      video.removeEventListener('playing', onPlaying)
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('loadedmetadata', onLoaded)
      video.removeEventListener('canplay', onLoaded)
      video.removeEventListener('ended', onEndedEvent)
      attached?.destroy()
      qualitySetterRef.current = null
    }
    // startPosition intencional fora das deps — só aplica ao trocar URL/retry
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, allowedOrigin, retryToken])

  // Aplica volume/mute sem reiniciar o stream.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.volume = playerPrefs.volume
    video.muted = playerPrefs.muted
  }, [playerPrefs.volume, playerPrefs.muted])

  const togglePlay = async () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) await video.play()
    else video.pause()
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setPlayerPreferences({ muted: video.muted })
  }

  const onVolume = (value: number) => {
    const video = videoRef.current
    if (!video) return
    video.volume = value
    video.muted = value === 0
    setPlayerPreferences({ volume: value, muted: value === 0 })
  }

  const onSeek = (value: number) => {
    const video = videoRef.current
    if (!video || !Number.isFinite(video.duration)) return
    video.currentTime = value
  }

  useEffect(() => {
    const video = videoRef.current
    const shell = shellRef.current
    if (!video || !shell) return

    setCover(null)

    const fit = () => {
      const shellWidth = shell.clientWidth
      const shellHeight = shell.clientHeight
      if (!shellWidth || !shellHeight) return

      // Sem metadata ainda, assume 16:9 para já posicionar o quadro.
      const frameWidth = video.videoWidth || 16
      const frameHeight = video.videoHeight || 9
      // Em pé: o quadro inteiro fica no centro. Deitado: cobre a tela.
      const portrait = shellHeight > shellWidth
      const scale = portrait
        ? Math.min(shellWidth / frameWidth, shellHeight / frameHeight)
        : Math.max(shellWidth / frameWidth, shellHeight / frameHeight)
      const width = Math.ceil(frameWidth * scale)
      const height = Math.ceil(frameHeight * scale)
      const left = Math.round((shellWidth - width) / 2)
      const top = Math.round((shellHeight - height) / 2)
      setCover((current) => {
        if (
          current &&
          current.width === width &&
          current.height === height &&
          current.left === left &&
          current.top === top
        ) {
          return current
        }
        return { width, height, left, top }
      })
    }

    fit()
    video.addEventListener('loadedmetadata', fit)
    video.addEventListener('resize', fit)
    video.addEventListener('playing', fit)
    window.addEventListener('resize', fit)
    window.addEventListener('orientationchange', fit)
    const orientationQuery = window.matchMedia('(orientation: landscape)')
    orientationQuery.addEventListener('change', fit)
    const observer = new ResizeObserver(fit)
    observer.observe(shell)

    return () => {
      video.removeEventListener('loadedmetadata', fit)
      video.removeEventListener('resize', fit)
      video.removeEventListener('playing', fit)
      window.removeEventListener('resize', fit)
      window.removeEventListener('orientationchange', fit)
      orientationQuery.removeEventListener('change', fit)
      observer.disconnect()
    }
  }, [url, layout])

  const toggleFullscreen = async () => {
    const shell = shellRef.current
    if (!shell) return
    if (!document.fullscreenElement) {
      await shell.requestFullscreen()
      setFullscreen(true)
    } else {
      await document.exitFullscreen()
      setFullscreen(false)
    }
  }

  return (
    <div
      className={`${styles.shell} ${layout === 'theater' ? styles.theater : ''} ${layout === 'fill' ? styles.fill : ''} ${fullscreen ? styles.maximized : ''} ${showChrome ? styles.showChrome : ''}`}
      ref={shellRef}
      onPointerDown={bumpChrome}
      onPointerMove={(event) => {
        if (event.pointerType === 'touch') return
        bumpChrome()
      }}
    >
      {topBar ? <div className={styles.topActions}>{topBar}</div> : null}
      {title ? <div className={styles.title}>{title}</div> : null}
      <video
        ref={videoRef}
        className={styles.video}
        playsInline
        controls={false}
        style={
          cover
            ? {
                position: 'absolute',
                width: cover.width,
                height: cover.height,
                left: cover.left,
                top: cover.top,
                right: 'auto',
                bottom: 'auto',
                transform: 'none',
                margin: 0,
                maxWidth: 'none',
                maxHeight: 'none',
                aspectRatio: 'auto',
                objectFit: 'fill',
              }
            : undefined
        }
        onClick={() => {
          bumpChrome()
          void togglePlay()
        }}
      />

      {loading && !error ? (
        <div className={styles.overlay}>
          <Loader2 className={styles.spin} size={28} />
        </div>
      ) : null}

      {error ? (
        <div className={styles.overlay}>
          <p>{error}</p>
          <button
            type="button"
            onClick={() => {
              const current = videoRef.current
              const stillHasPicture =
                current &&
                !current.ended &&
                (current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA ||
                  (!current.paused && current.currentTime > 0))
              if (stillHasPicture) {
                setError(null)
                return
              }
              setRetryToken((value) => value + 1)
            }}
          >
            Tentar novamente
          </button>
        </div>
      ) : null}

      <div className={styles.controls}>
        <button type="button" onClick={togglePlay} aria-label={playing ? 'Pausar' : 'Reproduzir'}>
          {playing ? <Pause size={18} /> : <Play size={18} />}
        </button>

        <input
          className={styles.seek}
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Number.isFinite(current) ? current : 0}
          onChange={(event) => onSeek(Number(event.target.value))}
          aria-label="Progresso"
        />

        <button type="button" onClick={toggleMute} aria-label="Mudo">
          {playerPrefs.muted || playerPrefs.volume === 0 ? (
            <VolumeX size={18} />
          ) : (
            <Volume2 size={18} />
          )}
        </button>

        <input
          className={styles.volume}
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={playerPrefs.volume}
          onChange={(event) => onVolume(Number(event.target.value))}
          aria-label="Volume"
        />

        {qualities.length > 0 ? (
          <select
            aria-label="Qualidade"
            defaultValue="auto"
            onChange={(event) => {
              const value = event.target.value
              qualitySetterRef.current?.(value === 'auto' ? 'auto' : Number(value))
              setPlayerPreferences({ preferredQuality: value })
            }}
          >
            <option value="auto">Auto</option>
            {qualities.map((quality) => (
              <option key={quality.index} value={quality.index}>
                {quality.height
                  ? `${quality.height}p`
                  : `${Math.round(quality.bitrate / 1000)} kbps`}
              </option>
            ))}
          </select>
        ) : null}

        <button type="button" onClick={toggleFullscreen} aria-label="Tela cheia">
          {fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </div>
    </div>
  )
}
