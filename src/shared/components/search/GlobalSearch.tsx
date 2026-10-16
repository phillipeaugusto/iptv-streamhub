import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Clapperboard, MonitorPlay, Search, Tv } from 'lucide-react'
import { Sheet, SheetBody, SheetContent, SheetHeader } from '@/shared/components/ui/Sheet'
import { Input } from '@/shared/components/ui/Input'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { channelRepository } from '@/services/catalog/channel.service'
import { movieRepository } from '@/services/catalog/movie.service'
import { seriesRepository } from '@/services/catalog/series.service'
import {
  CATALOG_GC_TIME,
  CATALOG_STALE_TIME,
  catalogQueryKeys,
} from '@/services/catalog/catalogQueryKeys'
import { useAuthStore } from '@/core/store/authStore'
import { useNavigationIntentStore } from '@/core/store/navigationIntentStore'
import { usePreferencesStore } from '@/core/store/preferencesStore'
import { filterAdultContent, isAdultLabel } from '@/shared/utils/adultContent'
import { ensureSessionOrThrow } from '@/core/auth/session'
import { matchesSearch } from '@/shared/utils/search'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import styles from './GlobalSearch.module.css'

interface GlobalSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function ResultThumb({ src, label }: { src?: string; label: string }) {
  if (src) {
    return <img className={styles.thumb} src={src} alt="" loading="lazy" decoding="async" />
  }
  return (
    <span className={styles.thumbFallback} aria-hidden>
      {label.slice(0, 1).toUpperCase()}
    </span>
  )
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const navigate = useNavigate()
  const setIntent = useNavigationIntentStore((state) => state.setIntent)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const showAdult = usePreferencesStore((state) => state.preferences.showAdultCategories)
  const [query, setQuery] = useState('')
  const debounced = useDebouncedValue(query, 280)

  const channelsQuery = useQuery({
    queryKey: catalogQueryKeys.liveChannels,
    queryFn: ({ signal }) => {
      ensureSessionOrThrow()
      return channelRepository.list(undefined, signal)
    },
    enabled: open && isAuthenticated,
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
  })

  const moviesQuery = useQuery({
    queryKey: catalogQueryKeys.movies,
    queryFn: ({ signal }) => {
      ensureSessionOrThrow()
      return movieRepository.list(undefined, signal)
    },
    enabled: open && isAuthenticated,
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
  })

  const seriesQuery = useQuery({
    queryKey: catalogQueryKeys.series,
    queryFn: ({ signal }) => {
      ensureSessionOrThrow()
      return seriesRepository.list(undefined, signal)
    },
    enabled: open && isAuthenticated,
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME,
  })

  const term = debounced.trim()
  const results = useMemo(() => {
    if (!term) {
      return { channels: [], movies: [], series: [] }
    }
    const channels = filterAdultContent(channelsQuery.data ?? [], showAdult).filter((item) =>
      matchesSearch(item.name, term),
    )
    const movies = filterAdultContent(moviesQuery.data ?? [], showAdult).filter((item) =>
      matchesSearch(item.name, term),
    )
    const series = filterAdultContent(seriesQuery.data ?? [], showAdult).filter((item) =>
      matchesSearch(item.name, term),
    )
    return {
      channels: channels.filter((item) => showAdult || !isAdultLabel(item.name)).slice(0, 10),
      movies: movies.filter((item) => showAdult || !isAdultLabel(item.name)).slice(0, 10),
      series: series.filter((item) => showAdult || !isAdultLabel(item.name)).slice(0, 10),
    }
  }, [term, channelsQuery.data, moviesQuery.data, seriesQuery.data, showAdult])

  const isLoading = channelsQuery.isLoading || moviesQuery.isLoading || seriesQuery.isLoading
  const total = results.channels.length + results.movies.length + results.series.length

  const closeAndGo = (path: string) => {
    setQuery('')
    onOpenChange(false)
    // Navega depois de fechar o sheet para o Radix não engolir o foco/click.
    queueMicrotask(() => {
      navigate(path)
    })
  }

  const openChannel = (channelId: string) => {
    setIntent({ kind: 'live', channelId })
    closeAndGo('/live')
  }

  const openMovie = (movieId: string, extension?: string) => {
    // Filme: abre o player direto (usuário espera “iniciar”).
    const params = new URLSearchParams({ type: 'movie', id: movieId })
    if (extension) params.set('ext', extension)
    closeAndGo(`/player?${params.toString()}`)
  }

  const openSeries = (seriesId: string) => {
    setIntent({ kind: 'series', seriesId })
    closeAndGo('/series')
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className={styles.sheet}>
        <SheetHeader title="Busca" description="Canais, filmes e séries do seu servidor" />
        <SheetBody>
          <div className={styles.searchField}>
            <Search size={16} aria-hidden />
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Digite para buscar…"
              aria-label="Busca global"
            />
          </div>

          {isLoading ? (
            <div className={styles.loading}>
              <Skeleton style={{ height: 64 }} />
              <Skeleton style={{ height: 64 }} />
              <Skeleton style={{ height: 64 }} />
            </div>
          ) : null}

          {!isLoading && term && total === 0 ? (
            <p className={styles.empty}>Nenhum resultado para “{debounced}”.</p>
          ) : null}

          {!term ? (
            <p className={styles.empty}>Comece a digitar para filtrar o catálogo.</p>
          ) : null}

          {results.channels.length > 0 ? (
            <section className={styles.group}>
              <h3>
                <Tv size={14} /> Canais
              </h3>
              {results.channels.map((channel) => (
                <button
                  key={channel.id}
                  type="button"
                  className={styles.item}
                  onClick={() => openChannel(channel.id)}
                >
                  <ResultThumb src={channel.logoUrl} label={channel.name} />
                  <span className={styles.itemText}>
                    <strong>{channel.name}</strong>
                    {channel.number != null ? <span>Canal {channel.number}</span> : null}
                  </span>
                </button>
              ))}
            </section>
          ) : null}

          {results.movies.length > 0 ? (
            <section className={styles.group}>
              <h3>
                <Clapperboard size={14} /> Filmes
              </h3>
              {results.movies.map((movie) => (
                <button
                  key={movie.id}
                  type="button"
                  className={styles.item}
                  onClick={() => openMovie(movie.id, movie.containerExtension)}
                >
                  <ResultThumb src={movie.posterUrl} label={movie.name} />
                  <span className={styles.itemText}>
                    <strong>{movie.name}</strong>
                    {movie.year ? <span>{movie.year}</span> : <span>Filme · Assistir</span>}
                  </span>
                </button>
              ))}
            </section>
          ) : null}

          {results.series.length > 0 ? (
            <section className={styles.group}>
              <h3>
                <MonitorPlay size={14} /> Séries
              </h3>
              {results.series.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={styles.item}
                  onClick={() => openSeries(item.id)}
                >
                  <ResultThumb src={item.posterUrl} label={item.name} />
                  <span className={styles.itemText}>
                    <strong>{item.name}</strong>
                    <span>Série · Abrir</span>
                  </span>
                </button>
              ))}
            </section>
          ) : null}
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}
