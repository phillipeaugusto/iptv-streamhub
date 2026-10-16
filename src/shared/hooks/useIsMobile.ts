import { useEffect, useState } from 'react'

/** true quando o layout mobile está ativo (< 960px). */
export function useIsMobile(breakpointPx = 960): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return true
    return !window.matchMedia(`(min-width: ${breakpointPx}px)`).matches
  })

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${breakpointPx}px)`)
    const onChange = () => setIsMobile(!mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [breakpointPx])

  return isMobile
}
