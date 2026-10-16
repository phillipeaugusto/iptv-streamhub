# StreamHub IPTV Web

Aplicação IPTV Web em **React + Vite + TypeScript**, com arquitetura **MVVM**, sem backend próprio, sem banco de dados e com persistência exclusiva em `localStorage`.

## Stack

- React 18 + Vite + TypeScript
- React Router
- TanStack Query
- Zustand
- React Hook Form + Zod
- Axios
- HLS.js
- Lucide React
- Radix UI (filosofia shadcn/ui) + CSS Modules / tokens — **sem Tailwind**
- Vitest + React Testing Library

## Design system

Tokens em `src/shared/theme/` e componentes em `src/shared/components/ui/` (Button, Input, Card, Sheet, Tabs, Alert, Skeleton, etc.), inspirados no shadcn/ui com CSS Modules.

- Desktop: sidebar recolhível + header com busca (`⌘K` / `Ctrl+K`)
- Mobile: bottom navigation + sheets/drawers
- Tipografia: Inter
- Tema escuro com destaque violeta `#8B5CF6`

## Instalação e execução

```bash
npm install
npm run dev
npm run build
npm run test
```

Abra o endereço indicado pelo Vite (geralmente `http://localhost:5173`).

## Configuração do servidor

Na tela de login informe:

1. **Servidor** — endereço do painel Xtream/XUI (o campo começa em branco)
2. **Usuário** — credencial do seu acesso autorizado
3. **Senha**
4. Opcionalmente, **Lembrar meus dados** (com aviso explícito de risco)

Variáveis públicas (não secretas) em `.env.example`:

```env
VITE_APP_NAME=StreamHub IPTV
# VITE_DEFAULT_SERVER_URL=
```

Copie para `.env` se desejar. **Não** coloque senhas ou tokens em arquivos de ambiente versionados.

## Protocolo utilizado

A autenticação e o catálogo usam a **API Xtream Codes** documentada para painéis XUI/Xtream:

| Recurso | Endpoint |
| --- | --- |
| Autenticação / conta | `GET /player_api.php?username=USER&password=PASS` |
| Categorias live | `action=get_live_categories` |
| Canais | `action=get_live_streams` |
| Categorias VOD | `action=get_vod_categories` |
| Filmes | `action=get_vod_streams` |
| Detalhe filme | `action=get_vod_info&vod_id=` |
| Categorias séries | `action=get_series_categories` |
| Séries | `action=get_series` |
| Temporadas/episódios | `action=get_series_info&series_id=` |
| EPG curto | `action=get_short_epg&stream_id=` |

URLs de reprodução (padrão Xtream/XUI):

- Live: `/live/{user}/{pass}/{stream_id}.m3u8`
- Filme: `/movie/{user}/{pass}/{stream_id}.{ext}`
- Episódio: `/series/{user}/{pass}/{episode_id}.{ext}`

A aplicação **não inventa** endpoints: só consome os acima. Funcionalidades ausentes no servidor simplesmente não aparecem (ex.: EPG vazio).

## O que o provedor precisa (e o que o Docker resolve)

No host de login o painel precisa expor a **API Xtream** (`player_api.php`) e streams `/live`, `/movie`, `/series`.

**CORS / HTTPS do provedor não são necessários** quando você publica com o `Dockerfile` deste repo:

- O build ativa `VITE_IPTV_PROXY=1`
- O container serve o frontend e um proxy em `/iptv-proxy/...`
- O navegador só fala com o Coolify (HTTPS); o container busca o IPTV (HTTP ou HTTPS)

Em `npm run dev` na sua máquina o proxy fica desligado — por isso local funciona sem CORS.

## Persistência local

Serviço: `StorageService` (`src/services/storage/`), chaves com prefixo `iptv.`, formato versionado.

Armazena:

- Servidor, usuário e senha (senha só com “Lembrar meus dados”)
- Preferências de UI e do player
- Categorias selecionadas
- Favoritos (canais/filmes/séries)
- Histórico e progresso de reprodução
- Última seção acessada

Não armazena conteúdo de vídeo. Trata JSON corrompido e quota excedida.

**Aviso:** `localStorage` não é cofre. Scripts na mesma origem podem ler a senha salva. A opção de lembrar é explícita e exibe esse risco.

## Arquitetura MVVM (feature-based)

```
src/
  app/           # App, rotas e providers
  core/          # store (auth/preferências) e sessão
  features/      # telas: View + ViewModel (+ service quando exclusivo)
  shared/        # UI, layouts, hooks, utils, theme, types
  routes/        # ProtectedRoute
  services/      # IPTV, catálogo, storage, player
  tests/
```

## Segurança (limites do frontend)

- Sem segredos administrativos no código
- Credenciais locais ≠ autenticação segura de servidor
- URLs de stream restritas à origem do servidor autenticado
- Sem logs de senha/token (`safeLog` redige senha/token)
- Sem HTML remoto não sanitizado na UI
- Sem bypass de autenticação do provedor

### Antes de publicar em Git público

1. Confirme que **não** existe `.env` com `VITE_DEFAULT_SERVER_URL` apontando para seu painel real.
2. Não commite a pasta `publicar/` (já está no `.gitignore`) — é build estático, sem segredo, mas desnecessária no repo.
3. Não coloque usuário/senha de IPTV no README, issues ou commits.
4. Lembrete: este app é **client-only**; quem hospeda o frontend ainda depende do provedor IPTV (CORS/HTTPS).

## Testes

```bash
npm run test
```

Cobertura automatizada inclui StorageService, favoritos/preferências, login válido/inválido (mocks), falhas de rede, filtros, proteção de rotas, player e limpeza/corrupção de dados.

## Build

```bash
npm run build
```

Gera os artefatos estáticos em `publicar/` (para FTP/hospedagem). Use `npm run typecheck` e `npm run lint` antes de publicar.

## Docker / Coolify (VPS)

Imagem multi-stage: build Vite → Node (`docker/server.mjs`) na porta **80** (SPA + proxy IPTV).

### Local

```bash
docker compose up --build
# http://localhost:8080
```

Ou só a imagem:

```bash
docker build -t streamhub-iptv .
docker run --rm -p 8080:80 streamhub-iptv
```

### Coolify

1. Novo recurso → **Dockerfile**.
2. Porta do container: **80** (Coolify faz o HTTPS na frente).
3. Healthcheck: `/healthz`.
4. Build Args (opcionais):

| Variável | Padrão | Notas |
| --- | --- | --- |
| `VITE_IPTV_PROXY` | `1` | Mantenha `1` na VPS |
| `VITE_APP_NAME` | StreamHub IPTV | Nome na UI |
| `VITE_DEFAULT_SERVER_URL` | vazio | Usuário digita no login |

**Não** passe usuário/senha IPTV como env — o login é no browser.

A VPS precisa conseguir alcançar o host IPTV (DNS/firewall). O proxy bloqueia destinos em redes privadas (SSRF).

**Banda:** API + vídeo passam pela VPS. Para poucos usuários simultâneos costuma ser ok; se a banda da VPS for curta, o gargalo será ela (não o provedor).
