import { Heart, Home, Search, Settings } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import styles from './AppHeader.module.css'

interface AppHeaderProps {
  title: string
  subtitle?: string
  connected?: boolean
  onOpenSearch?: () => void
}

export function AppHeader({ title, subtitle, connected = true, onOpenSearch }: AppHeaderProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const showHome = location.pathname !== '/'

  return (
    <header className={styles.header}>
      <div className={styles.leading}>
        {showHome ? (
          <Button
            variant="ghost"
            size="icon"
            className={styles.homeBtn}
            aria-label="Ir para o início"
            onClick={() => navigate('/')}
          >
            <Home size={18} />
          </Button>
        ) : null}
        <div className={styles.titles}>
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>

      <div className={styles.actions}>
        <Badge variant={connected ? 'success' : 'destructive'} className={styles.status}>
          {connected ? 'Online' : 'Offline'}
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          className={styles.searchIcon}
          onClick={onOpenSearch}
          aria-label="Buscar"
        >
          <Search size={18} />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={styles.search}
          onClick={onOpenSearch}
          aria-label="Buscar"
        >
          <Search size={16} />
          <span>Buscar</span>
          <kbd>⌘K</kbd>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={styles.desktopAction}
          aria-label="Favoritos"
          onClick={() => navigate('/favorites')}
        >
          <Heart size={18} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Configurações"
          onClick={() => navigate('/settings')}
        >
          <Settings size={18} />
        </Button>
      </div>
    </header>
  )
}
