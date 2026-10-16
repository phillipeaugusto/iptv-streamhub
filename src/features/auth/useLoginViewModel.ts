import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLocation, useNavigate } from 'react-router-dom'
import { AuthError } from '@/shared/types/auth'
import { authRepository } from './auth.service'
import { reasonLabel } from '@/services/iptv/IptvErrors'
import { useAuthStore } from '@/core/store/authStore'
import { normalizeServerUrl } from '@/shared/utils/url'
import { safeErrorMessage } from '@/shared/utils/safeLog'

const loginSchema = z.object({
  serverUrl: z.string().min(1, 'Informe o endereço do servidor.'),
  username: z.string().min(1, 'Informe o usuário.'),
  password: z.string().min(1, 'Informe a senha.'),
  rememberCredentials: z.boolean(),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export function useLoginViewModel() {
  const navigate = useNavigate()
  const location = useLocation()
  const setSession = useAuthStore((state) => state.setSession)
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [errorTitle, setErrorTitle] = useState<string | null>(null)

  const defaults = authRepository.getSavedLoginForm()

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: defaults,
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setErrorMessage(null)
    setErrorTitle(null)

    try {
      const serverUrl = normalizeServerUrl(values.serverUrl)
      const account = await authRepository.login({
        serverUrl,
        username: values.username.trim(),
        password: values.password,
        rememberCredentials: values.rememberCredentials,
      })

      setSession({
        account,
        serverUrl,
        username: values.username.trim(),
        password: values.password,
      })

      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from.startsWith('/') ? from : '/', { replace: true })
    } catch (error) {
      if (error instanceof AuthError) {
        setErrorTitle(reasonLabel(error.reason))
        setErrorMessage(error.message)
      } else {
        setErrorTitle('Falha na conexão')
        setErrorMessage(safeErrorMessage(error))
      }
    }
  })

  return {
    form,
    onSubmit,
    showPassword,
    setShowPassword,
    errorMessage,
    errorTitle,
    isSubmitting: form.formState.isSubmitting,
  }
}
