import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { BottomNav } from '@/shared/layouts/BottomNav'
import { Sidebar } from '@/shared/layouts/Sidebar'
import { GlobalSearch } from '@/shared/components/search/GlobalSearch'
import { AppHeader } from '@/shared/layouts/AppHeader'
import { useAuthStore } from '@/core/store/authStore'
import { usePreferencesStore } from '@/core/store/preferencesStore'
import styles from './AppShell.module.css'

const TITLE_MAP: Record<string, string> = {
  '/': 'Início',
  '/live': 'TV ao vivo',
  '/movies': 'Filmes',
  '/series': 'Séries',
  '/favorites': 'Minha lista',
  '/continue': 'Continuar assistindo',
  '/settings': 'Configurações',
  '/player': 'Player',
}

export function AppShell() {
  const logout = useAuthStore((state) => state.logout)
  const username = useAuthStore((state) => state.username)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const preferences = usePreferencesStore((state) => state.preferences)
  const setPreferences = usePreferencesStore((state) => state.setPreferences)
  const setLastSection = usePreferencesStore((state) => state.setLastSection)
  const navigate = useNavigate()
  const location = useLocation()
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    setLastSection(location.pathname)
  }, [location.pathname, setLastSection])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const title = useMemo(() => {
    if (location.pathname.startsWith('/player')) return TITLE_MAP['/player']
    return TITLE_MAP[location.pathname] ?? 'StreamHub'
  }, [location.pathname])

  const hideChrome = location.pathname.startsWith('/player')

  return (
    <div
      className={styles.shell}
      data-collapsed={preferences.sidebarCollapsed ? 'true' : 'false'}
    >
      <Sidebar
        collapsed={preferences.sidebarCollapsed}
        onToggleCollapsed={() =>
          setPreferences({ sidebarCollapsed: !preferences.sidebarCollapsed })
        }
        username={username}
        onLogout={() => {
          logout(false)
          navigate('/login', { replace: true })
        }}
      />

      <div className={styles.main}>
        {!hideChrome ? (
          <AppHeader
            title={title}
            subtitle={username ? `Conta · ${username}` : undefined}
            connected={isAuthenticated}
            onOpenSearch={() => setSearchOpen(true)}
          />
        ) : null}
        <main className={styles.content} data-player={hideChrome ? 'true' : 'false'}>
          <Outlet />
        </main>
      </div>

      {!hideChrome ? <BottomNav /> : null}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  )
}
