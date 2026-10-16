import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/Card'
import { Input } from '@/shared/components/ui/Input'
import { Label } from '@/shared/components/ui/Label'
import { useLoginViewModel } from './useLoginViewModel'
import styles from '@/shared/theme/views.module.css'

export function LoginView() {
  const { form, onSubmit, showPassword, setShowPassword, errorMessage, errorTitle, isSubmitting } =
    useLoginViewModel()
  const {
    register,
    formState: { errors },
    watch,
  } = form

  const remember = watch('rememberCredentials')

  return (
    <div className={styles.loginPage}>
      <Card className={styles.loginCard}>
        <CardHeader>
          <div className={styles.loginBrand}>
            <span aria-hidden />
            <div>
              <CardTitle>StreamHub</CardTitle>
              <CardDescription>Conecte-se ao seu servidor IPTV autorizado</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate style={{ display: 'grid', gap: '1rem' }}>
            <div className={styles.field}>
              <Label htmlFor="serverUrl">Servidor (API Xtream)</Label>
              <Input
                id="serverUrl"
                placeholder="http://dns.seuprovedor.com:8080"
                inputMode="url"
                autoComplete="url"
                enterKeyHint="next"
                {...register('serverUrl')}
              />
              <span className={styles.detailsMeta}>
                Use o DNS Xtream do provedor (como no IPTV Smarters), não a URL do portal MAG.
              </span>
              {errors.serverUrl ? (
                <span className={styles.fieldError}>{errors.serverUrl.message}</span>
              ) : null}
            </div>

            <div className={styles.field}>
              <Label htmlFor="username">Usuário</Label>
              <Input
                id="username"
                autoComplete="username"
                enterKeyHint="next"
                {...register('username')}
              />
              {errors.username ? (
                <span className={styles.fieldError}>{errors.username.message}</span>
              ) : null}
            </div>

            <div className={styles.field}>
              <Label htmlFor="password">Senha</Label>
              <div className={styles.passwordRow}>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  enterKeyHint="go"
                  {...register('password')}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </div>
              {errors.password ? (
                <span className={styles.fieldError}>{errors.password.message}</span>
              ) : null}
            </div>

            <label className={styles.checkbox}>
              <input type="checkbox" {...register('rememberCredentials')} />
              <span>Lembrar meus dados neste navegador</span>
            </label>

            {remember ? (
              <Alert variant="warning">
                <AlertTitle>Armazenamento local</AlertTitle>
                <AlertDescription>
                  O localStorage não é um cofre seguro. A senha salva pode ser lida por scripts na
                  mesma origem. Use apenas em dispositivos de confiança.
                </AlertDescription>
              </Alert>
            ) : null}

            {errorMessage ? (
              <Alert variant="destructive">
                {errorTitle ? <AlertTitle>{errorTitle}</AlertTitle> : null}
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            ) : null}

            <Button type="submit" disabled={isSubmitting} style={{ width: '100%' }}>
              {isSubmitting ? <Loader2 size={16} className="spin" /> : null}
              {isSubmitting ? 'Conectando…' : 'Conectar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
