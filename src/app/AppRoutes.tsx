import { lazy, Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes, Outlet } from 'react-router-dom'
import { AppShell } from '@/shared/layouts/AppShell'
import { Spinner } from '@/shared/components/feedback/Spinner'
import { ProtectedRoute } from '@/routes/ProtectedRoute'

const LoginView = lazy(() =>
  import('@/features/auth/LoginView').then((module) => ({ default: module.LoginView })),
)
const HomeView = lazy(() =>
  import('@/features/home/HomeView').then((module) => ({ default: module.HomeView })),
)
const LiveTvView = lazy(() =>
  import('@/features/live/LiveTvView').then((module) => ({ default: module.LiveTvView })),
)
const MoviesView = lazy(() =>
  import('@/features/movies/MoviesView').then((module) => ({ default: module.MoviesView })),
)
const SeriesView = lazy(() =>
  import('@/features/series/SeriesView').then((module) => ({ default: module.SeriesView })),
)
const PlayerView = lazy(() =>
  import('@/features/player/PlayerView').then((module) => ({ default: module.PlayerView })),
)
const FavoritesView = lazy(() =>
  import('@/features/favorites/FavoritesView').then((module) => ({ default: module.FavoritesView })),
)
const ContinueWatchingView = lazy(() =>
  import('@/features/continue/ContinueWatchingView').then((module) => ({
    default: module.ContinueWatchingView,
  })),
)
const SettingsView = lazy(() =>
  import('@/features/settings/SettingsView').then((module) => ({ default: module.SettingsView })),
)

function LazyFallback() {
  return (
    <div style={{ padding: '2rem', display: 'grid', placeItems: 'center' }}>
      <Spinner />
    </div>
  )
}

/** Suspense por rota: evita desmontar o layout/sidebar ao navegar. */
function SuspenseOutlet() {
  return (
    <Suspense fallback={<LazyFallback />}>
      <Outlet />
    </Suspense>
  )
}

export function AppRoutes() {
  return (
    <HashRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <Suspense fallback={<LazyFallback />}>
              <LoginView />
            </Suspense>
          }
        />
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route element={<SuspenseOutlet />}>
            <Route index element={<HomeView />} />
            <Route path="live" element={<LiveTvView />} />
            <Route path="movies" element={<MoviesView />} />
            <Route path="series" element={<SeriesView />} />
            <Route path="player" element={<PlayerView />} />
            <Route path="favorites" element={<FavoritesView />} />
            <Route path="continue" element={<ContinueWatchingView />} />
            <Route path="settings" element={<SettingsView />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
