import { Heart, Play } from 'lucide-react'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { cn } from '@/shared/utils/cn'
import styles from './ContentCard.module.css'

interface ContentCardProps {
  title: string
  imageUrl?: string
  subtitle?: string
  badge?: string
  progress?: number
  isFavorite?: boolean
  selected?: boolean
  aspect?: 'poster' | 'square' | 'wide'
  onClick?: () => void
  onToggleFavorite?: () => void
  onPlay?: () => void
  className?: string
}

export function ContentCard({
  title,
  imageUrl,
  subtitle,
  badge,
  progress,
  isFavorite,
  selected,
  aspect = 'poster',
  onClick,
  onToggleFavorite,
  onPlay,
  className,
}: ContentCardProps) {
  return (
    <article className={cn(styles.card, selected && styles.selected, className)}>
      <button type="button" className={cn(styles.media, styles[aspect])} onClick={onClick}>
        {imageUrl ? (
          <img src={imageUrl} alt="" loading="lazy" decoding="async" />
        ) : (
          <div className={styles.fallback} aria-hidden>
            {title.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className={styles.overlay}>
          {onPlay ? (
            <span className={styles.play}>
              <Play size={18} fill="currentColor" />
            </span>
          ) : null}
        </div>
        {badge ? <Badge className={styles.badge}>{badge}</Badge> : null}
        {typeof progress === 'number' ? (
          <div className={styles.progressTrack} aria-hidden>
            <div className={styles.progressFill} style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
          </div>
        ) : null}
      </button>

      <div className={styles.meta}>
        <div className={styles.text}>
          <strong title={title}>{title}</strong>
          {subtitle ? <span>{subtitle}</span> : null}
        </div>
        {onToggleFavorite ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            className={cn(styles.fav, isFavorite && styles.favActive)}
            onClick={(event) => {
              event.stopPropagation()
              onToggleFavorite()
            }}
          >
            <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
          </Button>
        ) : null}
      </div>
    </article>
  )
}
