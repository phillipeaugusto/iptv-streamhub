import { Navigate, useLocation } from 'react-router-dom'
import { useEffect, useState, type ReactNode } from 'react'
import { Spinner } from '@/shared/components/feedback/Spinner'
import { useAuthStore } from '@/core/store/authStore'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isHydrated = useAuthStore((state) => state.isHydrated)
  const isRevalidating = useAuthStore((state) => state.isRevalidating)
  const revalidate = useAuthStore((state) => state.revalidate)
  const [tried, setTried] = useState(false)

  useEffect(() => {
    if (!isHydrated || isAuthenticated || tried) return
    setTried(true)
    void revalidate()
  }, [isHydrated, isAuthenticated, tried, revalidate])

  // Espera hydrate + tentativa de restaurar sessão antes de mandar pro login.
  // Sem isso, no F5 um render intermediário redirecionava antes do revalidate.
  if (!isHydrated || (!isAuthenticated && (!tried || isRevalidating))) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <Spinner label="Validando sessão…" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }

  return children
}
