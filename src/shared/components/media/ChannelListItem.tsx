import { Heart, Radio } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { cn } from '@/shared/utils/cn'
import styles from './ChannelListItem.module.css'

interface ChannelListItemProps {
  name: string
  number?: number
  logoUrl?: string
  active?: boolean
  isFavorite?: boolean
  onSelect?: () => void
  onToggleFavorite?: () => void
}

export function ChannelListItem({
  name,
  number,
  logoUrl,
  active,
  isFavorite,
  onSelect,
  onToggleFavorite,
}: ChannelListItemProps) {
  return (
    <div className={cn(styles.item, active && styles.active)}>
      <button type="button" className={styles.main} onClick={onSelect}>
        <div className={styles.logo}>
          {logoUrl ? (
            <img src={logoUrl} alt="" loading="lazy" />
          ) : (
            <span aria-hidden>
              <Radio size={16} />
            </span>
          )}
        </div>
        <div className={styles.meta}>
          {typeof number === 'number' ? <span className={styles.number}>{number}</span> : null}
          <strong>{name}</strong>
        </div>
        {active ? <span className={styles.liveDot} aria-label="Reproduzindo" /> : null}
      </button>
      {onToggleFavorite ? (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Favoritar canal"
          className={cn(styles.fav, isFavorite && styles.favActive)}
          onClick={onToggleFavorite}
        >
          <Heart size={15} fill={isFavorite ? 'currentColor' : 'none'} />
        </Button>
      ) : null}
    </div>
  )
}
