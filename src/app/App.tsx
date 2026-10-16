import { AppProviders } from '@/app/providers/AppProviders'
import { AppRoutes } from '@/app/AppRoutes'
import { ErrorBoundary } from '@/shared/components/feedback/ErrorBoundary'
import '@/shared/theme/global.css'

export default function App() {
  return (
    <AppProviders>
      <ErrorBoundary>
        <AppRoutes />
      </ErrorBoundary>
    </AppProviders>
  )
}
