import { AuthError, type AuthFailureReason } from '@/shared/types/auth'
import axios from 'axios'

export function mapAxiosErrorToAuthError(error: unknown): AuthError {
  if (error instanceof AuthError) {
    return error
  }

  if (axios.isAxiosError(error)) {
    if (error.code === 'ERR_NETWORK') {
      const requestUrl = String(error.config?.url ?? error.config?.baseURL ?? '')
      const viaProxy = requestUrl.includes('/iptv-proxy/')
      const isHttpsPage = typeof window !== 'undefined' && window.location.protocol === 'https:'
      const targetIsHttp =
        requestUrl.startsWith('http://') || error.config?.baseURL?.startsWith('http://')

      if (!viaProxy && isHttpsPage && targetIsHttp) {
        return new AuthError(
          'https_mixed_content',
          'O navegador bloqueou HTTP a partir de HTTPS (mixed content). Publique com o Dockerfile deste projeto (proxy ativo) ou use o app em HTTP na rede local.',
        )
      }
      return new AuthError(
        'cors_blocked',
        viaProxy
          ? 'Não foi possível alcançar o servidor IPTV a partir do proxy da VPS. Confira se o endereço está correto e se a VPS consegue acessar esse host (DNS/firewall).'
          : 'Não foi possível acessar o servidor a partir do navegador (CORS/rede). Em produção use o deploy Docker deste repo, que faz proxy e não depende de CORS do provedor.',
      )
    }

    if (error.response?.status === 404) {
      return new AuthError(
        'api_not_found',
        'O endpoint Xtream Codes (player_api.php) não foi encontrado neste servidor (HTTP 404). Verifique o endereço ou peça ao provedor para habilitar a API Xtream/XUI.',
        404,
      )
    }

    if (error.response?.status === 401 || error.response?.status === 403) {
      return new AuthError('invalid_credentials', 'Usuário ou senha inválidos.', error.response.status)
    }

    return new AuthError(
      'server_unreachable',
      `Falha ao contatar o servidor (HTTP ${error.response?.status ?? 'desconhecido'}).`,
      error.response?.status,
    )
  }

  if (error instanceof Error) {
    return new AuthError('unknown', error.message)
  }

  return new AuthError('unknown', 'Erro desconhecido ao autenticar.')
}

export function reasonLabel(reason: AuthFailureReason): string {
  switch (reason) {
    case 'invalid_credentials':
      return 'Credenciais inválidas'
    case 'cors_blocked':
      return 'Bloqueio de CORS / rede'
    case 'api_not_found':
      return 'API Xtream indisponível'
    case 'https_mixed_content':
      return 'Mixed content HTTPS/HTTP'
    case 'server_unreachable':
      return 'Servidor inacessível'
    case 'invalid_response':
      return 'Resposta inválida'
    case 'network_error':
      return 'Erro de rede'
    default:
      return 'Erro'
  }
}
