import { useMemo, useState } from 'react'
import { CalendarDays, ChevronDown, ChevronUp, ListMusic, RefreshCw } from 'lucide-react'
import { EmptyState } from '@/shared/components/feedback/EmptyState'
import { ErrorState } from '@/shared/components/feedback/ErrorState'
import { CatalogPager } from '@/shared/components/media/CatalogPager'
import { CategoryChips } from '@/shared/components/media/CategoryChips'
import { ChannelListItem } from '@/shared/components/media/ChannelListItem'
import { SearchBar } from '@/shared/components/media/SearchBar'
import { VideoPlayer } from '@/shared/components/player/VideoPlayer'
import { Button } from '@/shared/components/ui/Button'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { Sheet, SheetBody, SheetContent, SheetHeader } from '@/shared/components/ui/Sheet'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { usePagedList } from '@/shared/hooks/usePagedList'
import { playbackAllowedOrigin } from '@/shared/utils/iptvProxy'
import { useLiveTvViewModel } from './useLiveTvViewModel'
import styles from '@/shared/theme/views.module.css'

export function LiveTvView() {
  const vm = useLiveTvViewModel()
  const isMobile = useIsMobile()
  const pagedChannels = usePagedList(vm.channels, isMobile ? 40 : 80)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [epgOpen, setEpgOpen] = useState(false)

  const categoryName = useMemo(() => {
    if (vm.categoryId === 'all') return 'Todos'
    return vm.categories.find((item) => item.id === vm.categoryId)?.name ?? 'Todos'
  }, [vm.categories, vm.categoryId])

  const openChannels = () => setSheetOpen(true)
  const showEpg = !isMobile || epgOpen

  const channelList = (
    <div className={`${styles.channelList} ${styles.channelListSheet}`}>
      {pagedChannels.visible.map((channel) => (
        <ChannelListItem
          key={channel.id}
          name={channel.name}
          number={channel.number}
          logoUrl={channel.logoUrl}
          active={vm.selectedChannel?.id === channel.id}
          isFavorite={vm.isFavorite(channel.id)}
          onSelect={() => {
            vm.selectChannel(channel.id)
            setSheetOpen(false)
          }}
          onToggleFavorite={() => vm.toggleFavorite(channel)}
        />
      ))}
      <CatalogPager
        shown={pagedChannels.shown}
        total={pagedChannels.total}
        hasMore={pagedChannels.hasMore}
        onLoadMore={pagedChannels.loadMore}
      />
    </div>
  )

  const channelListDesktop = (
    <div className={`${styles.channelList} ${styles.channelListDesktop}`}>
      {pagedChannels.visible.map((channel) => (
        <ChannelListItem
          key={channel.id}
          name={channel.name}
          number={channel.number}
          logoUrl={channel.logoUrl}
          active={vm.selectedChannel?.id === channel.id}
          isFavorite={vm.isFavorite(channel.id)}
          onSelect={() => vm.selectChannel(channel.id)}
          onToggleFavorite={() => vm.toggleFavorite(channel)}
        />
      ))}
      <CatalogPager
        shown={pagedChannels.shown}
        total={pagedChannels.total}
        hasMore={pagedChannels.hasMore}
        onLoadMore={pagedChannels.loadMore}
      />
    </div>
  )

  const epgBody =
    vm.epg.length === 0 ? (
      <p className={styles.detailsMeta}>
        EPG indisponível para este canal ou não suportado pelo servidor.
      </p>
    ) : (
      <div className={styles.epgList}>
        {vm.epg.map((program) => (
          <div key={program.id} className={styles.epgItem}>
            <strong>{program.title}</strong>
            <span>
              {program.start} — {program.end}
            </span>
            {program.description ? <p>{program.description}</p> : null}
          </div>
        ))}
      </div>
    )

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.desktopOnly} style={{ flex: 1, minWidth: 0 }}>
          <SearchBar value={vm.search} onChange={vm.setSearch} placeholder="Buscar canal…" />
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={vm.isRefreshing}
          onClick={() => void vm.refetch()}
          title="Baixar lista atualizada do servidor"
        >
          <RefreshCw size={16} className={vm.isRefreshing ? 'spin' : undefined} />
          {vm.isRefreshing ? 'Atualizando…' : 'Atualizar'}
        </Button>
        <Button variant="secondary" className={styles.mobileOnly} onClick={openChannels}>
          <ListMusic size={16} /> Canais
        </Button>
      </div>

      <button
        type="button"
        className={`${styles.mobileFilterBar} ${styles.mobileOnly}`}
        onClick={openChannels}
        aria-haspopup="dialog"
        aria-expanded={sheetOpen}
      >
        <span className={styles.mobileFilterMeta}>
          <span className={styles.mobileFilterHint}>Categoria</span>
          <strong>{categoryName}</strong>
        </span>
        <span className={styles.mobileFilterCount}>
          {vm.channels.length} {vm.channels.length === 1 ? 'canal' : 'canais'}
        </span>
      </button>

      <div className={styles.withCategories}>
        <div className={styles.desktopOnly}>
          <CategoryChips
            categories={vm.categories}
            selectedId={vm.categoryId}
            onSelect={vm.setCategoryId}
            mode="list"
          />
        </div>

        <div>
          {vm.error ? <ErrorState message={vm.error} onRetry={vm.refetch} /> : null}

          {vm.isLoading ? (
            <div className={styles.liveLayout}>
              <Skeleton style={{ height: 280 }} />
              <Skeleton style={{ aspectRatio: '16 / 9', width: '100%', height: 'auto' }} />
            </div>
          ) : (
            <div className={styles.liveLayout}>
              <aside className={`${styles.panel} ${styles.desktopOnly}`}>
                {vm.channels.length === 0 ? (
                  <EmptyState
                    title="Nenhum canal encontrado"
                    description="Ajuste a busca ou a categoria."
                  />
                ) : (
                  channelListDesktop
                )}
              </aside>

              <div className={styles.details}>
                {vm.selectedChannel && vm.playbackUrl && vm.serverUrl ? (
                  <div className={styles.playerStage}>
                    <VideoPlayer
                      key={vm.selectedChannel.id}
                      url={vm.playbackUrl}
                      allowedOrigin={playbackAllowedOrigin(vm.serverUrl)}
                      title={vm.selectedChannel.name}
                      layout="fill"
                    />
                  </div>
                ) : (
                  <EmptyState
                    title={vm.channels.length === 0 ? 'Nenhum canal na lista' : 'Selecione um canal'}
                    description="Toque em Canais para escolher categoria e o que assistir."
                    action={
                      <Button variant="secondary" className={styles.mobileOnly} onClick={openChannels}>
                        Abrir canais
                      </Button>
                    }
                  />
                )}

                <div className={styles.panel}>
                  <div className={styles.toolbar}>
                    <div>
                      <h2 style={{ fontSize: 'var(--text-lg)' }}>
                        {vm.selectedChannel?.name ?? 'Selecione um canal'}
                      </h2>
                      {!isMobile ? (
                        <p className={styles.detailsMeta}>Guia de programação (EPG)</p>
                      ) : null}
                    </div>
                  </div>

                  {isMobile ? (
                    <Button
                      variant="outline"
                      className={styles.epgToggle}
                      aria-expanded={epgOpen}
                      onClick={() => setEpgOpen((open) => !open)}
                    >
                      <CalendarDays size={16} />
                      {epgOpen ? 'Ocultar programação' : 'Ver programação'}
                      {epgOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </Button>
                  ) : null}

                  {showEpg ? epgBody : null}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className={styles.channelsSheet}>
          <SheetHeader
            title="Canais"
            description={`${categoryName} · ${vm.channels.length} na lista`}
          />
          <SheetBody className={styles.channelsSheetBody}>
            <div className={styles.sheetCategoryBlock}>
              <p className={styles.sheetSectionLabel}>Categoria</p>
              <CategoryChips
                categories={vm.categories}
                selectedId={vm.categoryId}
                onSelect={vm.setCategoryId}
                mode="list"
                closeOnSelect={false}
              />
            </div>

            <div className={styles.sheetSearchBlock}>
              <SearchBar value={vm.search} onChange={vm.setSearch} placeholder="Buscar canal…" />
            </div>

            <div className={styles.sheetChannelBlock}>
              {vm.channels.length === 0 ? (
                <EmptyState title="Nenhum canal encontrado" description="Troque a categoria ou a busca." />
              ) : (
                channelList
              )}
            </div>
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  )
}
