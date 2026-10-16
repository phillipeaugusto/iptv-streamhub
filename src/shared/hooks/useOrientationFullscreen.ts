import { useEffect, useRef, type RefObject } from 'react'

type VideoEl = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void
  webkitExitFullscreen?: () => void
  webkitDisplayingFullscreen?: boolean
}

function isPhoneLandscape(): boolean {
  if (typeof window === 'undefined') return false
  const landscape = window.matchMedia('(orientation: landscape)').matches
  if (!landscape) return false
  // Celular deitado: altura baixa e/ou ponteiro grosso
  const short = window.innerHeight <= 520
  const coarse =
    window.matchMedia('(pointer: coarse)').matches ||
    window.matchMedia('(hover: none)').matches
  return short || coarse
}

/**
 * Em paisagem no celular, coloca o player em tela cheia.
 * Ao voltar para retrato, restaura o layout anterior.
 */
export function useOrientationFullscreen(
  shellRef: RefObject<HTMLElement | null>,
  videoRef: RefObject<HTMLVideoElement | null>,
  active: boolean,
  /** Classe CSS do módulo (ex.: styles.landscapeFill). */
  fillClassName: string,
  onFullscreenChange?: (fullscreen: boolean) => void,
) {
  const autoRef = useRef(false)

  useEffect(() => {
    const shell = shellRef.current
    const video = videoRef.current as VideoEl | null
    if (!shell || !active) return

    const applyCssFill = (on: boolean) => {
      shell.classList.toggle(fillClassName, on)
      if (on) {
        document.documentElement.style.overflow = 'hidden'
        document.body.style.overflow = 'hidden'
      } else if (!document.fullscreenElement) {
        document.documentElement.style.overflow = ''
        document.body.style.overflow = ''
      }
    }

    const enter = async () => {
      if (autoRef.current) return

      // 1) Fullscreen API (Android / desktop)
      try {
        if (!document.fullscreenElement && shell.requestFullscreen) {
          await shell.requestFullscreen()
          autoRef.current = true
          onFullscreenChange?.(true)
          return
        }
      } catch {
        // iOS / políticas do browser — cai no fallback
      }

      // 2) Fullscreen nativo do vídeo (Safari iOS)
      try {
        if (video?.webkitEnterFullscreen && !video.webkitDisplayingFullscreen) {
          video.webkitEnterFullscreen()
          autoRef.current = true
          onFullscreenChange?.(true)
          return
        }
      } catch {
        // continua para CSS
      }

      // 3) Pseudo-fullscreen CSS (mais confiável no mobile web)
      applyCssFill(true)
      autoRef.current = true
      onFullscreenChange?.(true)
    }

    const exit = async () => {
      if (!autoRef.current) return
      autoRef.current = false
      applyCssFill(false)
      onFullscreenChange?.(false)

      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen()
        }
      } catch {
        // ignore
      }

      try {
        if (video?.webkitDisplayingFullscreen && video.webkitExitFullscreen) {
          video.webkitExitFullscreen()
        }
      } catch {
        // ignore
      }
    }

    const sync = () => {
      if (isPhoneLandscape()) {
        void enter()
      } else {
        void exit()
      }
    }

    sync()

    const mq = window.matchMedia('(orientation: landscape)')
    mq.addEventListener('change', sync)
    window.addEventListener('resize', sync)

    const onFsChange = () => {
      if (!document.fullscreenElement && autoRef.current && !isPhoneLandscape()) {
        autoRef.current = false
        applyCssFill(false)
        onFullscreenChange?.(false)
      }
    }
    document.addEventListener('fullscreenchange', onFsChange)

    return () => {
      mq.removeEventListener('change', sync)
      window.removeEventListener('resize', sync)
      document.removeEventListener('fullscreenchange', onFsChange)
      void exit()
    }
  }, [active, shellRef, videoRef, fillClassName, onFullscreenChange])
}
