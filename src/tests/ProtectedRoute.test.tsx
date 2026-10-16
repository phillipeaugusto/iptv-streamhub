import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { useAuthStore } from '@/core/store/authStore'

vi.mock('@/features/auth/auth.service', () => ({
  authRepository: {
    restoreSessionFromStorage: vi.fn(() => null),
    revalidateStoredSession: vi.fn(),
    logout: vi.fn(),
    getSavedLoginForm: vi.fn(() => ({
      serverUrl: 'http://iptv.example',
      username: '',
      password: '',
      rememberCredentials: false,
    })),
  },
}))

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({
      isAuthenticated: false,
      isHydrated: true,
      isRevalidating: false,
      account: null,
      serverUrl: null,
      username: null,
      password: null,
    })
  })

  it('redireciona para login quando não autenticado', async () => {
    render(
      <MemoryRouter initialEntries={['/private']}>
        <Routes>
          <Route
            path="/private"
            element={
              <ProtectedRoute>
                <div>Área privada</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Tela de login</div>} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Tela de login')).toBeInTheDocument()
    })
  })

  it('renderiza conteúdo protegido quando autenticado', () => {
    useAuthStore.setState({ isAuthenticated: true, isHydrated: true })

    render(
      <MemoryRouter initialEntries={['/private']}>
        <Routes>
          <Route
            path="/private"
            element={
              <ProtectedRoute>
                <div>Área privada</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Área privada')).toBeInTheDocument()
  })
})
