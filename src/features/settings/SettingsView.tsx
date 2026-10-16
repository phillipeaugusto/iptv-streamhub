import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/Alert'
import { Button } from '@/shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/Card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/shared/components/ui/Dialog'
import { Separator } from '@/shared/components/ui/Separator'
import { useSettingsViewModel } from './useSettingsViewModel'
import styles from '@/shared/theme/views.module.css'

export function SettingsView() {
  const vm = useSettingsViewModel()

  return (
    <div className={styles.page}>
      <div className={styles.settingsGrid}>
        <Card>
          <CardHeader>
            <CardTitle>Conta</CardTitle>
            <CardDescription>Informações da sessão atual</CardDescription>
          </CardHeader>
          <CardContent className={styles.details}>
            <p className={styles.detailsMeta}>Servidor: {vm.serverUrl}</p>
            <p className={styles.detailsMeta}>Usuário: {vm.username}</p>
            {vm.account?.userInfo.expDate ? (
              <p className={styles.detailsMeta}>Expiração: {vm.account.userInfo.expDate}</p>
            ) : null}
            <p className={styles.detailsMeta}>
              Senha lembrada: {vm.hasRememberedPassword ? 'sim' : 'não'}
            </p>
            <div className={styles.toolbar}>
              <Button variant="secondary" onClick={vm.clearSavedCredentials}>
                Apagar credenciais salvas
              </Button>
              <Button variant="outline" onClick={vm.disconnect}>
                Desconectar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Privacidade e conteúdo</CardTitle>
            <CardDescription>
              Conteúdo adulto nunca entra no histórico nem em “continuar assistindo”.
            </CardDescription>
          </CardHeader>
          <CardContent className={styles.details}>
            <Alert variant="warning">
              <AlertTitle>Proteção ativa</AlertTitle>
              <AlertDescription>
                Categorias adultas ficam ocultas por padrão. Ao desativar, o app remove do
                armazenamento local qualquer vestígio adulto em histórico e progresso.
              </AlertDescription>
            </Alert>
            <div className={styles.settingsRow}>
              <span>Exibir categorias adultas</span>
              {vm.preferences.showAdultCategories ? (
                <Button variant="secondary" size="sm" onClick={vm.disableAdult}>
                  Ocultar agora
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={vm.requestEnableAdult}>
                  Liberar…
                </Button>
              )}
            </div>
            {vm.message ? <p className={styles.detailsMeta}>{vm.message}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Interface</CardTitle>
          </CardHeader>
          <CardContent className={styles.details}>
            <label className={styles.settingsRow}>
              <span>Modo compacto</span>
              <input
                type="checkbox"
                checked={vm.preferences.compactMode}
                onChange={(event) => vm.setPreferences({ compactMode: event.target.checked })}
              />
            </label>
            <label className={styles.settingsRow}>
              <span>Sidebar recolhida (desktop)</span>
              <input
                type="checkbox"
                checked={vm.preferences.sidebarCollapsed}
                onChange={(event) =>
                  vm.setPreferences({ sidebarCollapsed: event.target.checked })
                }
              />
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Player</CardTitle>
          </CardHeader>
          <CardContent className={styles.details}>
            <label className={styles.settingsRow}>
              <span>Reprodução automática</span>
              <input
                type="checkbox"
                checked={vm.playerPreferences.autoplay}
                onChange={(event) => vm.setPlayerPreferences({ autoplay: event.target.checked })}
              />
            </label>
            <label className={styles.settingsRow}>
              <span>Volume padrão</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={vm.playerPreferences.volume}
                onChange={(event) =>
                  vm.setPlayerPreferences({ volume: Number(event.target.value) })
                }
              />
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Catálogo offline</CardTitle>
            <CardDescription>
              Canais, filmes e séries ficam em cache neste dispositivo para abrir mais rápido.
            </CardDescription>
          </CardHeader>
          <CardContent className={styles.details}>
            <p className={styles.detailsMeta}>
              {vm.catalogMeta
                ? `Última atualização: ${new Date(vm.catalogMeta.updatedAt).toLocaleString('pt-BR')}`
                : 'Ainda sem cache — a primeira abertura baixa a lista do servidor.'}
            </p>
            {vm.catalogMeta?.counts ? (
              <p className={styles.detailsMeta}>
                {[
                  vm.catalogMeta.counts.liveChannels != null
                    ? `${vm.catalogMeta.counts.liveChannels} canais`
                    : null,
                  vm.catalogMeta.counts.movies != null
                    ? `${vm.catalogMeta.counts.movies} filmes`
                    : null,
                  vm.catalogMeta.counts.series != null
                    ? `${vm.catalogMeta.counts.series} séries`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            ) : null}
            <Button
              variant="secondary"
              disabled={vm.isRefreshingCatalog}
              onClick={() => void vm.refreshCatalog()}
            >
              {vm.isRefreshingCatalog ? 'Atualizando…' : 'Atualizar lista do servidor'}
            </Button>
            {vm.message ? <p className={styles.detailsMeta}>{vm.message}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dados locais</CardTitle>
            <CardDescription>
              Favoritos, histórico e preferências ficam apenas neste navegador.
            </CardDescription>
          </CardHeader>
          <CardContent className={styles.details}>
            <Alert variant="warning">
              <AlertTitle>Limpeza irreversível</AlertTitle>
              <AlertDescription>
                Removerá tudo com prefixo <code>iptv.</code>, incluindo credenciais salvas e o
                cache do catálogo.
              </AlertDescription>
            </Alert>
            <Button variant="destructive" onClick={vm.clearAllLocalData}>
              Limpar dados locais
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Segurança</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={styles.detailsMeta}>
              Esta aplicação não possui backend próprio. Credenciais no localStorage podem ser
              acessadas por scripts na mesma origem. O provedor precisa liberar CORS e, de
              preferência, HTTPS.
            </p>
            <Separator style={{ margin: '1rem 0' }} />
            <p className={styles.detailsMeta}>
              Design system baseado em Radix UI / filosofia shadcn, estilizado com CSS Modules e
              tokens — sem Tailwind.
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={vm.adultConfirmOpen} onOpenChange={vm.setAdultConfirmOpen}>
        <DialogContent>
          <DialogTitle>Liberar conteúdo adulto?</DialogTitle>
          <DialogDescription>
            Confirme que você tem 18 anos ou mais. Mesmo liberado, esse conteúdo não será
            registrado no histórico nem em “continuar assistindo”. Você pode ocultar a qualquer
            momento nas configurações.
          </DialogDescription>
          <DialogFooter>
            <Button variant="ghost" onClick={() => vm.setAdultConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={vm.confirmEnableAdult}>
              Tenho 18+ e confirmo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
