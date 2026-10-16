export interface ServerInfo {
  url: string
  port?: string
  httpsPort?: string
  serverProtocol?: string
  timezone?: string
  timestampNow?: number
  timeNow?: string
}

export interface UserInfo {
  username: string
  password?: string
  status?: string
  expDate?: string
  isTrial?: string
  activeConnections?: string
  maxConnections?: string
  createdAt?: string
  allowedOutputFormats?: string[]
  message?: string
  auth: boolean
}

export interface AccountInfo {
  userInfo: UserInfo
  serverInfo: ServerInfo
}

export interface ConnectionCredentials {
  serverUrl: string
  username: string
  password: string
  rememberCredentials: boolean
}

export interface SessionState {
  isAuthenticated: boolean
  credentials: Omit<ConnectionCredentials, 'rememberCredentials'> | null
  account: AccountInfo | null
  protocol: 'xtream' | null
  connectedAt: string | null
}

export type AuthFailureReason =
  | 'invalid_credentials'
  | 'server_unreachable'
  | 'cors_blocked'
  | 'api_not_found'
  | 'invalid_response'
  | 'network_error'
  | 'https_mixed_content'
  | 'unknown'

export class AuthError extends Error {
  readonly reason: AuthFailureReason
  readonly statusCode?: number

  constructor(reason: AuthFailureReason, message: string, statusCode?: number) {
    super(message)
    this.name = 'AuthError'
    this.reason = reason
    this.statusCode = statusCode
  }
}
