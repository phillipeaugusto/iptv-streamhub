import { useEffect, useRef } from 'react'
import { Button } from '@/shared/components/ui/Button'
import styles from './CatalogPager.module.css'

interface CatalogPagerProps {
  shown: number
  total: number
  hasMore: boolean
  onLoadMore: () => void
}

export function CatalogPager({ shown, total, hasMore, onLoadMore }: CatalogPagerProps) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const busyRef = useRef(false)

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((entry) => entry.isIntersecting)
        if (!visible) {
          busyRef.current = false
          return
        }
        if (busyRef.current) return
        busyRef.current = true
        onLoadMore()
      },
      { rootMargin: '240px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMore, onLoadMore])

  if (total === 0) return null

  return (
    <div className={styles.pager}>
      <p>
        Mostrando {shown} de {total}
      </p>
      {hasMore ? (
        <div ref={sentinelRef}>
          <Button variant="secondary" onClick={onLoadMore}>
            Carregar mais
          </Button>
        </div>
      ) : null}
    </div>
  )
}
