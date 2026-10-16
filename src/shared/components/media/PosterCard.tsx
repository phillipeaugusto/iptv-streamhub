import { Heart } from 'lucide-react'
import styles from './PosterCard.module.css'

interface PosterCardProps {
  title: string
  imageUrl?: string
  subtitle?: string
  isFavorite?: boolean
  onClick?: () => void
  onToggleFavorite?: () => void
}

export function PosterCard({
  title,
  imageUrl,
  subtitle,
  isFavorite,
  onClick,
  onToggleFavorite,
}: PosterCardProps) {
  return (
    <article className={styles.card}>
      <button type="button" className={styles.media} onClick={onClick}>
        {imageUrl ? (
          <img src={imageUrl} alt="" loading="lazy" decoding="async" />
        ) : (
          <div className={styles.placeholder}>{title.slice(0, 1)}</div>
        )}
        <div className={styles.overlay}>
          <strong>{title}</strong>
          {subtitle ? <span>{subtitle}</span> : null}
        </div>
      </button>
      {onToggleFavorite ? (
        <button
          type="button"
          className={`${styles.fav} ${isFavorite ? styles.favActive : ''}`}
          aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          onClick={onToggleFavorite}
        >
          <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      ) : null}
    </article>
  )
}
