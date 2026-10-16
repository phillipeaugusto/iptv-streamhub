import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthError } from '@/shared/types/auth'
import { authRepository } from '@/features/auth/auth.service'
import { iptvService } from '@/services/iptv/IptvService'
import { storageService } from '@/services/storage/StorageService'

vi.mock('@/services/iptv/IptvService', () => ({
  iptvService: {
    connect: vi.fn(),
    restoreSession: vi.fn(),
    disconnect: vi.fn(),
  },
}))

describe('AuthRepository', () => {
  beforeEach(() => {
    storageService.clearAllAppData()
    vi.clearAllMocks()
  })

  it('realiza login válido e persiste credenciais quando solicitado', async () => {
    vi.mocked(iptvService.connect).mockResolvedValue({
      account: {
        userInfo: {
          username: 'demo',
          auth: true,
          status: 'Active',
        },
        serverInfo: { url: 'http://iptv.example' },
      },
      probe: null,
    })

    const account = await authRepository.login({
      serverUrl: 'http://iptv.example',
      username: 'demo',
      password: 'secret',
      rememberCredentials: true,
    })

    expect(account.userInfo.auth).toBe(true)
    expect(storageService.getCredentials()?.password).toBe('secret')
  })

  it('propaga login inválido sem simular sucesso', async () => {
    vi.mocked(iptvService.connect).mockRejectedValue(
      new AuthError('invalid_credentials', 'Usuário ou senha inválidos.'),
    )

    await expect(
      authRepository.login({
        serverUrl: 'http://iptv.example',
        username: 'demo',
        password: 'wrong',
        rememberCredentials: false,
      }),
    ).rejects.toBeInstanceOf(AuthError)
  })

  it('trata falha de rede/CORS', async () => {
    vi.mocked(iptvService.connect).mockRejectedValue(
      new AuthError('cors_blocked', 'Bloqueio de CORS'),
    )

    await expect(
      authRepository.login({
        serverUrl: 'http://iptv.example',
        username: 'demo',
        password: 'secret',
        rememberCredentials: false,
      }),
    ).rejects.toMatchObject({ reason: 'cors_blocked' })
  })
})
