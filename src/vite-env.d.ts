/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string
  readonly VITE_DEFAULT_SERVER_URL?: string
  /** `1` = route Xtream API/streams through same-origin `/iptv-proxy` (Docker/Coolify). */
  readonly VITE_IPTV_PROXY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
