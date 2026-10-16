import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { useAuthStore } from '@/core/store/authStore'
import { usePreferencesStore } from '@/core/store/preferencesStore'

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  const hydrateAuth = useAuthStore((state) => state.hydrate)
  const hydratePreferences = usePreferencesStore((state) => state.hydrate)

  useEffect(() => {
    hydratePreferences()
    hydrateAuth()
  }, [hydrateAuth, hydratePreferences])

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
