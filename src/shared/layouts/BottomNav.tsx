import { NavLink } from 'react-router-dom'
import { Clapperboard, Heart, Home, MonitorPlay, Tv } from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import styles from './BottomNav.module.css'

const links = [
  { to: '/', label: 'Principal', icon: Home, end: true },
  { to: '/live', label: 'Ao vivo', icon: Tv },
  { to: '/movies', label: 'Filmes', icon: Clapperboard },
  { to: '/series', label: 'Séries', icon: MonitorPlay },
  { to: '/favorites', label: 'Lista', icon: Heart },
]

export function BottomNav() {
  return (
    <nav className={styles.nav} aria-label="Navegação móvel">
      {links.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => cn(styles.link, isActive && styles.active)}
        >
          <Icon size={20} strokeWidth={1.8} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
