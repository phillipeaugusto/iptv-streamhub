import { Skeleton } from '@/shared/components/ui/Skeleton'
import styles from './Skeleton.module.css'

export { Skeleton }

export function PosterSkeletonGrid({ count = 12 }: { count?: number }) {
  return (
    <div className={styles.grid}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={styles.card}>
          <Skeleton style={{ aspectRatio: '2 / 3', width: '100%', height: 'auto' }} />
          <Skeleton style={{ height: '0.85rem', width: '78%' }} />
        </div>
      ))}
    </div>
  )
}
