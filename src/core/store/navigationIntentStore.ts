import { create } from 'zustand'

/**
 * Intenção de navegação da busca global (e atalhos).
 * Sobrevive a remount do StrictMode — diferente de ?id= na URL, que era
 * limpo no mesmo efeito e perdia a seleção.
 */
export type NavigationIntent =
  | { kind: 'live'; channelId: string }
  | { kind: 'movie'; movieId: string }
  | { kind: 'series'; seriesId: string }

interface NavigationIntentStore {
  intent: NavigationIntent | null
  setIntent: (intent: NavigationIntent) => void
  consume: <K extends NavigationIntent['kind']>(
    kind: K,
  ) => Extract<NavigationIntent, { kind: K }> | null
  clear: () => void
}

export const useNavigationIntentStore = create<NavigationIntentStore>((set, get) => ({
  intent: null,
  setIntent: (intent) => set({ intent }),
  consume: (kind) => {
    const current = get().intent
    if (!current || current.kind !== kind) return null
    set({ intent: null })
    return current as Extract<NavigationIntent, { kind: typeof kind }>
  },
  clear: () => set({ intent: null }),
}))
