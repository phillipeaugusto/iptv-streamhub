import { NavLink } from 'react-router-dom'
import {
  Clapperboard,
  Heart,
  History,
  Home,
  LogOut,
  MonitorPlay,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Tv,
} from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { Separator } from '@/shared/components/ui/Separator'
import { cn } from '@/shared/utils/cn'
import styles from './Sidebar.module.css'

const links = [
  { to: '/', label: 'Início', icon: Home },
  { to: '/live', label: 'TV ao vivo', icon: Tv },
  { to: '/movies', label: 'Filmes', icon: Clapperboard },
  { to: '/series', label: 'Séries', icon: MonitorPlay },
  { to: '/favorites', label: 'Favoritos', icon: Heart },
  { to: '/continue', label: 'Continuar', icon: History },
  { to: '/settings', label: 'Configurações', icon: Settings },
]

interface SidebarProps {
  collapsed: boolean
  onToggleCollapsed: () => void
  username?: string | null
  onLogout: () => void
}

export function Sidebar({ collapsed, onToggleCollapsed, username, onLogout }: SidebarProps) {
  return (
    <aside className={cn(styles.sidebar, collapsed && styles.collapsed)} aria-label="Navegação principal">
      <div className={styles.brandRow}>
        {!collapsed ? (
          <div className={styles.brand}>
            <span className={styles.mark} aria-hidden />
            <div>
              <strong>StreamHub</strong>
              <small>Premium IPTV</small>
            </div>
          </div>
        ) : null}
        <Button
          variant="ghost"
          size="icon"
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          onClick={onToggleCollapsed}
          className={styles.collapseBtn}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </Button>
      </div>

      <nav className={styles.nav}>
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={collapsed ? label : undefined}
            className={({ isActive }) => cn(styles.link, isActive && styles.active)}
          >
            <Icon size={18} />
            {!collapsed ? <span>{label}</span> : <span className="sr-only">{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className={styles.footer}>
        <Separator />
        {!collapsed && username ? <p className={styles.user}>{username}</p> : null}
        <Button variant="ghost" className={styles.logout} onClick={onLogout}>
          <LogOut size={18} />
          {!collapsed ? <span>Desconectar</span> : <span className="sr-only">Desconectar</span>}
        </Button>
      </div>
    </aside>
  )
}
