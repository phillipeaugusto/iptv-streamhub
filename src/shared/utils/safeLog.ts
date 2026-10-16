const SENSITIVE_KEYS = ['password', 'pass', 'token', 'authorization', 'cookie', 'mac']

export function redactSensitive(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(/(password|pass|token)=([^&\s]+)/gi, '$1=[REDACTED]')
  }

  if (Array.isArray(value)) {
    return value.map(redactSensitive)
  }

  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {}
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.some((item) => key.toLowerCase().includes(item))) {
        output[key] = '[REDACTED]'
      } else {
        output[key] = redactSensitive(nested)
      }
    }
    return output
  }

  return value
}

export function safeErrorMessage(error: unknown, fallback = 'Ocorreu um erro inesperado.'): string {
  if (error instanceof Error && error.message) {
    return error.message.replace(/(password|pass|token)=([^&\s]+)/gi, '$1=[REDACTED]')
  }
  return fallback
}
